import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { ApiResponse } from "../../../shared/types";
import { AuthResponse } from "../types";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { gcsService } from "../../analysis/services/gcs.service";
import { logger } from "../../../shared/utils/logger";

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Password123"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         name:
 *                           type: string
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       400:
 *         description: Validation error or user exists
 */
export async function signup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.signup(req.body);

    res.status(201).json({
      success: true,
      data: result,
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      res.status(400).json({
        success: false,
        error: { message: error.message },
      });
      return;
    }
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(req.body);

    res.json({
      success: true,
      data: result,
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      res.status(401).json({
        success: false,
        error: { message: error.message },
      });
      return;
    }
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Authenticate with Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Google ID token from client-side sign-in
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       401:
 *         description: Invalid Google token
 */
export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { credential } = req.body;
    const result = await authService.googleAuth(credential);

    res.json({
      success: true,
      data: result,
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      res.status(401).json({
        success: false,
        error: { message: error.message },
      });
      return;
    }
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: { message: "Refresh token is required" },
      } as ApiResponse);
      return;
    }

    const result = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      data: result,
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    // Pass error to error handler middleware for consistent error handling
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Not authenticated
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
      return;
    }

    const user = await authService.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
      return;
    }

    // Generate signed URL for profile picture if it's a GCS URL
    let pictureUrl = user.picture;
    if (user.picture && user.picture.startsWith("gs://")) {
      try {
        pictureUrl = await gcsService.getSignedUrl(user.picture);
      } catch (error) {
        // If signed URL generation fails, return the GCS URL
        // Frontend will handle it
        logger.warn(
          `Failed to generate signed URL for ${user.picture}:`,
          error,
        );
      }
    }

    res.json({
      success: true,
      data: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        picture: pictureUrl,
        provider: user.provider,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update user profile information (name and/or picture). Email and password cannot be updated through this endpoint.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: "John Doe"
 *               picture:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     picture:
 *                       type: string
 *                     provider:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
      return;
    }

    const user = await authService.updateProfile(req.user.id, req.body);

    // Generate signed URL for profile picture if it's a GCS URL
    let pictureUrl = user.picture;
    if (user.picture && user.picture.startsWith("gs://")) {
      try {
        pictureUrl = await gcsService.getSignedUrl(user.picture);
      } catch (error) {
        // If signed URL generation fails, return the GCS URL
        // Frontend will handle it
        logger.warn(
          `Failed to generate signed URL for ${user.picture}:`,
          error,
        );
      }
    }

    res.json({
      success: true,
      data: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        picture: pictureUrl,
        provider: user.provider,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: { message: error.message },
      });
      return;
    }
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/auth/profile-picture:
 *   post:
 *     summary: Upload profile picture
 *     description: Upload a profile picture image file to Google Cloud Storage. Returns the GCS URL to be used in the profile update endpoint.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB, supported formats: jpg, jpeg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: "gs://bucket-name/profile-pictures/user123/abc.jpg"
 *       400:
 *         description: Bad request - no file provided or invalid file type
 *       401:
 *         description: Not authenticated
 */
export async function uploadProfilePicture(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Not authenticated" },
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: { message: "No file provided" },
      });
      return;
    }

    const gcsUrl = await gcsService.uploadProfilePicture(
      file.buffer,
      file.originalname,
      file.mimetype,
      req.user.id,
    );

    res.json({
      success: true,
      data: { url: gcsUrl },
    });
  } catch (error) {
    next(error);
  }
}
