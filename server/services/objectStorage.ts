import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";

const SIGNED_URL_EXPIRATION_SEC = 3600; // 1 hour

function getS3Client(): S3Client {
  const endpoint = process.env.DO_SPACES_ENDPOINT;
  const region = process.env.DO_SPACES_REGION;
  const accessKeyId = process.env.DO_SPACES_KEY;
  const secretAccessKey = process.env.DO_SPACES_SECRET;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing DigitalOcean Spaces configuration. Set DO_SPACES_ENDPOINT, " +
        "DO_SPACES_REGION, DO_SPACES_KEY, and DO_SPACES_SECRET env vars."
    );
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
}

function getBucket(): string {
  const bucket = process.env.DO_SPACES_BUCKET;
  if (!bucket) {
    throw new Error(
      "Missing DO_SPACES_BUCKET env var. Set it to your DigitalOcean Spaces bucket name."
    );
  }
  return bucket;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectAccessGroupType {}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

export class ObjectStorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = getS3Client();
    this.bucket = getBucket();
  }

  /**
   * Gets a signed upload URL for a new object entity.
   * Returns a presigned PUT URL the client can upload to directly.
   */
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const key = `uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: SIGNED_URL_EXPIRATION_SEC,
    });
  }

  /**
   * Normalizes a raw presigned URL or path into the canonical `/objects/<id>` format.
   * Accepts both full presigned URLs (from DO Spaces) and already-normalized paths.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Already normalized
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    try {
      const url = new URL(rawPath);
      // DO Spaces URLs have path like /<bucket>/uploads/<uuid> or /uploads/<uuid>
      let pathname = url.pathname;

      // Strip leading bucket name if present in path (path-style URLs)
      if (pathname.startsWith(`/${this.bucket}/`)) {
        pathname = pathname.slice(`/${this.bucket}/`.length);
      } else if (pathname.startsWith("/")) {
        pathname = pathname.slice(1);
      }

      // pathname is now "uploads/<uuid>" or similar
      return `/objects/${pathname}`;
    } catch {
      // Not a URL — treat as a raw key
      return `/objects/${rawPath}`;
    }
  }

  /**
   * Checks if an object exists at the given key.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Gets a signed download URL for an object entity path.
   * The objectPath should be in `/objects/<key>` format.
   */
  async getObjectEntityDownloadURL(objectPath: string): Promise<string> {
    const key = this.objectPathToKey(objectPath);

    const exists = await this.objectExists(key);
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: SIGNED_URL_EXPIRATION_SEC,
    });
  }

  /**
   * Downloads an object and streams it to the Express response.
   * Equivalent to the old downloadObject(file, res, cacheTtlSec).
   */
  async downloadObject(
    objectPath: string,
    res: Response,
    cacheTtlSec: number = 3600
  ): Promise<void> {
    const key = this.objectPathToKey(objectPath);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new ObjectNotFoundError();
      }

      // Determine ACL visibility from metadata
      const aclPolicy = this.parseAclFromMetadata(response.Metadata);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": response.ContentType || "application/octet-stream",
        ...(response.ContentLength != null && {
          "Content-Length": String(response.ContentLength),
        }),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // response.Body is a Readable stream in Node.js
      const stream = response.Body as NodeJS.ReadableStream;
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Sets the ACL policy as custom metadata on the object.
   */
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    const key = this.objectPathToKey(normalizedPath);

    const exists = await this.objectExists(key);
    if (!exists) {
      return normalizedPath;
    }

    // S3 doesn't allow updating metadata in-place — copy object onto itself with new metadata
    const { CopyObjectCommand } = await import("@aws-sdk/client-s3");
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${key}`,
      Key: key,
      Metadata: {
        aclpolicy: JSON.stringify(aclPolicy),
      },
      MetadataDirective: "REPLACE",
    });
    await this.client.send(command);

    return normalizedPath;
  }

  /**
   * Checks if a user can access the object entity based on its ACL metadata.
   */
  async canAccessObjectEntity({
    userId,
    objectPath,
    requestedPermission,
  }: {
    userId?: string;
    objectPath: string;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    const key = this.objectPathToKey(objectPath);
    const permission = requestedPermission ?? ObjectPermission.READ;

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      const aclPolicy = this.parseAclFromMetadata(response.Metadata);

      if (!aclPolicy) {
        return false;
      }

      // Public objects are always readable
      if (aclPolicy.visibility === "public" && permission === ObjectPermission.READ) {
        return true;
      }

      if (!userId) {
        return false;
      }

      // Owner always has access
      if (aclPolicy.owner === userId) {
        return true;
      }

      // ACL rules (no custom group types implemented yet, same as old code)
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Converts an `/objects/<key>` path to the raw S3 key.
   */
  private objectPathToKey(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    return objectPath.slice("/objects/".length);
  }

  /**
   * Parses ACL policy from S3 object metadata.
   */
  private parseAclFromMetadata(
    metadata?: Record<string, string>
  ): ObjectAclPolicy | null {
    if (!metadata) return null;
    const raw = metadata["aclpolicy"] || metadata["custom:aclPolicy"];
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
