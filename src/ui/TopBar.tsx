import { useMemo } from 'react';
import { GRID_LIMIT_KW, SEASONS, SEASON_LABEL } from '../data/park';
import { creditsFor, EMPTY_SCENARIO, fmtHour, simulate } from '../sim/simulate';
import { useGame } from '../store/game';

export default function TopBar() {
  const { hour, committed, credits, month, clockRunning, toggleClock, setHour, testResult, step, badges, season, setSeason } = useGame();
  const seasonLocked = step === 'negotiate' || step === 'tested';
  const sim = useMemo(() => simulate(committed), [committed]);
  const shown = step === 'tested' && testResult ? testResult : sim;
  const base = useMemo(() => simulate({ ...EMPTY_SCENARIO, season }), [season]);
  const impact = useMemo(() => {
    const c = creditsFor(committed);
    const peakCut = Math.round((1 - sim.peakKw / base.peakKw) * 100);
    const co2 = c.dieselAvoided * 60 + sim.co2Tons;
    const homes = committed.projects.includes('heatnet') ? 180 : 0;
    return { peakCut, co2, homes, community: sim.communityScore };
  }, [committed, sim, base]);
  const kw = shown.hourly[hour];
  const pct = kw / GRID_LIMIT_KW;
  const level = pct > 1 ? 'red' : pct > 0.85 ? 'amber' : 'green';

  return (
    <div className="topbar">
      <div className="clock card" onClick={toggleClock} title="Click to pause / play the day">
        <svg viewBox="0 0 64 64" width={52} height={52}>
          <circle cx={32} cy={32} r={29} fill="#fff" stroke="#e5e7eb" strokeWidth={3} />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} cx={32 + Math.cos(a) * 25} cy={32 + Math.sin(a) * 25} r={i % 6 === 0 ? 1.8 : 1} fill={i >= 16 && i < 20 ? '#E5484D' : '#9ca3af'} />;
          })}
          <line x1={32} y1={32} x2={32 + Math.cos((hour / 24) * Math.PI * 2 - Math.PI / 2) * 21} y2={32 + Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2) * 21} stroke="#111827" strokeWidth={3} strokeLinecap="round" />
          <circle cx={32} cy={32} r={3} fill="#111827" />
        </svg>
        <div>
          <div className="big">{fmtHour(hour)}</div>
          <div className="muted">{clockRunning ? 'weekday ▶' : 'paused ⏸'}</div>
        </div>
        <div className="seasons" onClick={(e) => e.stopPropagation()} title={seasonLocked ? 'Finish the month first' : 'Change season'}>
          {SEASONS.map((sn) => (
            <button key={sn} className={`season ${season === sn ? 'on' : ''}`} disabled={seasonLocked} onClick={() => setSeason(sn)}>
              {{ winter: '❄', spring: '🌱', summer: '☀', autumn: '🍂' }[sn]} <span>{SEASON_LABEL[sn]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`meter card ${level}`}>
        <div className="meter-head">
          <span>Shared connection · Enexis feeder</span>
          <span className="big">{Math.round(kw).toLocaleString()} / {GRID_LIMIT_KW.toLocaleString()} kW</span>
        </div>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${Math.min(100, pct * 100)}%` }} />
          <div className="meter-limit" />
          {pct > 1 && <div className="meter-over" style={{ width: `${Math.min(12, (pct - 1) * 100)}%` }} />}
        </div>
        <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="hour-slider" aria-label="hour of day" />
        <div className="meter-foot">
          <span>{Math.round(pct * 100)}% at {fmtHour(hour)} · kW-max charge <b className="credits">◎ {shown.peakCharge}</b>/month <span title="Next year's kW-max tariff is 55% higher">(next year ◎ {shown.peakChargeNextYear})</span></span>
          <span>{shown.congested ? `⚠ ${shown.feedIn ? 'feed-in' : 'congested'} ${shown.congestedHours.map(fmtHour).join(', ')}` : '✓ under the limit all day'}</span>
        </div>
      </div>

      <div className="impact card">
        <div className="eyebrow">Community impact · est.</div>
        <div className="impact-grid">
          <div><span>Peak cut</span><b className={impact.peakCut > 0 ? 'ok' : ''}>{impact.peakCut > 0 ? `−${impact.peakCut}%` : '0%'}</b></div>
          <div><span>CO₂ avoided</span><b className={impact.co2 > 0 ? 'ok' : ''}>{impact.co2} t/yr</b></div>
          <div><span>Homes off gas</span><b className={impact.homes > 0 ? 'ok' : ''}>{impact.homes}</b></div>
          <div><span>Local energy</span><b className="ok">{Math.round(sim.localShare * 100)}%</b></div>
          <div><span>Community</span><b className={impact.community > 0 ? 'ok' : ''}>+{impact.community}</b></div>
        </div>
      </div>
      <div className="stats card">
        <div><div className="muted">Credits</div><div className="big credits">◎ {credits}</div></div>
        <div><div className="muted">Month</div><div className="big">{month}/12</div></div>
        <div><div className="muted">Badges</div><div className="big">{badges.length ? '🏅'.repeat(badges.length) : '—'}</div></div>
      </div>
    </div>
  );
}
