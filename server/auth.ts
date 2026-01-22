import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { ADMIN_EMAIL, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { sendPasswordResetEmail } from "./email";
import { loginLimiter, signupLimiter, resetLoginAttempts } from "./rate-limiter";
import { monitoring } from "./monitoring";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string | null;
    }
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const isProduction = process.env.NODE_ENV === "production";
  const isReplitEnv = !!process.env.REPLIT_DEV_DOMAIN || !!process.env.REPL_ID;
  
  const cookieConfig: session.CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    maxAge: sessionTtl,
    partitioned: true,
  };
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          if (!user.passwordHash) {
            return done(null, false, { message: "Please sign in with Google" });
          }
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, { id: user.id, email: user.email });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // For deployed apps, use APP_URL environment variable or auto-detect
    let baseUrl: string;
    if (process.env.APP_URL) {
      // User-configured production URL (recommended for deployed apps)
      baseUrl = process.env.APP_URL;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      // Development environment
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Fallback for production (may not always match actual URL)
      baseUrl = `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER.toLowerCase()}.replit.app`;
    } else {
      baseUrl = "http://localhost:5000";
    }
    
    console.log("Google OAuth callback URL:", `${baseUrl}/api/auth/google/callback`);
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${baseUrl}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(null, false, { message: "No email provided by Google" });
            }

            let oauthAccount = await storage.getOAuthAccount("google", profile.id);
            
            if (oauthAccount) {
              const user = await storage.getUser(oauthAccount.userId);
              if (user) {
                return done(null, { id: user.id, email: user.email });
              }
            }

            let user = await storage.getUserByEmail(email);
            
            if (user) {
              await storage.linkOAuthAccount(user.id, {
                provider: "google",
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              });
            } else {
              const isAdmin = email === ADMIN_EMAIL;
              user = await storage.createUser({
                email,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                profileImageUrl: profile.photos?.[0]?.value,
                emailVerified: true,
                isAdmin,
              });
              await storage.createOAuthAccount({
                userId: user.id,
                provider: "google",
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              });
            }
            
            return done(null, { id: user.id, email: user.email });
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, { id: user.id, email: user.email });
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  app.post("/api/auth/register", signupLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const isAdmin = email === ADMIN_EMAIL;
      
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        emailVerified: false,
        isAdmin,
      });
      
      // Create email verification token
      try {
        const verification = await storage.createEmailVerificationToken(user.id);
        monitoring.logInfo("User registered, verification email pending", { userId: user.id, email });
        // TODO: Send verification email using sendEmailVerificationEmail when implemented
      } catch (e) {
        console.error("Error creating verification token:", e);
      }

      req.login({ id: user.id, email: user.email }, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        // Record first login timestamp
        try {
          await storage.recordUserLogin(user.id);
        } catch (e) {
          console.error("Error recording login:", e);
        }
        res.json({ message: "Registration successful", user: { id: user.id, email: user.email } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", loginLimiter, (req, res, next) => {
    const email = req.body.email;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    
    passport.authenticate("local", async (err: any, user: Express.User | false, info: { message: string }) => {
      if (err) {
        await storage.recordLoginAttempt({ 
          email, ipAddress, userAgent, success: false, failureReason: "server_error" 
        });
        monitoring.logError("Login server error", { email, error: err.message });
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        await storage.recordLoginAttempt({ 
          email, ipAddress, userAgent, success: false, failureReason: info?.message || "invalid_credentials" 
        });
        monitoring.logWarn("Failed login attempt", { email, reason: info?.message });
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          await storage.recordLoginAttempt({ 
            email, ipAddress, userAgent, success: false, failureReason: "login_error" 
          });
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Record successful login attempt
        await storage.recordLoginAttempt({ email, ipAddress, userAgent, success: true });
        resetLoginAttempts(email);
        
        // Record login timestamp
        try {
          await storage.recordUserLogin((user as any).id);
        } catch (e) {
          console.error("Error recording login:", e);
        }
        
        monitoring.logInfo("Successful login", { userId: (user as any).id, email });
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
          }
          res.json({ message: "Login successful", user });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      console.log("[Password Reset] Request received for email:", req.body.email);
      const validatedData = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (!user) {
        console.log("[Password Reset] No user found with email:", validatedData.email);
        return res.json({ message: "If an account exists with that email, you will receive a password reset link." });
      }

      console.log("[Password Reset] User found, creating reset token");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      let baseUrl: string;
      if (process.env.APP_URL) {
        baseUrl = process.env.APP_URL;
      } else if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else {
        baseUrl = "http://localhost:5000";
      }
      
      const resetLink = `${baseUrl}/reset-password?token=${token}`;
      console.log("[Password Reset] Sending email to:", validatedData.email);
      const emailSent = await sendPasswordResetEmail(validatedData.email, resetLink);
      console.log("[Password Reset] Email send result:", emailSent);
      
      res.json({ message: "If an account exists with that email, you will receive a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      const resetToken = await storage.getPasswordResetToken(validatedData.token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      const passwordHash = await bcrypt.hash(validatedData.password, 10);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      await storage.markTokenAsUsed(validatedData.token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login" }),
      async (req, res) => {
        // Record login timestamp for Google OAuth users
        if (req.user && (req.user as any).id) {
          try {
            await storage.recordUserLogin((req.user as any).id);
          } catch (e) {
            console.error("Error recording Google login:", e);
          }
        }
        res.redirect("/dashboard");
      }
    );
  }

  // Extension authentication endpoints
  app.post("/api/auth/extension/generate-token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const deviceLabel = req.body.deviceLabel || "Chrome Extension";
      
      // Generate a secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      
      // Hash the token before storing (store hash, return raw to user)
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      // Token expires in 30 days
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Delete any existing tokens for this user (one token per user for simplicity)
      await storage.deleteExtensionTokensForUser(userId);
      
      // Create new token with hashed value
      await storage.createExtensionToken({
        userId,
        token: tokenHash,
        deviceLabel,
        expiresAt,
      });
      
      // Return the raw token to the user (only time it's visible)
      res.json({ token: rawToken, expiresAt });
    } catch (error) {
      console.error("Error generating extension token:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  app.post("/api/auth/extension/validate", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided" });
      }
      
      const rawToken = authHeader.substring(7);
      // Hash the incoming token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const extensionToken = await storage.getExtensionToken(tokenHash);
      
      if (!extensionToken) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      if (new Date() > extensionToken.expiresAt) {
        return res.status(401).json({ message: "Token expired" });
      }
      
      // Update last used timestamp
      await storage.updateExtensionTokenLastUsed(tokenHash);
      
      const user = await storage.getUser(extensionToken.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Error validating extension token:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });

  app.post("/api/auth/extension/revoke", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteExtensionTokensForUser(req.user.id);
      res.json({ message: "Extension token revoked" });
    } catch (error) {
      console.error("Error revoking extension token:", error);
      res.status(500).json({ message: "Failed to revoke token" });
    }
  });

  app.get("/api/auth/extension/status", isAuthenticated, async (req: any, res) => {
    try {
      const token = await storage.getExtensionTokenByUserId(req.user.id);
      if (!token) {
        return res.json({ connected: false });
      }
      
      const isExpired = new Date() > token.expiresAt;
      res.json({
        connected: !isExpired,
        deviceLabel: token.deviceLabel,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
      });
    } catch (error) {
      console.error("Error checking extension status:", error);
      res.status(500).json({ message: "Failed to check status" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
