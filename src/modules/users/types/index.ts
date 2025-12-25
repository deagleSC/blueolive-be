export interface DashboardStats {
  total_analyses: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
  win_rate?: number; // Percentage of wins (only for completed analyses)
  total_games: number;
  recent_analyses: RecentAnalysis[];
}

export interface RecentAnalysis {
  analysis_id: string;
  status: string;
  player_name: string;
  player_color: "white" | "black";
  opponent: string;
  result: string;
  created_at: string;
  completed_at?: string;
}

export interface DashboardSummary {
  stats: DashboardStats;
  most_played_openings?: OpeningStat[];
  performance_by_color?: {
    white: { wins: number; losses: number; draws: number };
    black: { wins: number; losses: number; draws: number };
  };
}

export interface OpeningStat {
  opening: string;
  eco?: string;
  count: number;
  wins: number;
  losses: number;
  draws: number;
}
