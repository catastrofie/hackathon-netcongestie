// The whole world of Bedrijvenpark De Stroomwal.
// All figures are fictional but in realistic proportion for a mid-size Drenthe business park.
// Loads are kW per hour of a winter weekday (index 0 = 00:00-01:00).

export type BuildingType =
  | 'factory'
  | 'coldstore'
  | 'logistics'
  | 'bakery'
  | 'greenhouse'
  | 'community'
  | 'substation';

export interface FlexOffer {
  label: string;
  detail: string;
  from: number[]; // hours load is removed from
  to: number[]; // hours load is added to (energy conserved)
  maxKw: number;
  defaultKw: number;
  counterAsk: string;
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  tile: [number, number];
  footprint: [number, number];
  color: string;
  load: number[]; // 24 values, kW
  solarKwp: number;
  flex?: FlexOffer;
  wants: string;
  tagline: string;
}

export interface Project {
  id: string;
  name: string;
  cost: number;
  description: string;
  communityScore: number;
  co2Tons: number;
}

const flat = (v: number) => Array(24).fill(v) as number[];
const profile = (base: number, overrides: Record<string, number>) => {
  const arr = flat(base);
  for (const [range, v] of Object.entries(overrides)) {
    const [a, b] = range.split('-').map(Number);
    for (let h = a; h <= (b ?? a); h++) arr[h] = v;
  }
  return arr;
};

export const GRID_LIMIT_KW = 2000;
export const PEAK_HOUR = 17;

// Winter solar yield per kWp, fraction of nameplate, by hour.
export const SOLAR_PROFILE = [
  0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.1, 0.2, 0.28, 0.3, 0.3, 0.25, 0.15, 0.05, 0, 0, 0, 0, 0, 0, 0,
];

export const EXPANSION = { id: 'veldman', extraKw: 300, hours: [8, 19] as [number, number] };

export const BUILDINGS: Building[] = [
  {
    id: 'veldman',
    name: 'Veldman Metaal',
    type: 'factory',
    tile: [0.4, 0.3],
    footprint: [2.2, 1.7],
    color: '#C96A3B',
    tagline: 'Metal fabrication · the company you run',
    load: profile(220, { '5': 260, '6': 420, '7': 560, '8-18': 600, '19': 560, '20': 420, '21': 300, '22': 240 }),
    solarKwp: 0,
    flex: {
      label: 'Shift furnace pre-heat to midday',
      detail: 'Pre-heat the furnaces 12:00–16:00 instead of 16:00–20:00.',
      from: [16, 17, 18, 19],
      to: [12, 13, 14, 15],
      maxKw: 250,
      defaultKw: 130,
      counterAsk: 'Your own decision — no partner needed.',
    },
    wants: 'Expand production hall: +300 kW, 08:00–20:00',
  },
  {
    id: 'koelhuis',
    name: 'Koelhuis Noord',
    type: 'coldstore',
    tile: [4.4, 0.5],
    footprint: [2, 2],
    color: '#5B8DB8',
    tagline: 'Cold storage · 24/7 cold chain',
    load: profile(380, { '8-10': 420, '11-13': 460, '14': 420, '15': 400, '16-19': 480, '20-21': 420 }),
    solarKwp: 200,
    flex: {
      label: 'Pre-cool at midday, coast through the peak',
      detail: 'Run compressors harder 11:00–15:00, then idle 16:00–20:00.',
      from: [16, 17, 18, 19],
      to: [11, 12, 13, 14],
      maxKw: 250,
      defaultKw: 150,
      counterAsk: 'Wants: Veldman backs the cold chain with its furnace shift if the grid is tight.',
    },
    wants: 'Keep its 24/7 cold-chain guarantee',
  },
  {
    id: 'logistiek',
    name: 'Drenthe Logistiek',
    type: 'logistics',
    tile: [0.5, 4],
    footprint: [2, 1.9],
    color: '#E0A33B',
    tagline: 'Distribution centre · 12 e-trucks',
    load: profile(80, { '6-7': 200, '8-10': 260, '11-14': 300, '15': 220, '16-19': 400, '20': 200, '21': 120 }),
    solarKwp: 400,
    flex: {
      label: 'Charge e-trucks at night',
      detail: 'Move truck charging from 16:00–20:00 to 00:00–04:00.',
      from: [16, 17, 18, 19],
      to: [0, 1, 2, 3],
      maxKw: 200,
      defaultKw: 120,
      counterAsk: 'Wants: 2 extra charging slots on the shared connection next month.',
    },
    wants: 'Add 10 more e-trucks (+200 kW)',
  },
  {
    id: 'bakkerij',
    name: 'Bakkerij Smid',
    type: 'bakery',
    tile: [4.4, 4.3],
    footprint: [2, 1.1],
    color: '#B5543F',
    tagline: 'Industrial bakery · ovens run at night',
    load: profile(120, { '1-6': 300, '7': 200, '11-14': 140, '16-19': 160 }),
    solarKwp: 0,
    wants: 'Cheaper energy · 200 kW of waste heat goes up the chimney',
  },
  {
    id: 'kassen',
    name: 'Van der Wal Kassen',
    type: 'greenhouse',
    tile: [7.2, 0.7],
    footprint: [2, 2],
    color: '#7BB661',
    tagline: 'Greenhouse · can absorb waste heat',
    load: profile(60, { '8-10': 120, '11-14': 150, '15': 120, '16-21': 280, '22': 150 }),
    solarKwp: 300,
    wants: 'Lower gas bill · would take waste heat',
  },
  {
    id: 'coop',
    name: 'Energiecoöperatie Stroomwal',
    type: 'community',
    tile: [1.2, 7.4],
    footprint: [6, 1],
    color: '#8E6BB8',
    tagline: '180 households · energy community',
    load: profile(60, { '6-8': 120, '9-15': 95, '16-21': 180, '22': 120 }),
    solarKwp: 350,
    wants: 'Lower bills, warm homes',
  },
  {
    id: 'substation',
    name: 'Enexis MV feeder',
    type: 'substation',
    tile: [7.6, 4.6],
    footprint: [1, 1],
    color: '#6B7280',
    tagline: 'Shared connection · 2,000 kW limit',
    load: flat(0),
    solarKwp: 0,
    wants: 'Stay under 2,000 kW every hour',
  },
];

export const PROJECTS: Project[] = [
  {
    id: 'heatnet',
    name: 'Heat network',
    cost: 100,
    description: 'Pipe Bakkerij Smid’s waste heat to the greenhouse and 180 homes. Replaces gas; frees ~50 kW of greenhouse electric heating.',
    communityScore: 50,
    co2Tons: 400,
  },
  {
    id: 'battery',
    name: 'Community battery 300 kW / 600 kWh',
    cost: 100,
    description: 'Charges on midday solar, discharges 16:00–20:00. Frees ~135 kW at the peak; mostly benefits the companies.',
    communityScore: 15,
    co2Tons: 60,
  },
];

export const NEIGHBOUR_IDS = ['koelhuis', 'logistiek'];
