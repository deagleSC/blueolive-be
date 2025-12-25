import mongoose, { Document, Schema } from "mongoose";
import { IAnalysis, AnalysisStatus } from "../types";

export interface IAnalysisDocument
  extends Omit<IAnalysis, "user_id">, Document {
  user_id: mongoose.Types.ObjectId | string;
}

const AnalysisSchema = new Schema<IAnalysisDocument>(
  {
    analysis_id: {
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
    batch_id: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AnalysisStatus),
      default: AnalysisStatus.PENDING,
      index: true,
    },
    pgn: {
      type: String,
      required: true,
    },
    gcs_url: {
      type: String,
    },
    player_name: {
      type: String,
      required: true,
    },
    player_color: {
      type: String,
      enum: ["white", "black"],
    },
    metadata: {
      white: { type: String, default: "Unknown" },
      black: { type: String, default: "Unknown" },
      result: { type: String, default: "*" },
      event: String,
      date: String,
      eco: String,
      opening: String,
    },
    result: {
      type: Schema.Types.Mixed,
      default: {},
    },
    error: String,
    completed_at: Date,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

export const Analysis = mongoose.model<IAnalysisDocument>(
  "Analysis",
  AnalysisSchema,
);
