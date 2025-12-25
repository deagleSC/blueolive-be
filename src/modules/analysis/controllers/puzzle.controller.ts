import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../auth/middleware/auth.middleware";
import { puzzleService } from "../services/puzzle.service";
import { ApiResponse } from "../../../shared/types";

/**
 * @swagger
 * /api/v1/puzzles:
 *   get:
 *     summary: Get all puzzles for the authenticated user
 *     description: Returns all chess puzzles generated from the user's game analyses
 *     tags: [Puzzles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Puzzles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       puzzle_id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       fen:
 *                         type: string
 *                       solution:
 *                         type: string
 *                       hint:
 *                         type: string
 *                       difficulty:
 *                         type: string
 *                         enum: [easy, medium, hard]
 *                       theme:
 *                         type: string
 *                       analysis_id:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - authentication required
 */
export async function getUserPuzzles(
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

    const puzzles = await puzzleService.getUserPuzzles(req.user.id);

    res.json({
      success: true,
      data: puzzles.map((puzzle) => ({
        puzzle_id: puzzle.puzzle_id,
        title: puzzle.title,
        description: puzzle.description,
        fen: puzzle.fen,
        solution: puzzle.solution,
        hint: puzzle.hint,
        difficulty: puzzle.difficulty,
        theme: puzzle.theme,
        analysis_id: puzzle.analysis_id,
        created_at: puzzle.created_at,
        updated_at: puzzle.updated_at,
      })),
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
}
