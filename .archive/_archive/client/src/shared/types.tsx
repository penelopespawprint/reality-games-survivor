export interface User {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  displayName?: string | null;
  city?: string | null;
  state?: string | null;
  favoriteCastaway?: string | null;
  favoriteCharity?: string | null;
  charityUrl?: string | null;
  about?: string | null;
  profilePicture?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  smsEnabled?: boolean;
  isAdmin: boolean;
  hasSeenWelcome?: boolean;
}

export interface Castaway {
  id: string;
  name: string;
  age?: number;
  hometown?: string;
  occupation?: string;
  tribe?: string;
  imageUrl?: string;
  eliminated?: boolean;
  eliminatedWeek?: number | null;
}

export interface Pick {
  id: string;
  userId: string;
  castawayId: string;
  weekNumber: number;
  castaway?: Castaway;
}

export interface DraftPick {
  id: string;
  castawayId: string;
  round: number;
  pickNumber: number;
  castaway: Castaway;
}

export interface RankingEntrySummary {
  castawayId: string;
  position: number;
  castaway: Castaway;
}

export interface League {
  id: string;
  name: string;
  code: string;
}

export interface WeeklyResult {
  id: string;
  weekNumber: number;
  points: number;
  castawayId: string;
  castaway: Castaway;
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated?: boolean;
}

export interface LeagueMember {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  joinedAt?: string;
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

/** Type guard for API errors */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
}

/** Extract error message from unknown error */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.error || error.response?.data?.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export interface Week {
  id: string;
  weekNumber: number;
  title?: string;
  isActive: boolean;
  deadline?: string;
  episodeDate?: string;
}

export interface Standing {
  userId: string;
  name: string;
  email?: string;
  totalPoints: number;
  rank: number;
}
