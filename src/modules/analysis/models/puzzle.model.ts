import mongoose, { Document, Schema } from "mongoose";
import { ChessPuzzle } from "../types";

export interface IPuzzle extends ChessPuzzle {
  puzzle_id: string;
  user_id: mongoose.Types.ObjectId | string;
  analysis_id?: string; // Link to the analysis that generated this puzzle
  created_at: Date;
  updated_at: Date;
}

export interface IPuzzleDocument extends IPuzzle, Document {}

const PuzzleSchema = new Schema<IPuzzleDocument>(
  {
    puzzle_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.Mixed, // Supports ObjectId for users, string for guests
      required: true,
      index: true,
    },
    analysis_id: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    fen: {
      type: String,
      required: true,
    },
    solution: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    theme: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

export const Puzzle = mongoose.model<IPuzzleDocument>("Puzzle", PuzzleSchema);
