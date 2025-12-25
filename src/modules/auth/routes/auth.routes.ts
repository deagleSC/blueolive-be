import { Router } from "express";
import multer from "multer";
import {
  signup,
  login,
  googleAuth,
  refresh,
  getMe,
  updateProfile,
  uploadProfilePicture,
} from "../controllers/auth.controller";
import { validate } from "../../../shared/middleware/validate";
import {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from "../validators/auth.validator";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Configure multer for profile picture uploads (memory storage)
const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed"));
    }
  },
});

// Public routes
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/refresh", validate(refreshTokenSchema), refresh);

// Protected routes
router.get("/me", requireAuth, getMe);
router.put(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  updateProfile,
);
router.post(
  "/profile-picture",
  requireAuth,
  profilePictureUpload.single("file"),
  uploadProfilePicture,
);

export default router;
