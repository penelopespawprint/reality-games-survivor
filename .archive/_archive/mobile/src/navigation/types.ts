/**
 * Navigation Type Definitions
 */

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  LeagueSelector: undefined;
};

export type MainTabParamList = {
  Leaderboard: undefined;
  Picks: undefined;
  Profile: undefined;
  Admin?: undefined;
};

export type PicksStackParamList = {
  PicksHome: undefined;
  DraftPicks: undefined;
  WeeklyPicks: { weekNumber: number };
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  WeeklyScoring: undefined;
  CastawayManager: undefined;
  UserManagement: undefined;
  LeagueManagement: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  MyLeagues: undefined;
  JoinLeague: undefined;
};
