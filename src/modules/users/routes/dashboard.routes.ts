import { Router } from "express";
import {
  getDashboardStats,
  getDashboardSummary,
} from "../controllers/dashboard.controller";
import { requireAuth } from "../../auth/middleware/auth.middleware";

const router = Router();

// All dashboard routes require authentication
router.get("/stats", requireAuth, getDashboardStats);
router.get("/summary", requireAuth, getDashboardSummary);

export default router;
