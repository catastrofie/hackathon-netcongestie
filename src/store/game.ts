import { create } from 'zustand';
import { BUILDINGS, PROJECTS, seasonOfMonth, type BatteryMode, type Season } from '../data/park';
import { creditsFor, EMPTY_SCENARIO, simulate, type Scenario, type SimResult } from '../sim/simulate';

export type Role = 'company' | 'community';

export type MissionStep =
  | 'title' // logo screen
  | 'role' // choose company / community
  | 'intro' // title overlay
  | 'explore' // park idle, meter red, click your factory
  | 'refused' // expansion refused, objective set
  | 'negotiate' // hub table open
  | 'tested' // scenario preview shown
  | 'committed' // turn report
  | 'reinvest' // projects panel
  | 'month2'; // next objective shown

export interface Toast {
  id: number;
  kind: 'error' | 'success' | 'info' | 'badge';
  text: string;
}

interface GameState {
  month: number;
  hour: number; // 0..23, the day clock
  clockRunning: boolean;
  credits: number;
  badges: string[];
  selected: string | null;
  hovered: string | null;
  step: MissionStep;
  role: Role;
  vote: string | null;
  season: Season;
  draft: Scenario; // what the player is assembling at the hub table
  committed: Scenario; // the state of the park after the last end-of-month
  testResult: SimResult | null;
  toasts: Toast[];
  showCurve: boolean;
  lastReport: { credits: number; freedKw: number; dieselAvoided: number; peakSaved: number; peakSavedNextYear: number; peakBefore: number; peakAfter: number; batteryKw: number; batterySaved: number; batteryMode: BatteryMode } | null;

  // actions
  setHour: (h: number) => void;
  tick: () => void;
  toggleClock: () => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setStep: (s: MissionStep) => void;
  chooseRole: (r: Role) => void;
  setSeason: (s: Season) => void;
  castVote: (id: string) => void;
  requestExpansion: () => void;
  openHub: () => void;
  setDeal: (id: string, kw: number) => void;
  setBattery: (m: BatteryMode) => void;
  setBatterySolar: (v: boolean) => void;
  batteryChoiceOpen: boolean;
  openBatteryChoice: () => void;
  closeBatteryChoice: () => void;
  testScenario: () => void;
  endMonth: () => void;
  buyProject: (id: string) => void;
  startMonth2: () => void;
  toast: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: number) => void;
  setShowCurve: (v: boolean) => void;
  restart: () => void;
}

let toastId = 0;

const initial = () => ({
  month: 1,
  hour: 17,
  clockRunning: true,
  credits: 0,
  badges: [] as string[],
  selected: null,
  hovered: null,
  step: 'title' as MissionStep,
  role: 'company' as Role,
  vote: null as string | null,
  season: 'winter' as Season,
  batteryChoiceOpen: false,
  draft: { ...EMPTY_SCENARIO, deals: {}, season: 'winter' as Season, battery: 'standby' as BatteryMode },
  committed: { ...EMPTY_SCENARIO, deals: {}, season: 'winter' as Season, battery: 'standby' as BatteryMode },
  testResult: null,
  toasts: [] as Toast[],
  showCurve: false,
  lastReport: null,
});

