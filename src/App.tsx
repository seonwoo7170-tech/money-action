import { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Check, ChevronLeft, ChevronRight, Clock3,
  Coins, Home, Lightbulb, LockKeyhole, RotateCcw, Settings, Sparkles,
  Target, Trophy, UserRound, WalletCards, Zap,
} from 'lucide-react';
import { COPY, INTEREST_IDS, LANGUAGE_NAMES, SKILL_IDS, type Copy } from './locales';
import { detectLocale, detectMarket, formatMoney, getMarket, MARKETS } from './markets';
import { createPlan } from './services/plan';
import { clearState, loadState, saveState } from './storage';
import type { ActionPlan, AppState, Locale, MarketCode, Mission, UserProfile } from './types';

type Tab = 'today' | 'plan' | 'insight' | 'settings';
type OnboardingData = Partial<UserProfile>;

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [tab, setTab] = useState<Tab>('today');
  const [creating, setCreating] = useState(false);

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (state.profile?.locale) document.documentElement.lang = state.profile.locale;
  }, [state.profile?.locale]);

  if (!state.profile || !state.plan) {
    return <Onboarding creating={creating} onCreate={async (profile) => {
      setCreating(true);
      try {
        const plan = await createPlan(profile);
        setState({ profile, plan, earnedIncome: 0, streak: 0 });
      } finally { setCreating(false); }
    }} />;
  }

  const copy = COPY[state.profile.locale || 'en'];
  const updatePlan = (plan: ActionPlan) => setState((old) => ({ ...old, plan }));
  const toggleMission = (id: string) => {
    const missions = state.plan!.missions.map((m) => m.id === id ? { ...m, done: !m.done } : m);
    updatePlan({ ...state.plan!, missions });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">MONEY ACTION</span><h1>{copy.hello(state.profile.nickname)}</h1></div>
        <button className="avatar" aria-label={copy.profile}><UserRound size={20}/></button>
      </header>
      <main>
        {tab === 'today' && <Today state={state} copy={copy} onToggle={toggleMission} onIncome={(amount) => setState((old) => ({ ...old, earnedIncome: old.earnedIncome + amount }))}/>} 
        {tab === 'plan' && <PlanView plan={state.plan} copy={copy}/>} 
        {tab === 'insight' && <Insight state={state} copy={copy}/>} 
        {tab === 'settings' && <SettingsView state={state} copy={copy} onReset={() => { clearState(); setState({ earnedIncome: 0, streak: 0 }); }}/>} 
      </main>
      <AdSlot label={copy.adTest} />
      <nav className="bottom-nav">
        <NavButton active={tab === 'today'} icon={<Home/>} label={copy.nav[0]} onClick={() => setTab('today')}/>
        <NavButton active={tab === 'plan'} icon={<Target/>} label={copy.nav[1]} onClick={() => setTab('plan')}/>
        <NavButton active={tab === 'insight'} icon={<BarChart3/>} label={copy.nav[2]} onClick={() => setTab('insight')}/>
        <NavButton active={tab === 'settings'} icon={<Settings/>} label={copy.nav[3]} onClick={() => setTab('settings')}/>
      </nav>
    </div>
  );
}

