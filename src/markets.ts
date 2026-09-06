import type { Locale, MarketCode } from './types';

export type Market = {
  code: MarketCode;
  name: Record<Locale, string>;
  currency: string;
  defaultLocale: Locale;
  modelSeeds: string[];
  monthlyIncomeDefault: number;
  targetIncomeDefault: number;
  targetPresets: number[];
};

const n = (ko: string, en: string, ja: string, es: string, pt: string): Record<Locale, string> => ({ ko, en, ja, es, 'pt-BR': pt });

export const MARKETS: Market[] = [
  { code: 'KR', name: n('대한민국','South Korea','韓国','Corea del Sur','Coreia do Sul'), currency: 'KRW', defaultLocale: 'ko', monthlyIncomeDefault: 2200000, targetIncomeDefault: 1000000, targetPresets: [300000,500000,1000000,2000000], modelSeeds: ['Naver content', 'Coupang affiliate', 'Kmong freelance services', 'digital products', 'local services'] },
  { code: 'US', name: n('미국','United States','アメリカ','Estados Unidos','Estados Unidos'), currency: 'USD', defaultLocale: 'en', monthlyIncomeDefault: 4000, targetIncomeDefault: 1000, targetPresets: [300,500,1000,2000], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'Etsy-style marketplaces', 'local services'] },
  { code: 'CA', name: n('캐나다','Canada','カナダ','Canadá','Canadá'), currency: 'CAD', defaultLocale: 'en', monthlyIncomeDefault: 4500, targetIncomeDefault: 1200, targetPresets: [300,600,1200,2500], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  { code: 'GB', name: n('영국','United Kingdom','イギリス','Reino Unido','Reino Unido'), currency: 'GBP', defaultLocale: 'en', monthlyIncomeDefault: 3000, targetIncomeDefault: 800, targetPresets: [250,500,800,1500], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  { code: 'AU', name: n('호주','Australia','オーストラリア','Australia','Austrália'), currency: 'AUD', defaultLocale: 'en', monthlyIncomeDefault: 5000, targetIncomeDefault: 1500, targetPresets: [500,800,1500,3000], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  { code: 'JP', name: n('일본','Japan','日本','Japón','Japão'), currency: 'JPY', defaultLocale: 'ja', monthlyIncomeDefault: 350000, targetIncomeDefault: 100000, targetPresets: [30000,50000,100000,200000], modelSeeds: ['note-style content', 'CrowdWorks-style freelancing', 'digital products', 'resale marketplaces', 'local services'] },
  { code: 'MX', name: n('멕시코','Mexico','メキシコ','México','México'), currency: 'MXN', defaultLocale: 'es', monthlyIncomeDefault: 20000, targetIncomeDefault: 6000, targetPresets: [2000,4000,6000,12000], modelSeeds: ['freelance services', 'social commerce', 'digital products', 'affiliate content', 'local services'] },
  { code: 'ES', name: n('스페인','Spain','スペイン','España','Espanha'), currency: 'EUR', defaultLocale: 'es', monthlyIncomeDefault: 2500, targetIncomeDefault: 700, targetPresets: [200,400,700,1500], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'local services', 'online tutoring'] },
  { code: 'BR', name: n('브라질','Brazil','ブラジル','Brasil','Brasil'), currency: 'BRL', defaultLocale: 'pt-BR', monthlyIncomeDefault: 5000, targetIncomeDefault: 1500, targetPresets: [500,1000,1500,3000], modelSeeds: ['Hotmart-style digital products', 'social commerce', 'freelance services', 'affiliate content', 'local services'] },
  { code: 'GLOBAL', name: n('기타 국가','Other / Global','その他 / グローバル','Otro / Global','Outro / Global'), currency: 'USD', defaultLocale: 'en', monthlyIncomeDefault: 4000, targetIncomeDefault: 1000, targetPresets: [300,500,1000,2000], modelSeeds: ['freelance services', 'digital products', 'affiliate content', 'online tutoring', 'local services'] },
];

export const getMarket = (code: MarketCode) => MARKETS.find((m) => m.code === code) || MARKETS.find((m) => m.code === 'GLOBAL')!;

export function detectLocale(): Locale {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('pt')) return 'pt-BR';
  return 'en';
}

export function detectMarket(locale: Locale): MarketCode {
  const tag = (navigator.language || '').toUpperCase();
  if (tag.includes('-KR')) return 'KR';
  if (tag.includes('-JP')) return 'JP';
  if (tag.includes('-MX')) return 'MX';
  if (tag.includes('-ES')) return 'ES';
  if (tag.includes('-BR')) return 'BR';
  if (tag.includes('-CA')) return 'CA';
  if (tag.includes('-GB')) return 'GB';
  if (tag.includes('-AU')) return 'AU';
  if (tag.includes('-US')) return 'US';
  return locale === 'ko' ? 'KR' : locale === 'ja' ? 'JP' : locale === 'es' ? 'MX' : locale === 'pt-BR' ? 'BR' : 'US';
}

export const formatMoney = (value: number, locale: Locale, currency: string) => new Intl.NumberFormat(locale, {
  style: 'currency', currency, maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
}).format(Number.isFinite(value) ? value : 0);
