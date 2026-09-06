import { COPY, INTEREST_IDS, SKILL_IDS } from './locales';
import { detectLocale, detectMarket, getMarket } from './markets';
import type { AppState, Locale, MarketCode, MissionCategory } from './types';

const KEY = 'money-action-state-v2';
const LEGACY_KEY = 'money-action-state-v1';

const locales: Locale[] = ['ko','en','ja','es','pt-BR'];
const markets: MarketCode[] = ['KR','US','CA','GB','AU','JP','MX','ES','BR','GLOBAL'];

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyState();
    return migrateState(JSON.parse(raw) as AppState);
  } catch {
    return emptyState();
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(KEY, JSON.stringify(state));
};

export const clearState = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LEGACY_KEY);
};

function emptyState(): AppState { return { earnedIncome: 0, streak: 0 }; }

function migrateState(state: AppState): AppState {
  if (!state.profile) return { ...emptyState(), ...state };
  const legacy = state.profile as AppState['profile'] & Record<string, unknown>;
  const locale = locales.includes(legacy.locale as Locale) ? legacy.locale as Locale : detectLocale();
  const marketCode = markets.includes(legacy.market as MarketCode) ? legacy.market as MarketCode : detectMarket(locale);
  const market = getMarket(marketCode);
  const profile = {
    ...state.profile,
    locale,
    market: marketCode,
    currency: typeof legacy.currency === 'string' && /^[A-Z]{3}$/.test(legacy.currency) ? legacy.currency : market.currency,
    timeZone: typeof legacy.timeZone === 'string' && legacy.timeZone ? legacy.timeZone : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
    skills: normalizeChoiceIds(state.profile.skills || [], 'skill'),
    interests: normalizeChoiceIds(state.profile.interests || [], 'interest'),
  };
  const plan = state.plan ? {
    ...state.plan,
    missions: state.plan.missions.map((mission) => ({ ...mission, category: normalizeCategory(mission.category as unknown as string) })),
  } : undefined;
  return { ...state, profile, plan, earnedIncome: Number(state.earnedIncome) || 0, streak: Number(state.streak) || 0 };
}

function normalizeChoiceIds(values: string[], kind: 'skill'|'interest') {
  const ids = kind === 'skill' ? SKILL_IDS : INTEREST_IDS;
  const dictionaries = Object.values(COPY).map((copy) => kind === 'skill' ? copy.skillLabels : copy.interestLabels);
  return values.map((value) => {
    if (ids.includes(value)) return value;
    for (const dictionary of dictionaries) {
      const found = Object.entries(dictionary).find(([,label]) => label === value);
      if (found) return found[0];
    }
    return value;
  });
}

function normalizeCategory(value: string): MissionCategory {
  if (value === 'prepare' || value === '준비' || value === '準備' || value === 'Preparar') return 'prepare';
  if (value === 'build' || value === '제작' || value === '作成' || value === 'Crear' || value === 'Criar') return 'build';
  if (value === 'customer' || value === '고객' || value === '顧客' || value === 'Cliente') return 'customer';
  return 'revenue';
}