function initialProfile(): OnboardingData {
  const locale = detectLocale();
  const marketCode = detectMarket(locale);
  const market = getMarket(marketCode);
  return {
    nickname: '', monthlyIncome: market.monthlyIncomeDefault, targetIncome: market.targetIncomeDefault,
    weeklyHours: 7, skills: [], interests: [], experience: 'beginner', locale, market: marketCode, currency: market.currency, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

function Onboarding({ creating, onCreate }: { creating: boolean; onCreate: (p: UserProfile) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [data, setData] = useState<OnboardingData>(() => initialProfile());
  const locale = data.locale || 'en';
  const copy = COPY[locale];
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const market = getMarket((data.market || detectMarket(locale)) as MarketCode);

  const changeMarket = (code: MarketCode) => {
    const selected = getMarket(code);
    setData({ ...data, market: code, currency: selected.currency, monthlyIncome: selected.monthlyIncomeDefault, targetIncome: selected.targetIncomeDefault });
  };

  const screens = [
    <Intro key="intro" copy={copy}/>,
    <BasicStep key="basic" data={data} setData={setData} copy={copy} changeMarket={changeMarket}/>,
    <ChoiceStep key="skills" title={copy.skillsTitle} subtitle={copy.skillsSub} items={SKILL_IDS} labels={copy.skillLabels} values={data.skills || []} onChange={(values) => setData({ ...data, skills: values })}/>,
    <ChoiceStep key="interests" title={copy.interestsTitle} subtitle={copy.interestsSub} items={INTEREST_IDS} labels={copy.interestLabels} values={data.interests || []} onChange={(values) => setData({ ...data, interests: values })}/>,
    <GoalStep key="goal" data={data} setData={setData} copy={copy} presets={market.targetPresets}/>,
  ];
  const valid = step === 0 || (step === 1 ? Boolean(data.nickname?.trim()) : step === 2 ? Boolean(data.skills?.length) : step === 3 ? Boolean(data.interests?.length) : true);
  const finish = async () => {
    setError('');
    try { await onCreate(data as UserProfile); }
    catch (cause) { setError(cause instanceof Error ? cause.message : copy.planError); }
  };

  if (creating) return <Generating copy={copy}/>;
  return (
    <div className="onboarding">
      {step > 0 && <div className="progress-line"><span style={{ width: `${step / 4 * 100}%` }}/></div>}
      <div className="onboarding-top">
        {step > 0 && <button className="icon-button" onClick={() => setStep(step - 1)}><ChevronLeft/></button>}
        {step > 0 && <span className="step-count">{step} / 4</span>}
      </div>
      <div className="onboarding-content">{screens[step]}</div>
      <div className="onboarding-footer">
        {error && <p className="form-error">{error}</p>}
        <button className="primary" disabled={!valid} onClick={() => step < screens.length - 1 ? setStep(step + 1) : finish()}>
          {step === 0 ? copy.startPlan : step === 4 ? copy.getAiPlan : copy.next} <ArrowRight size={19}/>
        </button>
        {step === 0 && <p className="fine">{copy.guestTry}</p>}
      </div>
    </div>
  );
}

function Intro({ copy }: { copy: Copy }) {
  return <div className="intro">
    <div className="brand-mark"><Zap fill="currentColor"/></div>
    <span className="pill">{copy.introPill}</span>
    <h2>{copy.introTitleA}<br/><em>{copy.introTitleB}</em></h2>
    <p>{copy.introDesc}</p>
    <div className="mini-cards">
      <div><Sparkles/><b>{copy.mini[0][0]}</b><span>{copy.mini[0][1]}</span></div>
      <div><Target/><b>{copy.mini[1][0]}</b><span>{copy.mini[1][1]}</span></div>
      <div><BarChart3/><b>{copy.mini[2][0]}</b><span>{copy.mini[2][1]}</span></div>
    </div>
  </div>;
}

function BasicStep({ data, setData, copy, changeMarket }: { data: OnboardingData; setData: (d: OnboardingData) => void; copy: Copy; changeMarket: (m: MarketCode)=>void }) {
  const locale = data.locale || 'en';
  const market = getMarket((data.market || 'GLOBAL') as MarketCode);
  return <section className="form-step"><h2>{copy.basicTitle}</h2><p>{copy.basicDesc}</p>
    <label>{copy.language}<select value={locale} onChange={(e) => setData({ ...data, locale: e.target.value as Locale })}>{(Object.keys(LANGUAGE_NAMES) as Locale[]).map((l)=><option key={l} value={l}>{LANGUAGE_NAMES[l]}</option>)}</select></label>
    <label>{copy.market}<select value={data.market} onChange={(e) => changeMarket(e.target.value as MarketCode)}>{MARKETS.map((m)=><option key={m.code} value={m.code}>{m.name[locale]}</option>)}</select></label>
    <label>{copy.nicknameLabel}<input autoFocus value={data.nickname || ''} placeholder={copy.nicknamePlaceholder} onChange={(e) => setData({ ...data, nickname: e.target.value })}/></label>
    <label>{copy.monthlyIncome}<input type="number" inputMode="decimal" value={data.monthlyIncome} onChange={(e) => setData({ ...data, monthlyIncome: Number(e.target.value) })}/><span className="suffix">{market.currency}</span></label>
    <label>{copy.experience}<select value={data.experience} onChange={(e) => setData({ ...data, experience: e.target.value as UserProfile['experience'] })}><option value="beginner">{copy.beginner}</option><option value="some">{copy.some}</option><option value="experienced">{copy.experienced}</option></select></label>
  </section>;
}

function ChoiceStep({ title, subtitle, items, labels, values, onChange }: { title: string; subtitle: string; items: string[]; labels: Record<string,string>; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (item: string) => onChange(values.includes(item) ? values.filter((v) => v !== item) : [...values, item]);
  return <section className="form-step"><h2>{title}</h2><p>{subtitle}</p><div className="choices">{items.map((item) => <button key={item} className={values.includes(item) ? 'selected' : ''} onClick={() => toggle(item)}>{values.includes(item) && <Check size={16}/>} {labels[item]}</button>)}</div></section>;
}

function GoalStep({ data, setData, copy, presets }: { data: OnboardingData; setData: (d: OnboardingData) => void; copy: Copy; presets: number[] }) {
  const locale = data.locale || 'en';
  const currency = data.currency || 'USD';
  return <section className="form-step"><h2>{copy.goalTitle}</h2><p>{copy.goalDesc}</p>
    <label>{copy.targetIncome}<input className="large-input" type="number" inputMode="decimal" value={data.targetIncome} onChange={(e) => setData({ ...data, targetIncome: Number(e.target.value) })}/><span className="suffix">{currency}</span></label>
    <div className="quick-values">{presets.map((v) => <button key={v} onClick={() => setData({ ...data, targetIncome: v })}>{formatMoney(v, locale, currency)}</button>)}</div>
    <label>{copy.weeklyHours}<div className="range-row"><input type="range" min="2" max="30" value={data.weeklyHours} onChange={(e) => setData({ ...data, weeklyHours: Number(e.target.value) })}/><strong>{copy.hours(data.weeklyHours || 0)}</strong></div></label>
    <div className="notice"><Lightbulb/><span>{copy.goalNotice}</span></div>
  </section>;
}

function Generating({ copy }: { copy: Copy }) {
  return <div className="generating"><div className="orb"><Sparkles/></div><h2>{copy.generatingTitleA}<br/>{copy.generatingTitleB}</h2><p>{copy.generatingDesc}</p><div className="loading-bar"><span/></div><small>{copy.generatingTime}</small></div>;
}

function Today({ state, copy, onToggle, onIncome }: { state: AppState; copy: Copy; onToggle: (id: string) => void; onIncome: (v: number) => void }) {
  const plan = state.plan!;
  const profile = state.profile!;
  const money = (v:number) => formatMoney(v, profile.locale, profile.currency);
  const completed = plan.missions.filter((m) => m.done).length;
  const next = plan.missions.find((m) => !m.done);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const ratio = profile.targetIncome > 0 ? state.earnedIncome / profile.targetIncome * 100 : 0;

  return <div className="page">
    <section className="goal-card">
      <div className="goal-top"><div><span>{copy.monthlyGoal}</span><strong>{money(profile.targetIncome)}</strong></div><div className="ring" style={{ '--value': `${Math.min(100, ratio)}%` } as React.CSSProperties}><span>{Math.round(ratio)}%</span></div></div>
      <div className="bar"><span style={{ width: `${Math.min(100, ratio)}%` }}/></div>
      <div className="goal-bottom"><span>{copy.current} {money(state.earnedIncome)}</span><button onClick={() => setIncomeOpen(!incomeOpen)}>{copy.recordIncome}</button></div>
      {incomeOpen && <div className="income-entry"><input type="number" placeholder={copy.incomePlaceholder} value={amount} onChange={(e) => setAmount(e.target.value)}/><button onClick={() => { onIncome(Number(amount)); setAmount(''); setIncomeOpen(false); }}>{copy.save}</button></div>}
    </section>
    <div className="section-heading"><div><span className="dot"/>{copy.todayAction}</div><small>{completed}/{plan.missions.length} {copy.completed}</small></div>
    {next ? <MissionCard mission={next} copy={copy} onToggle={onToggle}/> : <div className="all-done"><Trophy/><h3>{copy.allDoneTitle}</h3><p>{copy.allDoneDesc}</p></div>}
    <section className="coach-card"><div className="coach-icon"><Sparkles/></div><div><span>{copy.coach}</span><p>{plan.coachMessage}</p></div></section>
    <div className="section-heading"><div>{copy.upcoming}</div><button>{copy.viewAll} <ChevronRight size={16}/></button></div>
    <div className="upcoming">{plan.missions.filter((m) => !m.done && m.id !== next?.id).slice(0, 3).map((m) => <div key={m.id}><span className={`category c-${m.category}`}>{copy.categories[m.category]}</span><div><b>{m.title}</b><small>DAY {m.day} · {copy.minute(m.minutes)}</small></div></div>)}</div>
    <section className="streak-card"><Zap fill="currentColor"/><div><b>{copy.streak(Math.max(state.streak, completed))}</b><span>{copy.streakDesc}</span></div></section>
  </div>;
}

function MissionCard({ mission, copy, onToggle }: { mission: Mission; copy: Copy; onToggle: (id: string) => void }) {
  return <article className="mission-card"><div className="mission-meta"><span className={`category c-${mission.category}`}>{copy.categories[mission.category]}</span><span><Clock3 size={14}/>{copy.minute(mission.minutes)}</span></div><h2>{mission.title}</h2><p>{mission.description}</p><div className="mission-tip"><Lightbulb/><span>{copy.missionTip}</span></div><button className="complete" onClick={() => onToggle(mission.id)}><span><Check/></span> {copy.completeAction}</button></article>;
}

function PlanView({ plan, copy }: { plan: ActionPlan; copy: Copy }) {
  return <div className="page"><div className="page-title"><span>MY 90 DAYS</span><h2>{plan.headline}</h2></div>
    <section className="path-card"><div><span>{copy.recommended}</span><b>{copy.fit(plan.selectedPath.fitScore)}</b></div><h3>{plan.selectedPath.name}</h3><p>{plan.selectedPath.summary}</p><div className="path-facts"><span><Clock3/>{copy.firstRevenue(plan.selectedPath.firstRevenueDays)}</span><span><Coins/>{plan.selectedPath.priceIdea}</span></div></section>
    <div className="section-heading"><div>{copy.milestones}</div></div>
    <div className="timeline">{plan.milestones.map((m) => <div key={m.day}><span>DAY<br/><b>{m.day}</b></span><div><b>{m.title}</b><p>{m.target}</p></div></div>)}</div>
    <div className="section-heading"><div>{copy.alternatives}</div></div>
    <div className="alternatives">{plan.alternatives.map((path) => <div key={path.id}><strong>{path.fitScore}</strong><div><b>{path.name}</b><p>{path.reason}</p></div></div>)}</div>
  </div>;
}

function Insight({ state, copy }: { state: AppState; copy: Copy }) {
  const profile = state.profile!;
  const done = state.plan!.missions.filter((m) => m.done).length;
  const rate = Math.round(done / state.plan!.missions.length * 100);
  return <div className="page"><div className="page-title"><span>{copy.weeklyReport}</span><h2>{copy.progressTitle}</h2></div>
    <div className="stat-grid"><div><Target/><span>{copy.executionRate}</span><b>{rate}%</b></div><div><WalletCards/><span>{copy.recordedIncome}</span><b>{formatMoney(state.earnedIncome, profile.locale, profile.currency)}</b></div><div><Zap/><span>{copy.actionStreak}</span><b>{copy.dayCount(done)}</b></div><div><Trophy/><span>{copy.completedActions}</span><b>{copy.actionCount(done)}</b></div></div>
    <section className="locked-card"><div><LockKeyhole/></div><h3>{copy.weeklyAnalysis}</h3><p>{copy.weeklyAnalysisDesc}</p><button><Sparkles/> {copy.rewardAd}</button><small>{copy.betaMode}</small></section>
  </div>;
}

function SettingsView({ state, copy, onReset }: { state: AppState; copy: Copy; onReset: () => void }) {
  const profile = state.profile!;
  const market = getMarket(profile.market);
  return <div className="page"><div className="page-title"><span>SETTINGS</span><h2>{copy.settingsTitle}</h2></div>
    <section className="premium-card"><Sparkles/><div><span>{copy.once}</span><h3>{copy.lifetime}</h3><p>{copy.premiumDesc}</p><b>{copy.storePrice}</b></div><button>{copy.comingSoon}</button></section>
    <div className="settings-list"><button><span>{copy.language}</span><b>{LANGUAGE_NAMES[profile.locale]} <ChevronRight/></b></button><button><span>{copy.market}</span><b>{market.name[profile.locale]} <ChevronRight/></b></button><button><span>{copy.notification}</span><b>{copy.notificationValue} <ChevronRight/></b></button><button><span>{copy.aiCredits}</span><b>{copy.aiCreditsValue} <ChevronRight/></b></button><button><span>{copy.privacy}</span><ChevronRight/></button><button><span>{copy.terms}</span><ChevronRight/></button></div>
    <button className="reset" onClick={() => confirm(copy.resetConfirm) && onReset()}><RotateCcw/> {copy.restart}</button>
    <p className="version">{copy.version}</p>
  </div>;
}

function AdSlot({ label }: { label: string }) { return <div className="ad-slot"><span>AD</span>{label}</div>; }
function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>; }
