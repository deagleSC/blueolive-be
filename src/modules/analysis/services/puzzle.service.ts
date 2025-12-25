import { Puzzle, IPuzzleDocument } from "../models/puzzle.model";
import { ChessPuzzle } from "../types";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../../shared/utils/logger";

/**
 * Save puzzles from an analysis result
 */
export async function savePuzzles(
  puzzles: ChessPuzzle[],
  userId: string,
  analysisId: string,
): Promise<IPuzzleDocument[]> {
  if (!puzzles || puzzles.length === 0) {
    return [];
  }

  const savedPuzzles: IPuzzleDocument[] = [];

  for (const puzzle of puzzles) {
    try {
      // Validate puzzle data
      if (
        !puzzle.title ||
        !puzzle.description ||
        !puzzle.fen ||
        !puzzle.solution ||
        !puzzle.difficulty ||
        !puzzle.theme
      ) {
        logger.warn(
          `Skipping invalid puzzle - missing required fields: ${JSON.stringify(puzzle)}`,
        );
        continue;
      }

      // Validate difficulty
      if (!["easy", "medium", "hard"].includes(puzzle.difficulty)) {
        logger.warn(
          `Skipping puzzle with invalid difficulty: ${puzzle.difficulty}. Setting to 'medium'`,
        );
        puzzle.difficulty = "medium";
      }

      const puzzleDoc = await Puzzle.create({
        puzzle_id: `puz_${uuidv4()}`,
        user_id: userId,
        analysis_id: analysisId,
        title: puzzle.title,
        description: puzzle.description,
        fen: puzzle.fen,
        solution: puzzle.solution,
        hint: puzzle.hint || undefined, // Only include if present
        difficulty: puzzle.difficulty,
        theme: puzzle.theme,
      });

      savedPuzzles.push(puzzleDoc);
      logger.info(
        `Puzzle saved: ${puzzleDoc.puzzle_id} (${puzzleDoc.title}) for analysis ${analysisId}`,
      );
    } catch (error) {
      logger.error(`Failed to save puzzle for analysis ${analysisId}:`, error);
      if (error instanceof Error) {
        logger.error(`Error details: ${error.message}`, error.stack);
      }
      // Continue saving other puzzles even if one fails
    }
  }

  return savedPuzzles;
}

/**
 * Get all puzzles for a user
 */
export async function getUserPuzzles(
  userId: string,
): Promise<IPuzzleDocument[]> {
  return Puzzle.find({ user_id: userId }).sort({ created_at: -1 }).exec();
}

export const puzzleService = {
  savePuzzles,
  getUserPuzzles,
};
