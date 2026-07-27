/** Precomputed profile metrics shown by StatCard components. */
export interface UserProfileStats {
  userId: string;
  followerCount: number;
  followingCount: number;
  dailyStreamCount: number;
}

// Every seeded account has a row, including operational users with little activity.
export const profileStats: UserProfileStats[] = [
  {
    userId: "user-listener-1",
    followerCount: 128,
    followingCount: 34,
    dailyStreamCount: 47
  },
  {
    userId: "user-listener-2",
    followerCount: 18,
    followingCount: 12,
    dailyStreamCount: 9
  },
  {
    userId: "user-artist-1",
    followerCount: 32200,
    followingCount: 58,
    dailyStreamCount: 28410
  },
  {
    userId: "user-support-1",
    followerCount: 4,
    followingCount: 6,
    dailyStreamCount: 0
  },
  {
    userId: "user-admin-1",
    followerCount: 11,
    followingCount: 9,
    dailyStreamCount: 3
  }
];

export function getProfileStats(userId: string): UserProfileStats {
  // Unknown/newly registered users receive a safe zero-filled view.
  return (
    profileStats.find((item) => item.userId === userId) ?? {
      userId,
      followerCount: 0,
      followingCount: 0,
      dailyStreamCount: 0
    }
  );
}
