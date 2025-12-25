import { z } from "zod";

export const bulkAnalysisSchema = z.object({
  urls: z
    .array(
      z
        .string()
        .regex(/^gs:\/\//, "Each URL must be a valid GCS URL (gs://...)"),
    )
    .min(1, "At least one URL is required")
    .max(50, "Maximum 50 URLs allowed per request"),
  playerName: z
    .string()
    .min(1, "Player name is required")
    .describe("Your name as it appears in the PGN files"),
});

export const statusQuerySchema = z.object({
  ids: z.string().min(1, "Analysis IDs are required"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const customAnalysisSchema = z.object({
  pgn: z.string().min(1, "PGN is required"),
  playerColor: z.enum(["white", "black"], {
    required_error: "Player color is required",
  }),
  playerName: z.string().optional().default("Player"),
});

export type BulkAnalysisInput = z.infer<typeof bulkAnalysisSchema>;
export type StatusQueryInput = z.infer<typeof statusQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CustomAnalysisInput = z.infer<typeof customAnalysisSchema>;
