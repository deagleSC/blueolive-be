import {
  Analysis,
  IAnalysisDocument,
} from "../../analysis/models/analysis.model";
import { AnalysisStatus } from "../../analysis/types";
import {
  DashboardStats,
  DashboardSummary,
  RecentAnalysis,
  OpeningStat,
} from "../types";
import { logger } from "../../../shared/utils/logger";

/**
 * Calculate win rate from game results
 */
function calculateWinRate(analyses: IAnalysisDocument[]): number | undefined {
  const completedAnalyses = analyses.filter(
    (a) => a.status === AnalysisStatus.COMPLETED && a.metadata.result !== "*",
  );

  if (completedAnalyses.length === 0) {
    return undefined;
  }

  let wins = 0;
  for (const analysis of completedAnalyses) {
    const result = analysis.metadata.result;
    const playerColor = analysis.player_color;

    if (
      (result === "1-0" && playerColor === "white") ||
      (result === "0-1" && playerColor === "black")
    ) {
      wins++;
    }
  }

  return Math.round((wins / completedAnalyses.length) * 100);
}

/**
 * Get recent analyses for dashboard
 */
function getRecentAnalyses(
  analyses: IAnalysisDocument[],
  limit = 5,
): RecentAnalysis[] {
  return analyses.slice(0, limit).map((analysis) => ({
    analysis_id: analysis.analysis_id,
    status: analysis.status,
    player_name: analysis.player_name,
    player_color: analysis.player_color || "white",
    opponent:
      analysis.player_color === "white"
        ? analysis.metadata.black
        : analysis.metadata.white,
    result: analysis.metadata.result,
    created_at: analysis.created_at.toISOString(),
    completed_at: analysis.completed_at?.toISOString(),
  }));
}

/**
 * Get most played openings
 */
function getMostPlayedOpenings(analyses: IAnalysisDocument[]): OpeningStat[] {
  const openingMap = new Map<string, OpeningStat>();

  for (const analysis of analyses) {
    if (analysis.status !== AnalysisStatus.COMPLETED) continue;

    const opening = analysis.metadata.opening || "Unknown";
    const eco = analysis.metadata.eco || "";
    const key = `${opening}|${eco}`;

    if (!openingMap.has(key)) {
      openingMap.set(key, {
        opening,
        eco: eco || undefined,
        count: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }

    const stat = openingMap.get(key)!;
    stat.count++;

    const result = analysis.metadata.result;
    const playerColor = analysis.player_color;

    if (result === "1/2-1/2") {
      stat.draws++;
    } else if (
      (result === "1-0" && playerColor === "white") ||
      (result === "0-1" && playerColor === "black")
    ) {
      stat.wins++;
    } else {
      stat.losses++;
    }
  }

  return Array.from(openingMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Get performance by color
 */
function getPerformanceByColor(analyses: IAnalysisDocument[]) {
  const performance = {
    white: { wins: 0, losses: 0, draws: 0 },
    black: { wins: 0, losses: 0, draws: 0 },
  };

  for (const analysis of analyses) {
    if (analysis.status !== AnalysisStatus.COMPLETED) continue;

    const result = analysis.metadata.result;
    const playerColor = analysis.player_color;

    if (!playerColor) continue;

    if (result === "1/2-1/2") {
      performance[playerColor].draws++;
    } else if (
      (result === "1-0" && playerColor === "white") ||
      (result === "0-1" && playerColor === "black")
    ) {
      performance[playerColor].wins++;
    } else {
      performance[playerColor].losses++;
    }
  }

  return performance;
}

/**
 * Get dashboard statistics for a user
 */
export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  try {
    // Get accurate counts from database using aggregation
    const [statusCounts, recentAnalyses, total] = await Promise.all([
      Analysis.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Analysis.find({ user_id: userId }).sort({ created_at: -1 }).limit(5),
      Analysis.countDocuments({ user_id: userId }),
    ]);

    // Convert aggregation results to a map
    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get all completed analyses for win rate calculation
    const completedAnalyses = await Analysis.find({
      user_id: userId,
      status: AnalysisStatus.COMPLETED,
    });

    const stats: DashboardStats = {
      total_analyses: total,
      completed: counts[AnalysisStatus.COMPLETED] || 0,
      pending: counts[AnalysisStatus.PENDING] || 0,
      processing: counts[AnalysisStatus.PROCESSING] || 0,
      failed: counts[AnalysisStatus.FAILED] || 0,
      total_games: total,
      recent_analyses: getRecentAnalyses(recentAnalyses, 5),
      win_rate: calculateWinRate(completedAnalyses),
    };

    return stats;
  } catch (error) {
    logger.error("Failed to get dashboard stats:", error);
    throw error;
  }
}

/**
 * Get comprehensive dashboard summary
 * This is optimized to fetch all data in parallel and avoid duplicate queries
 */
export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  try {
    // Fetch all data in parallel for better performance
    const [statusCounts, recentAnalyses, total, completedAnalyses] =
      await Promise.all([
        Analysis.aggregate([
          { $match: { user_id: userId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Analysis.find({ user_id: userId }).sort({ created_at: -1 }).limit(5),
        Analysis.countDocuments({ user_id: userId }),
        Analysis.find({
          user_id: userId,
          status: AnalysisStatus.COMPLETED,
        })
          .sort({ created_at: -1 })
          .limit(1000), // Limit for performance but enough for accurate stats
      ]);

    // Convert aggregation results to a map
    const counts = statusCounts.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Build stats object (same structure as getDashboardStats but computed here)
    const stats: DashboardStats = {
      total_analyses: total,
      completed: counts[AnalysisStatus.COMPLETED] || 0,
      pending: counts[AnalysisStatus.PENDING] || 0,
      processing: counts[AnalysisStatus.PROCESSING] || 0,
      failed: counts[AnalysisStatus.FAILED] || 0,
      total_games: total,
      recent_analyses: getRecentAnalyses(recentAnalyses, 5),
      win_rate: calculateWinRate(completedAnalyses),
    };

    // Calculate additional summary data
    const mostPlayedOpenings = getMostPlayedOpenings(completedAnalyses);
    const performanceByColor = getPerformanceByColor(completedAnalyses);

    return {
      stats,
      most_played_openings:
        mostPlayedOpenings.length > 0 ? mostPlayedOpenings : undefined,
      performance_by_color:
        performanceByColor.white.wins +
          performanceByColor.white.losses +
          performanceByColor.white.draws +
          performanceByColor.black.wins +
          performanceByColor.black.losses +
          performanceByColor.black.draws >
        0
          ? performanceByColor
          : undefined,
    };
  } catch (error) {
    logger.error("Failed to get dashboard summary:", error);
    throw error;
  }
}

export const dashboardService = {
  getDashboardStats,
  getDashboardSummary,
};
