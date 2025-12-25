import { Analysis } from "../models/analysis.model";
import { AnalysisResult, AnalysisStatus, PlayerColor } from "../types";
import { geminiService } from "./gemini.service";
import { puzzleService } from "./puzzle.service";
import { logger } from "../../../shared/utils/logger";

/**
 * Process a single analysis job
 */
export async function processAnalysis(analysisId: string): Promise<void> {
  logger.info(`Processing analysis: ${analysisId}`);

  const analysis = await Analysis.findOne({ analysis_id: analysisId });

  if (!analysis) {
    logger.error(`Analysis not found: ${analysisId}`);
    return;
  }

  if (analysis.status !== AnalysisStatus.PENDING) {
    logger.info(`Analysis ${analysisId} already processed, skipping`);
    return;
  }

  try {
    // Update status to PROCESSING
    analysis.status = AnalysisStatus.PROCESSING;
    await analysis.save();

    // Run Gemini analysis with player context
    const geminiResponse = await geminiService.analyzeGame(
      analysis.pgn,
      {
        white: analysis.metadata.white,
        black: analysis.metadata.black,
        result: analysis.metadata.result,
        event: analysis.metadata.event || "",
        date: analysis.metadata.date || "",
      },
      analysis.player_name,
      analysis.player_color as PlayerColor,
    );

    // Extract puzzles from Gemini result (they come as full objects)
    const puzzleObjects = geminiResponse.puzzles || [];
    const resultWithoutPuzzles = geminiResponse.result;

    // Log puzzles received from Gemini
    logger.info(
      `Analysis result received. Puzzles count: ${puzzleObjects.length}`,
    );
    if (puzzleObjects.length > 0) {
      logger.info(
        `Puzzles received: ${JSON.stringify(
          puzzleObjects.map((p) => ({ title: p.title, theme: p.theme })),
        )}`,
      );
    }

    // Save puzzles to puzzles collection first (if user is authenticated)
    const userId = analysis.user_id?.toString() || "guest";
    let puzzleIds: string[] = [];

    if (puzzleObjects.length > 0 && userId !== "guest") {
      logger.info(
        `Attempting to save puzzles. User ID: ${userId}, Puzzle count: ${puzzleObjects.length}`,
      );
      try {
        const savedPuzzles = await puzzleService.savePuzzles(
          puzzleObjects,
          userId,
          analysisId,
        );
        puzzleIds = savedPuzzles.map((p) => p.puzzle_id);
        logger.info(
          `Successfully saved ${savedPuzzles.length} puzzles to puzzles collection. Puzzle IDs: ${puzzleIds.join(", ")}`,
        );
      } catch (error) {
        logger.error(
          `Failed to save puzzles for analysis ${analysisId}:`,
          error,
        );
        // Log the full error for debugging
        if (error instanceof Error) {
          logger.error(`Error details: ${error.message}`, error.stack);
        }
        // Don't fail the analysis if puzzle saving fails, but puzzles won't be referenced
      }
    } else if (puzzleObjects.length > 0 && userId === "guest") {
      logger.info(
        `Skipping puzzle save - user is guest (userId: ${userId}). Puzzles will not be saved.`,
      );
    }

    // Update result with puzzle references (IDs) instead of full objects
    const resultWithReferences: AnalysisResult = {
      ...resultWithoutPuzzles,
      puzzles: puzzleIds, // Store only puzzle IDs as references
    };

    // Update with results
    analysis.result = resultWithReferences;
    analysis.status = AnalysisStatus.COMPLETED;
    analysis.completed_at = new Date();
    await analysis.save();

    logger.info(
      `Analysis saved with ${puzzleIds.length} puzzle references: ${puzzleIds.join(", ")}`,
    );

    logger.info(`Analysis completed: ${analysisId}`);
  } catch (error) {
    logger.error(`Analysis failed: ${analysisId}`, error);

    analysis.status = AnalysisStatus.FAILED;
    analysis.error = error instanceof Error ? error.message : "Unknown error";
    await analysis.save();
  }
}

export const workerService = {
  processAnalysis,
};
