import { Request, Response, NextFunction } from "express";
import { analysisService } from "../services/analysis.service";
import { gcsService } from "../services/gcs.service";
import { ApiResponse } from "../../../shared/types";
import {
  BulkAnalysisResponse,
  UploadResponse,
  AnalysisStatusResponse,
  AnalysisStatus,
  PlayerColor,
} from "../types";
import { AuthenticatedRequest } from "../../auth";

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload PGN files to Google Cloud Storage
 *     description: Accepts PGN file uploads, stores them in GCS, and returns URLs for use with the bulk analysis endpoint. Authentication is optional - guest users are supported.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: PGN files to upload (max 20 files, 10MB each)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
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
 *                     urls:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "gs://chessvine-uploads/uploads/user123/abc-game1.pgn"
 *                         - "gs://chessvine-uploads/uploads/user123/def-game2.pgn"
 *       400:
 *         description: Bad request - no files provided or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "No files provided"
 */
export async function uploadFiles(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = req.user?.id || "guest";

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: "No files provided" },
      } as ApiResponse);
      return;
    }

    const urls = await gcsService.uploadFiles(files, userId);

    res.json({
      success: true,
      data: { urls },
    } as ApiResponse<UploadResponse>);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analysis/bulk:
 *   post:
 *     summary: Submit GCS URLs for bulk PGN analysis
 *     description: Accepts GCS URLs from the upload endpoint, parses PGN files, splits multi-game files, and enqueues each game for AI analysis. Requires playerName to identify which player's perspective to analyze from. Authentication is optional - guest users are supported.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *               - playerName
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of GCS URLs from /upload endpoint (max 50)
 *                 example:
 *                   - "gs://chessvine-uploads/uploads/user123/abc-game1.pgn"
 *               playerName:
 *                 type: string
 *                 description: Your name as it appears in the PGN files
 *                 example: "Magnus Carlsen"
 *     responses:
 *       202:
 *         description: Analysis jobs created and queued
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
 *                     batch_id:
 *                       type: string
 *                       example: "batch_550e8400-e29b-41d4-a716-446655440000"
 *                     analysis_ids:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "ana_550e8400-e29b-41d4-a716-446655440001"
 *                     total_games:
 *                       type: integer
 *                       example: 3
 *                     skipped_games:
 *                       type: array
 *                       description: Games where playerName was not found
 *                       items:
 *                         type: object
 *                         properties:
 *                           white:
 *                             type: string
 *                           black:
 *                             type: string
 *                           reason:
 *                             type: string
 *       400:
 *         description: Bad request - invalid URLs or validation error
 */
export async function createBulkAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { urls, playerName } = req.body;
    const userId = req.user?.id || "guest";

    const result = await analysisService.processBulkAnalysis(
      urls,
      userId,
      playerName,
    );

    res.status(202).json({
      success: true,
      data: result,
    } as ApiResponse<BulkAnalysisResponse>);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analysis/custom:
 *   post:
 *     summary: Submit a custom game for analysis
 *     description: Analyzes a game from PGN string with specified player color. Used for analyzing games created on the board. Requires authentication.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pgn
 *               - playerColor
 *             properties:
 *               pgn:
 *                 type: string
 *                 description: PGN string of the game to analyze
 *                 example: '[Event "Casual Game"]\n[White "Player"]\n[Black "Opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6'
 *               playerColor:
 *                 type: string
 *                 enum: [white, black]
 *                 description: Which side to analyze from
 *                 example: "white"
 *               playerName:
 *                 type: string
 *                 description: Optional player name (defaults to "Player")
 *                 example: "Player"
 *     responses:
 *       202:
 *         description: Analysis job created and queued
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
 *                     analysis_id:
 *                       type: string
 *                       example: "ana_550e8400-e29b-41d4-a716-446655440001"
 *       400:
 *         description: Bad request - invalid PGN or validation error
 *       401:
 *         description: Unauthorized - authentication required
 */
export async function createCustomAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required" },
      });
      return;
    }

    const { pgn, playerColor, playerName } = req.body;
    const userId = req.user.id;

    const result = await analysisService.processCustomAnalysis(
      pgn,
      userId,
      playerColor,
      playerName || "Player",
    );

    res.status(202).json({
      success: true,
      data: result,
    } as ApiResponse<{ analysis_id: string }>);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analysis/status:
 *   get:
 *     summary: Get status of multiple analyses
 *     description: Returns the current status of multiple analyses by their IDs. Useful for polling job completion. Authentication is optional - guest users can check status of their own analyses.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated analysis IDs
 *         example: "ana_550e8400-e29b-41d4-a716-446655440001,ana_550e8400-e29b-41d4-a716-446655440002"
 *     responses:
 *       200:
 *         description: Analysis statuses returned successfully
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
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                   example:
 *                     ana_550e8400-e29b-41d4-a716-446655440001:
 *                       status: "COMPLETED"
 *                     ana_550e8400-e29b-41d4-a716-446655440002:
 *                       status: "PROCESSING"
 *                     ana_550e8400-e29b-41d4-a716-446655440003:
 *                       status: "PENDING"
 *       400:
 *         description: Bad request - missing or invalid IDs
 */
