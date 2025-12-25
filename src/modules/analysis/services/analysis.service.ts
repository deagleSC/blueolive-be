import { v4 as uuidv4 } from "uuid";
import { Analysis, IAnalysisDocument } from "../models/analysis.model";
import {
  AnalysisStatus,
  BulkAnalysisResponse,
  PlayerColor,
  AnalysisMetadata,
} from "../types";
import { gcsService } from "./gcs.service";
import { pgnParserService } from "./pgn-parser.service";
import { queueService } from "./queue.service";
import { logger } from "../../../shared/utils/logger";

/**
 * Determine player color from metadata
 * Returns null if player name not found in the game
 */
function determinePlayerColor(
  metadata: AnalysisMetadata,
  playerName: string,
): PlayerColor | null {
  const normalizedName = playerName.toLowerCase().trim();
  const white = metadata.white.toLowerCase().trim();
  const black = metadata.black.toLowerCase().trim();

  if (white.includes(normalizedName) || normalizedName.includes(white)) {
    return "white";
  }
  if (black.includes(normalizedName) || normalizedName.includes(black)) {
    return "black";
  }
  return null;
}

/**
 * Process bulk analysis from GCS URLs
 */
export async function processBulkAnalysis(
  urls: string[],
  userId: string,
  playerName: string,
): Promise<BulkAnalysisResponse> {
  const batchId = `batch_${uuidv4()}`;
  const analysisIds: string[] = [];
  const skippedGames: { white: string; black: string; reason: string }[] = [];

  for (const url of urls) {
    try {
      // Download PGN content from GCS
      const pgnContent = await gcsService.downloadFile(url);

      // Split into individual games
      const games = pgnParserService.splitPgn(pgnContent);

      for (const game of games) {
        // Determine player color
        const playerColor = determinePlayerColor(game.metadata, playerName);

        if (!playerColor) {
          logger.warn(
            `Player "${playerName}" not found in game: ${game.metadata.white} vs ${game.metadata.black}`,
          );
          skippedGames.push({
            white: game.metadata.white,
            black: game.metadata.black,
            reason: `Player "${playerName}" not found in this game`,
          });
          continue;
        }

        const analysisId = `ana_${uuidv4()}`;

        // Create analysis document
        await Analysis.create({
          analysis_id: analysisId,
          user_id: userId,
          batch_id: batchId,
          status: AnalysisStatus.PENDING,
          pgn: game.pgn,
          gcs_url: url,
          player_name: playerName,
          player_color: playerColor,
          metadata: game.metadata,
        });

        // Enqueue for processing
        await queueService.enqueue(analysisId);

        analysisIds.push(analysisId);
      }
    } catch (error) {
      logger.error(`Failed to process URL ${url}:`, error);
      throw error;
    }
  }

  return {
    batch_id: batchId,
    analysis_ids: analysisIds,
    total_games: analysisIds.length,
    skipped_games: skippedGames.length > 0 ? skippedGames : undefined,
  };
}

/**
 * Process custom analysis from PGN string
 * Used for analyzing games created on the board
 */
export async function processCustomAnalysis(
  pgn: string,
  userId: string,
  playerColor: PlayerColor,
  playerName: string = "Player",
): Promise<{ analysis_id: string }> {
  // Parse PGN to extract metadata
  const metadata = pgnParserService.parseHeaders(pgn);

  // Validate PGN
  if (!pgnParserService.isValidPgn(pgn)) {
    throw new Error("Invalid PGN format");
  }

  const analysisId = `ana_${uuidv4()}`;

  // Create analysis document
  await Analysis.create({
    analysis_id: analysisId,
    user_id: userId,
    status: AnalysisStatus.PENDING,
    pgn: pgn,
    player_name: playerName,
    player_color: playerColor,
    metadata: metadata,
  });

  // Enqueue for processing
  await queueService.enqueue(analysisId);

  logger.info(
    `Custom analysis created: ${analysisId} for ${playerName} (${playerColor})`,
  );

  return { analysis_id: analysisId };
}

/**
 * Get analysis by ID
 */
export async function getAnalysisById(
  analysisId: string,
  userId: string,
): Promise<IAnalysisDocument | null> {
  return Analysis.findOne({ analysis_id: analysisId, user_id: userId });
}

/**
 * Get status of multiple analyses
 */
export async function getAnalysesStatus(
  analysisIds: string[],
  userId: string,
): Promise<Record<string, { status: AnalysisStatus }>> {
  const analyses = await Analysis.find({
    analysis_id: { $in: analysisIds },
    user_id: userId,
  }).select("analysis_id status");

  const result: Record<string, { status: AnalysisStatus }> = {};
  for (const analysis of analyses) {
    result[analysis.analysis_id] = {
      status: analysis.status as AnalysisStatus,
    };
  }

  return result;
}

/**
 * Get all analyses for a user with filtering and sorting
 */
export async function getUserAnalyses(
  userId: string,
  page = 1,
  limit = 20,
  filters?: {
    status?: AnalysisStatus;
    player_color?: PlayerColor;
    sortBy?: "newest" | "oldest" | "status";
  },
): Promise<{ analyses: IAnalysisDocument[]; total: number }> {
  const skip = (page - 1) * limit;

  // Build query
  const query: any = { user_id: userId };

  // Apply filters
  if (filters?.status) {
    query.status = filters.status;
  }
  if (filters?.player_color) {
    query.player_color = filters.player_color;
  }

  // Build sort object
  let sort: any = { created_at: -1 }; // Default: newest first
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "oldest":
        sort = { created_at: 1 };
        break;
      case "status":
        sort = { status: 1, created_at: -1 }; // Sort by status, then by date
        break;
      case "newest":
      default:
        sort = { created_at: -1 };
        break;
    }
  }

  const [analyses, total] = await Promise.all([
    Analysis.find(query).sort(sort).skip(skip).limit(limit),
    Analysis.countDocuments(query),
  ]);

  return { analyses, total };
}

export const analysisService = {
  processBulkAnalysis,
  processCustomAnalysis,
  getAnalysisById,
  getAnalysesStatus,
  getUserAnalyses,
};
