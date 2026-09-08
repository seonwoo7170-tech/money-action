export type Locale = 'ko' | 'en' | 'ja' | 'es' | 'pt-BR';
export type MarketCode = 'KR' | 'US' | 'CA' | 'GB' | 'AU' | 'JP' | 'MX' | 'ES' | 'BR' | 'GLOBAL';
export type MissionCategory = 'prepare' | 'build' | 'customer' | 'revenue';

export type UserProfile = {
  nickname: string;
  monthlyIncome: number;
  targetIncome: number;
  weeklyHours: number;
  skills: string[];
  interests: string[];
  experience: 'beginner' | 'some' | 'experienced';
  locale: Locale;
  market: MarketCode;
  currency: string;
  timeZone: string;
};

export type Mission = {
  id: string;
  day: number;
  title: string;
  description: string;
  minutes: number;
  category: MissionCategory;
  done: boolean;
  why?: string;
  question?: string;
  suggestions?: string[];
  deliverable?: string;
  successSignal?: string;
  userAnswer?: string;
  aiFeedback?: string;
  refinedOutput?: string;
  completedAt?: string;
};

export type IncomePath = {
  id: string;
  name: string;
  summary: string;
  fitScore: number;
  firstRevenueDays: number;
  priceIdea: string;
  reason: string;
};

export type ActionPlan = {
  headline: string;
  coachMessage: string;
  selectedPath: IncomePath;
  alternatives: IncomePath[];
  missions: Mission[];
  milestones: { day: number; title: string; target: string }[];
  generatedAt: string;
};

export type MissionFeedback = {
  feedback: string;
  refinedOutput: string;
  nextMission?: Partial<Pick<Mission, 'title' | 'description' | 'why' | 'question' | 'suggestions' | 'deliverable' | 'successSignal'>>;
};

export type AppState = {
  profile?: UserProfile;
  plan?: ActionPlan;
  earnedIncome: number;
  streak: number;
};
