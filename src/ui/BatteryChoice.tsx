import { BATTERY, PEAK_TARIFF, PEAK_TARIFF_NEXT_YEAR, type BatteryMode } from '../data/park';
import { useGame } from '../store/game';

function BankArt() {
  return (
    <svg viewBox="0 0 160 110" className="card-art">
      <defs>
        <linearGradient id="coin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD86B" /><stop offset="1" stopColor="#E0A33B" /></linearGradient>
      </defs>
      {/* battery */}
      <rect x={14} y={30} width={44} height={66} rx={8} fill="#E9EEF5" stroke="#9aa3b2" strokeWidth={2} />
      <rect x={26} y={22} width={20} height={10} rx={3} fill="#9aa3b2" />
      <rect x={20} y={62} width={32} height={28} rx={4} fill="#3DBE6E" />
      <rect x={20} y={46} width={32} height={12} rx={4} fill="#3DBE6E" opacity={0.6} />
      {/* arrow */}
      <path d="M66 62 L92 62" stroke="#1f2937" strokeWidth={3} strokeLinecap="round" />
      <path d="M86 54 L94 62 L86 70" fill="none" stroke="#1f2937" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* coin stack */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx={122} cy={92 - i * 11} rx={24} ry={8} fill="url(#coin)" stroke="#b7791f" strokeWidth={1.5} />
        </g>
      ))}
      <ellipse cx={122} cy={59} rx={24} ry={8} fill="#FFE59A" stroke="#b7791f" strokeWidth={1.5} />
      <text x={122} y={63} textAnchor="middle" fontSize={11} fontWeight={800} fill="#8a5a0f">◎</text>
      <text x={122} y={30} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1a8a46">−kW-max</text>
    </svg>
  );
}

function GrowArt() {
  return (
    <svg viewBox="0 0 160 110" className="card-art">
      {/* battery */}
      <rect x={14} y={30} width={44} height={66} rx={8} fill="#E9EEF5" stroke="#9aa3b2" strokeWidth={2} />
      <rect x={26} y={22} width={20} height={10} rx={3} fill="#9aa3b2" />
      <rect x={20} y={62} width={32} height={28} rx={4} fill="#3DBE6E" />
      <rect x={20} y={46} width={32} height={12} rx={4} fill="#3DBE6E" opacity={0.6} />
      {/* arrow */}
      <path d="M66 62 L92 62" stroke="#1f2937" strokeWidth={3} strokeLinecap="round" />
      <path d="M86 54 L94 62 L86 70" fill="none" stroke="#1f2937" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* factory with new hall */}
      <rect x={98} y={60} width={34} height={36} fill="#C96A3B" />
      <polygon points="98,60 109,48 120,60 131,48 132,60" fill="#8f4a28" />
      <rect x={124} y={44} width={6} height={20} fill="#6b7280" />
      <rect x={132} y={70} width={22} height={26} fill="#3DBE6E" opacity={0.85} stroke="#1a8a46" strokeWidth={1.5} strokeDasharray="3 2" />
      <polygon points="132,70 143,60 154,70" fill="#2ea35c" opacity={0.85} />
      <text x={143} y={88} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff">+kW</text>
      <text x={126} y={30} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1a8a46">+headroom</text>
      <circle cx={127} cy={56} r={2} fill="#FFD36E" /><circle cx={110} cy={72} r={2} fill="#FFD36E" /><circle cx={118} cy={84} r={2} fill="#FFD36E" />
    </svg>
  );
}

export default function BatteryChoice() {
  const { batteryChoiceOpen, closeBatteryChoice, setBattery, draft, setBatterySolar, committed } = useGame();
  if (!batteryChoiceOpen) return null;
  const modules = committed.projects.includes('battery') ? 2 : 1;
  const kw = Math.round((BATTERY.kwh * modules * BATTERY.efficiency) / BATTERY.dischargeHours.length);
  const saved = Math.round(kw * PEAK_TARIFF);
  const savedNext = Math.round(kw * PEAK_TARIFF_NEXT_YEAR);
  const pick = (m: BatteryMode) => { setBattery(m); closeBatteryChoice(); };
  const solar = !!draft.batterySolar;
  return (
    <div className="intro" onClick={closeBatteryChoice}>
      <div className="intro-card wide battery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Energiecoöperatie Stroomwal · community battery {BATTERY.kw * modules} kW / {BATTERY.kwh * modules} kWh</div>
        <h1>How do you play the battery?</h1>
        <p className="lead">It discharges {kw} kW during the evening peak either way. The question is what the hub does with that room.</p>
        <div className="choice-grid">
          <button className={`choice ${draft.battery === 'bank' ? 'on' : ''}`} onClick={() => pick('bank')}>
            <BankArt />
            <h3>Bank the savings</h3>
            <p>Lower the park's measured peak and keep the headroom reserved. The hub pays less kW-max charge every month.</p>
            <ul>
              <li>Hub pot <b className="credits">+◎ {saved}</b> every month</li>
              <li><b className="credits">+◎ {savedNext}</b> at next year's tariff (+55%)</li>
              <li>Expansion must be covered by neighbours' flexibility</li>
            </ul>
          </button>
          <button className={`choice ${draft.battery === 'grow' ? 'on' : ''}`} onClick={() => pick('grow')}>
            <GrowArt />
            <h3>Make room to grow</h3>
            <p>Spend the headroom on new activity. The battery's {kw} kW counts toward the capacity Veldman needs to expand.</p>
            <ul>
              <li><b className="ok">+{kw} kW</b> of headroom for the expansion</li>
              <li>Fewer neighbour deals needed</li>
              <li>No kW-max saving from the battery itself</li>
            </ul>
          </button>
        </div>
        <label className="solar-opt">
          <input type="checkbox" checked={solar} onChange={(e) => setBatterySolar(e.target.checked)} />
          Charge on midday solar and wind instead of at night (raises the local energy share)
        </label>
        <div className="modal-foot">
          <button className="link" onClick={() => pick('standby')}>Leave the battery idle</button>
          <button className="link" onClick={closeBatteryChoice}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
