import { create } from 'zustand';
import { BUILDINGS, PROJECTS } from '../data/park';
import { creditsFor, EMPTY_SCENARIO, simulate, type Scenario, type SimResult } from '../sim/simulate';

export type MissionStep =
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
  draft: Scenario; // what the player is assembling at the hub table
  committed: Scenario; // the state of the park after the last end-of-month
  testResult: SimResult | null;
  toasts: Toast[];
  showCurve: boolean;
  lastReport: { credits: number; freedKw: number; dieselAvoided: number; peakBefore: number; peakAfter: number } | null;

  // actions
  setHour: (h: number) => void;
  tick: () => void;
  toggleClock: () => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setStep: (s: MissionStep) => void;
  requestExpansion: () => void;
  openHub: () => void;
  setDeal: (id: string, kw: number) => void;
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
  step: 'intro' as MissionStep,
  draft: { ...EMPTY_SCENARIO, deals: {} },
  committed: { ...EMPTY_SCENARIO, deals: {} },
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

  requestExpansion: () => {
    const { committed, toast } = get();
    const r = simulate({ ...committed, expansion: true });
    const now = simulate(committed);
    if (r.congested) {
      toast('error', `Connection request refused: feeder already at ${Math.round(now.utilisation * 100)}% at ${String(now.peakHour).padStart(2, '0')}:00; with +300 kW it would hit ${Math.round(r.utilisation * 100)}%. Queue position: 2029.`);
      set({ step: 'refused', hour: r.peakHour, clockRunning: false });
    } else {
      toast('success', 'Expansion approved.');
    }
  },

  openHub: () => set({ step: 'negotiate', selected: null, showCurve: false }),

  setDeal: (id, kw) =>
    set((s) => ({ draft: { ...s.draft, deals: { ...s.draft.deals, [id]: kw } }, testResult: null })),

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
    const scenario = { ...draft, expansion: true, projects: committed.projects };
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
      lastReport: { ...c, peakBefore: before.peakKw, peakAfter: r.peakKw },
    }));
    setTimeout(() => toast('badge', 'Badge earned: First Handshake'), 900);
  },

  buyProject: (id) => {
    const p = PROJECTS.find((x) => x.id === id);
    const { credits, committed, toast } = get();
    if (!p || credits < p.cost) return;
    const scenario = { ...committed, projects: [...committed.projects, id] };
    set({ credits: credits - p.cost, committed: scenario, draft: scenario, step: 'month2' });
    toast('success', id === 'heatnet' ? 'Heat network built: 180 homes off gas.' : 'Community battery installed.');
  },

  startMonth2: () => {
    set({ month: 2, step: 'explore', selected: null });
    get().toast('info', 'Month 2 — Drenthe Logistiek wants 10 more e-trucks (+200 kW). Help them.');
  },

  toast: (kind, text) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setShowCurve: (showCurve) => set({ showCurve }),
  restart: () => set({ ...initial(), step: 'explore' }),
}));

export const buildingById = (id: string) => BUILDINGS.find((b) => b.id === id)!;