export const useGame = create<GameState>((set, get) => ({
  ...initial(),

  setHour: (hour) => set({ hour }),
  tick: () => set((s) => (s.clockRunning ? { hour: (s.hour + 1) % 24 } : {})),
  toggleClock: () => set((s) => ({ clockRunning: !s.clockRunning })),
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  setStep: (step) => set({ step }),
  chooseRole: (role) => set({ role, step: 'intro' }),
  setSeason: (season) =>
    set((s) => ({ season, draft: { ...s.draft, season }, committed: { ...s.committed, season }, testResult: null })),
  castVote: (id) => {
    const { buyProject, toast } = get();
    set({ vote: id });
    toast('info', 'Votes are in: 62% for the heat network, 38% for the battery.');
    setTimeout(() => buyProject('heatnet'), 1400);
  },

  requestExpansion: () => {
    const { committed, toast } = get();
    const r = simulate({ ...committed, expansion: true });
    const now = simulate(committed);
    if (r.congested) {
      toast('error', `Connection request refused: the feeder is at ${Math.round(now.utilisation * 100)}% at ${String(now.peakHour).padStart(2, '0')}:00; with +300 kW it would hit ${Math.round(r.utilisation * 100)}%. Queue position: 2029.`);
      set({ step: 'refused', hour: r.peakHour, clockRunning: false, testResult: r, showCurve: true });
    } else {
      toast('success', 'Expansion approved.');
    }
  },

  openHub: () => set({ step: 'negotiate', selected: null, showCurve: false, testResult: null, clockRunning: true }),

  setDeal: (id, kw) =>
    set((s) => ({ draft: { ...s.draft, deals: { ...s.draft.deals, [id]: kw } }, testResult: null })),

  setBattery: (battery) => set((s) => ({ draft: { ...s.draft, battery }, testResult: null })),
  setBatterySolar: (batterySolar) => set((s) => ({ draft: { ...s.draft, batterySolar }, testResult: null })),
  openBatteryChoice: () => set({ batteryChoiceOpen: true }),
  closeBatteryChoice: () => set({ batteryChoiceOpen: false }),

  testScenario: () => {
    const { draft, toast } = get();
    const scenario = { ...draft, expansion: true };
    const r = simulate(scenario);
    set({ testResult: r, showCurve: true, step: 'tested', hour: r.peakHour, clockRunning: false });
    if (r.congested) {
      const h = r.congestedHours[0];
      toast('error', `Still congested at ${String(h).padStart(2, '0')}:00 — capacity moved, it didn't disappear.`);
    } else {
      toast('success', `Peak drops to ${Math.round(r.peakKw)} kW with the expansion. Room to grow.`);
    }
  },

  endMonth: () => {
    const { draft, committed, toast } = get();
    const scenario = { ...draft, expansion: true, projects: committed.projects, season: committed.season };
    const r = simulate(scenario);
    if (r.congested) {
      toast('error', 'The grid operator will not approve a congested plan. Adjust the deals first.');
      return;
    }
    const before = simulate(committed);
    const c = creditsFor(scenario);
    set((s) => ({
      committed: scenario,
      draft: scenario,
      credits: s.credits + c.credits,
      badges: [...s.badges, 'First Handshake'],
      step: 'committed',
      showCurve: false,
      clockRunning: true,
      selected: null,
      lastReport: { ...c, peakBefore: before.peakKw, peakAfter: r.peakKw, batteryKw: r.batteryKw, batteryMode: scenario.battery ?? 'standby' },
    }));
    setTimeout(() => toast('badge', 'Badge earned: First Handshake'), 900);
  },

  buyProject: (id) => {
    const p = PROJECTS.find((x) => x.id === id);
    const { credits, committed, toast } = get();
    if (!p || credits < p.cost) return;
    const scenario = { ...committed, projects: [...committed.projects, id] };
    set({ credits: credits - p.cost, committed: scenario, draft: scenario, step: 'month2' });
    toast('success', id === 'heatnet' ? 'Heat network built: 180 homes off gas.' : 'Second battery module installed: 600 kW / 1,200 kWh.');
  },

  startMonth2: () => {
    const season = seasonOfMonth(2);
    set((s) => ({ month: 2, step: 'explore', selected: null, season, draft: { ...s.draft, season }, committed: { ...s.committed, season } }));
    get().toast('info', 'Month 2 — Drenthe Logistiek wants 10 more e-trucks (+200 kW). Help them.');
  },

  toast: (kind, text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setShowCurve: (showCurve) => set({ showCurve }),
  restart: () => set({ ...initial(), step: 'title' }),
}));

export const buildingById = (id: string) => BUILDINGS.find((b) => b.id === id)!;
