import { AnalysisMetadata } from "../types";

interface ParsedGame {
  pgn: string;
  metadata: AnalysisMetadata;
}

/**
 * Parse PGN headers to extract metadata
 */
export function parseHeaders(pgn: string): AnalysisMetadata {
  const getHeader = (name: string): string | undefined => {
    const regex = new RegExp(`\\[${name}\\s+"([^"]*)"\\]`, "i");
    const match = pgn.match(regex);
    return match ? match[1] : undefined;
  };

  return {
    white: getHeader("White") || "Unknown",
    black: getHeader("Black") || "Unknown",
    result: getHeader("Result") || "*",
    event: getHeader("Event"),
    date: getHeader("Date"),
    eco: getHeader("ECO"),
    opening: getHeader("Opening"),
  };
}

/**
 * Split a multi-game PGN file into individual games
 */
export function splitPgn(pgnContent: string): ParsedGame[] {
  const games: ParsedGame[] = [];

  // Split by double newline followed by [ (start of new game headers)
  // This handles both \n\n[ and \r\n\r\n[ patterns
  const gameStrings = pgnContent
    .trim()
    .split(/\n\s*\n(?=\[)/)
    .filter((g) => g.trim().length > 0);

  for (const gameStr of gameStrings) {
    const trimmed = gameStr.trim();
    if (trimmed.length === 0) continue;

    games.push({
      pgn: trimmed,
      metadata: parseHeaders(trimmed),
    });
  }

  return games;
}

/**
 * Validate that a string is valid PGN format
 */
export function isValidPgn(pgn: string): boolean {
  // Must have at least one header
  const hasHeader = /\[\w+\s+"[^"]*"\]/.test(pgn);
  // Must have some moves (1. or 1...)
  const hasMoves = /1\./.test(pgn);

  return hasHeader && hasMoves;
}

export const pgnParserService = {
  splitPgn,
  isValidPgn,
  parseHeaders,
};
