import { Router } from "express";
import { getUserPuzzles } from "../controllers/puzzle.controller";
import { requireAuth } from "../../auth/middleware/auth.middleware";

const router = Router();

// All puzzle routes require authentication
router.get("/", requireAuth, getUserPuzzles);

export default router;
