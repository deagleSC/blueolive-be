import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../auth/middleware/auth.middleware";
import { dashboardService } from "../services/dashboard.service";
import { ApiResponse } from "../../../shared/types";

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Get user dashboard statistics (lightweight)
 *     description: Returns quick overview statistics including total analyses, status counts, win rate, and recent analyses. Use this endpoint for fast loading of basic dashboard metrics. For comprehensive data including openings and performance breakdown, use /dashboard/summary instead.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     total_analyses:
 *                       type: integer
 *                       example: 45
 *                     completed:
 *                       type: integer
 *                       example: 40
 *                     pending:
 *                       type: integer
 *                       example: 2
 *                     processing:
 *                       type: integer
 *                       example: 1
 *                     failed:
 *                       type: integer
 *                       example: 2
 *                     win_rate:
 *                       type: integer
 *                       example: 65
 *                       description: Win rate percentage (only for completed analyses)
 *                     total_games:
 *                       type: integer
 *                       example: 45
 *                     recent_analyses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           analysis_id:
 *                             type: string
 *                           status:
 *                             type: string
 *                           player_name:
 *                             type: string
 *                           player_color:
 *                             type: string
 *                             enum: [white, black]
 *                           opponent:
 *                             type: string
 *                           result:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized - authentication required
 */
export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required" },
      } as ApiResponse);
      return;
    }

    const stats = await dashboardService.getDashboardStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Get comprehensive dashboard summary
 *     description: Returns complete dashboard data including all stats (same as /dashboard/stats), most played openings, and performance breakdown by color. This endpoint is optimized to fetch all data efficiently in parallel. Use /dashboard/stats for faster loading if you only need basic statistics.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
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
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total_analyses:
 *                           type: integer
 *                           example: 45
 *                         completed:
 *                           type: integer
 *                           example: 40
 *                         pending:
 *                           type: integer
 *                           example: 2
 *                         processing:
 *                           type: integer
 *                           example: 1
 *                         failed:
 *                           type: integer
 *                           example: 2
 *                         win_rate:
 *                           type: integer
 *                           nullable: true
 *                           example: 65
 *                           description: Win rate percentage (only for completed analyses)
 *                         total_games:
 *                           type: integer
 *                           example: 45
 *                         recent_analyses:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               analysis_id:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               player_name:
 *                                 type: string
 *                               player_color:
 *                                 type: string
 *                                 enum: [white, black]
 *                               opponent:
 *                                 type: string
 *                               result:
 *                                 type: string
 *                               created_at:
 *                                 type: string
 *                                 format: date-time
 *                               completed_at:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                     most_played_openings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           opening:
 *                             type: string
 *                           eco:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           wins:
 *                             type: integer
 *                           losses:
 *                             type: integer
 *                           draws:
 *                             type: integer
 *                     performance_by_color:
 *                       type: object
 *                       properties:
 *                         white:
 *                           type: object
 *                           properties:
 *                             wins:
 *                               type: integer
 *                             losses:
 *                               type: integer
 *                             draws:
 *                               type: integer
 *                         black:
 *                           type: object
 *                           properties:
 *                             wins:
 *                               type: integer
 *                             losses:
 *                               type: integer
 *                             draws:
 *                               type: integer
 *       401:
 *         description: Unauthorized - authentication required
 */
export async function getDashboardSummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required" },
      } as ApiResponse);
      return;
    }

    const summary = await dashboardService.getDashboardSummary(req.user.id);

    res.json({
      success: true,
      data: summary,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
}
