/** A row in a pool leaderboard (US-5.2). */
export interface LeaderboardRow {
  position: number;
  userId: string;
  nickname: string;
  avatarUrl: string;
  totalPoints: number;
  isViewer: boolean;
  isTied: boolean;
}
