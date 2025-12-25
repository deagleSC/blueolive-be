import { Request, Response, NextFunction } from "express";
import { jwtService } from "../services/jwt.service";
import { authService } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Middleware to require authentication
 * Validates JWT access token from Authorization header
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: { message: "No token provided" },
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: { message: "No token provided" },
      });
      return;
    }

    const payload = jwtService.verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Invalid or expired token";

    res.status(401).json({
      success: false,
      error: { message: errorMessage },
    });
  }
}

/**
 * Middleware for optional authentication
 * Sets req.user if valid token present, otherwise continues
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = jwtService.verifyAccessToken(token);

      req.user = {
        id: payload.userId,
        email: payload.email,
      };
    }
  } catch {
    // Token invalid, continue without user
  }

  next();
}
