import { Router } from "express";
import multer from "multer";
import {
  uploadFiles,
  createBulkAnalysis,
  createCustomAnalysis,
  getAnalysisStatus,
  getAnalysisById,
  getUserAnalyses,
} from "../controllers/analysis.controller";
import { validate } from "../../../shared/middleware/validate";
import {
  bulkAnalysisSchema,
  customAnalysisSchema,
  statusQuerySchema,
} from "../validators/analysis.validator";
import { requireAuth, optionalAuth } from "../../auth";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 20, // Max 20 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept .pgn files and text files
    if (file.mimetype === "text/plain" || file.originalname.endsWith(".pgn")) {
      cb(null, true);
    } else {
      cb(new Error("Only PGN files are allowed"));
    }
  },
});

// Upload endpoint (optional auth - supports guest users)
router.post("/upload", optionalAuth, upload.array("files", 20), uploadFiles);

// Bulk analysis endpoint (optional auth - supports guest users)
router.post(
  "/analysis/bulk",
  optionalAuth,
  validate(bulkAnalysisSchema),
  createBulkAnalysis,
);

// Custom analysis endpoint (requires auth - for board-created games)
router.post(
  "/analysis/custom",
  requireAuth,
  validate(customAnalysisSchema),
  createCustomAnalysis,
);

// Status endpoint (optional auth - supports guest users)
router.get(
  "/analysis/status",
  optionalAuth,
  validate(statusQuerySchema, "query"),
  getAnalysisStatus,
);

// User analyses endpoint (protected - requires auth)
router.get("/analysis/user", requireAuth, getUserAnalyses);

// Single analysis endpoint (optional auth - supports guest users, must be last due to :id param)
router.get("/analysis/:id", optionalAuth, getAnalysisById);

export default router;