export async function getAnalysisStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = (req.query.ids as string).split(",");
    const userId = req.user?.id || "guest";

    const statuses = await analysisService.getAnalysesStatus(ids, userId);

    res.json({
      success: true,
      data: statuses,
    } as ApiResponse<AnalysisStatusResponse>);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analysis/{id}:
 *   get:
 *     summary: Get single analysis result
 *     description: Returns the full analysis document including AI-generated insights when completed. Authentication is optional - guest users can access their own analyses.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *         example: "ana_550e8400-e29b-41d4-a716-446655440001"
 *     responses:
 *       200:
 *         description: Analysis result returned successfully
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
 *                     analysis_id:
 *                       type: string
 *                       example: "ana_550e8400-e29b-41d4-a716-446655440001"
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                       example: "COMPLETED"
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         white:
 *                           type: string
 *                           example: "Magnus Carlsen"
 *                         black:
 *                           type: string
 *                           example: "Hikaru Nakamura"
 *                         result:
 *                           type: string
 *                           example: "1-0"
 *                         event:
 *                           type: string
 *                           example: "World Chess Championship 2024"
 *                         date:
 *                           type: string
 *                           example: "2024.12.15"
 *                     result:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: string
 *                           example: "A sharp Sicilian Defense where White gained the initiative through aggressive kingside play..."
 *                         phases:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               moves:
 *                                 type: string
 *                               evaluation:
 *                                 type: string
 *                               key_ideas:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         key_moments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               move_number:
 *                                 type: integer
 *                               move:
 *                                 type: string
 *                               fen:
 *                                 type: string
 *                               evaluation:
 *                                 type: string
 *                               comment:
 *                                 type: string
 *                               is_mistake:
 *                                 type: boolean
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     completed_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Analysis not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Analysis not found"
 */
export async function getAnalysisById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "guest";

    const analysis = await analysisService.getAnalysisById(id, userId);

    if (!analysis) {
      res.status(404).json({
        success: false,
        error: { message: "Analysis not found" },
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: analysis,
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /api/v1/analysis/user:
 *   get:
 *     summary: List user's analyses
 *     description: Returns a paginated list of all analyses belonging to the authenticated user
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by analysis status
 *       - in: query
 *         name: player_color
 *         schema:
 *           type: string
 *           enum: [white, black]
 *         description: Filter by player color
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, status]
 *           default: newest
 *         description: Sort order (newest, oldest, or by status)
 *     responses:
 *       200:
 *         description: List of analyses returned successfully
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
 *                       analysis_id:
 *                         type: string
 *                         example: "ana_550e8400-e29b-41d4-a716-446655440001"
 *                       status:
 *                         type: string
 *                         enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *                       metadata:
 *                         type: object
 *                         properties:
 *                           white:
 *                             type: string
 *                           black:
 *                             type: string
 *                           result:
 *                             type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 45
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
export async function getUserAnalyses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required" },
      });
      return;
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Extract filter parameters
    const status = req.query.status as string | undefined;
    const player_color = req.query.player_color as string | undefined;
    const sortBy = (req.query.sortBy as string) || "newest";

    // Validate status if provided
    const validStatuses = ["pending", "processing", "completed", "failed"];
    const validColors = ["white", "black"];
    const validSortOptions = ["newest", "oldest", "status"];

    if (status && !validStatuses.includes(status.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
      });
      return;
    }

    if (player_color && !validColors.includes(player_color.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid player_color. Must be one of: ${validColors.join(", ")}`,
        },
      });
      return;
    }

    if (!validSortOptions.includes(sortBy.toLowerCase())) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid sortBy. Must be one of: ${validSortOptions.join(", ")}`,
        },
      });
      return;
    }

    const { analyses, total } = await analysisService.getUserAnalyses(
      userId,
      page,
      limit,
      {
        status: status ? (status.toLowerCase() as AnalysisStatus) : undefined,
        player_color: player_color
          ? (player_color.toLowerCase() as PlayerColor)
          : undefined,
        sortBy: sortBy.toLowerCase() as "newest" | "oldest" | "status",
      },
    );

    res.json({
      success: true,
      data: analyses,
      meta: { page, limit, total },
    } as ApiResponse);
  } catch (error) {
    next(error);
  }
}
