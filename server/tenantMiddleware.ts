import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantRole?: string;
    }
  }
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user as { id: string } | undefined;
    if (!user) {
      return next();
    }

    const tenantIdFromHeader = req.headers["x-tenant-id"] as string | undefined;
    const tenantSlugFromHeader = req.headers["x-tenant-slug"] as string | undefined;

    let tenantId: string | undefined;

    if (tenantIdFromHeader) {
      tenantId = tenantIdFromHeader;
    } else if (tenantSlugFromHeader) {
      const tenant = await storage.getTenantBySlug(tenantSlugFromHeader);
      if (tenant) {
        tenantId = tenant.id;
      }
    } else {
      const userTenants = await storage.getUserTenants(user.id);
      if (userTenants.length > 0) {
        tenantId = userTenants[0].id;
      }
    }

    if (tenantId) {
      const role = await storage.getUserTenantRole(tenantId, user.id);
      if (role) {
        req.tenantId = tenantId;
        req.tenantRole = role;
      }
    }

    next();
  } catch (error) {
    console.error("[Tenant Middleware] Error:", error);
    next();
  }
}

export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.tenantId) {
    return res.status(403).json({ error: "No tenant context. Please create or join an organization." });
  }
  next();
}

export function requireTenantRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantId) {
      return res.status(403).json({ error: "No tenant context" });
    }
    if (!req.tenantRole || !allowedRoles.includes(req.tenantRole)) {
      return res.status(403).json({ error: "Insufficient permissions for this action" });
    }
    next();
  };
}
