import React, { useMemo } from 'react';
import { BATTERY, BATTERY_MODES, NEIGHBOUR_IDS, PEAK_TARIFF, PEAK_TARIFF_NEXT_YEAR, PROJECTS, GRID_LIMIT_KW } from '../data/park';
import { fmtHour, simulate } from '../sim/simulate';
import { buildingById, useGame } from '../store/game';

function BuildingCard() {
  const { selected, hour, committed, step, requestExpansion, openHub, select } = useGame();
  const sim = useMemo(() => simulate(committed), [committed]);
  if (!selected) return null;
  const b = buildingById(selected);
  const kwNow = Math.round(sim.perBuilding[b.id][hour]);
  const peak = Math.round(Math.max(...sim.perBuilding[b.id]));
  const deal = committed.deals[b.id] ?? 0;
  const isPlayer = b.id === 'veldman';
  return (
    <div className="panel">
      <div className="panel-head" style={{ borderColor: b.color }}>
        <div>
          <div className="eyebrow">{isPlayer ? 'Your company' : b.type === 'substation' ? 'Grid' : 'Neighbour'}</div>
          <h2>{b.name}</h2>
          <div className="muted">{b.tagline}</div>
        </div>
        <button className="icon" onClick={() => select(null)} aria-label="close">✕</button>
      </div>
      <div className="kv">
        <div><span className="muted">Load now ({fmtHour(hour)})</span><b>{kwNow} kW</b></div>
        <div><span className="muted">Daily peak</span><b>{peak} kW</b></div>
        {b.solarKwp > 0 && <div><span className="muted">Own solar</span><b>{b.solarKwp} kWp</b></div>}
        {b.id === 'substation' && <div><span className="muted">Limit</span><b>{GRID_LIMIT_KW} kW / hour</b></div>}
      </div>
      <div className="block">
        <div className="eyebrow">Wants</div>
        <div>{b.wants}</div>
      </div>
      {b.flex && (
        <div className="block offer">
          <div className="eyebrow">Can offer</div>
          <div><b>{b.flex.label}</b></div>
          <div className="muted">{b.flex.detail}</div>
          <div className="muted">Frees up to <b>{b.flex.maxKw} kW</b> {fmtHour(b.flex.from[0])}–{fmtHour(b.flex.from[b.flex.from.length - 1] + 1)}</div>
          {deal > 0 && <div className="pill green">Deal signed · {deal} kW</div>}
        </div>
      )}
      {b.id === 'bakkerij' && <div className="block offer"><div className="eyebrow">Can offer</div><b>200 kW waste heat</b><div className="muted">Currently goes up the chimney. Heat does not free grid capacity, but it replaces gas next door.</div></div>}
      {isPlayer && !committed.expansion && (
        <div className="actions">
          <button className="primary" onClick={requestExpansion}>🏗 Expand production hall (+300 kW)</button>
          {step === 'refused' && <button className="secondary" onClick={openHub}>🤝 Open the Hub Table</button>}
        </div>
      )}
      {isPlayer && committed.expansion && <div className="pill green">Expansion built · +300 kW</div>}
      {!isPlayer && NEIGHBOUR_IDS.includes(b.id) && step !== 'explore' && step !== 'intro' && !committed.expansion && (
        <div className="actions"><button className="secondary" onClick={openHub}>🤝 Negotiate at the Hub Table</button></div>
      )}
    </div>
  );
}

function HubTable() {
  const { draft, setDeal, setBattery, testScenario, testResult, endMonth, step, select, committed } = useGame();
  const parties = ['koelhuis', 'logistiek', 'veldman'].map(buildingById);
  const modules = committed.projects.includes('battery') ? 2 : 1;
  const batteryKw = (draft.battery ?? 'standby') === 'standby' ? 0 : Math.round((BATTERY.kwh * modules * BATTERY.efficiency) / BATTERY.dischargeHours.length);
  const freed = parties.reduce((a, b) => a + (draft.deals[b.id] ?? 0), 0) + batteryKw;
  const ok = testResult && !testResult.congested;
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Hub Table · Month 1</div>
          <h2>Find 400 kW at the evening peak</h2>
          <div className="muted">Every offer moves load to another hour. Test before you sign.</div>
        </div>
      </div>
      {parties.map((b) => {
        const f = b.flex!;
        const kw = draft.deals[b.id] ?? 0;
        return (
          <div key={b.id} className={`offer-card ${kw > 0 ? 'on' : ''}`} style={{ borderLeftColor: b.color }}>
            <div className="offer-top">
              <div>
                <b>{b.name}</b>
                <div className="muted">{f.label}</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={kw > 0} onChange={(e) => setDeal(b.id, e.target.checked ? f.defaultKw : 0)} />
                <span />
              </label>
            </div>
            {kw > 0 && (
              <div className="slider-row">
                <input type="range" min={50} max={f.maxKw} step={10} value={kw} onChange={(e) => setDeal(b.id, Number(e.target.value))} />
                <span className="kw">−{kw} kW at peak → +{kw} kW {fmtHour(f.to[0])}–{fmtHour(f.to[f.to.length - 1] + 1)}</span>
              </div>
            )}
            <div className="counter">{f.counterAsk}</div>
            <button className="link" onClick={() => select(b.id)}>inspect building</button>
          </div>
        );
      })}
      <div className="offer-card battery" style={{ borderLeftColor: '#8E6BB8' }}>
        <div className="offer-top">
          <div>
            <b>Energiecoöperatie Stroomwal</b>
            <div className="muted">Community battery {BATTERY.kw * modules} kW / {BATTERY.kwh * modules} kWh · owned by all members</div>
          </div>
          <span className="pill purple">🔋 {batteryKw > 0 ? `−${batteryKw} kW at peak` : 'idle'}</span>
        </div>
        <div className="modes">
          {BATTERY_MODES.map((m) => (
            <label key={m.id} className={`mode ${(draft.battery ?? 'standby') === m.id ? 'on' : ''}`}>
              <input type="radio" name="battery" checked={(draft.battery ?? 'standby') === m.id} onChange={() => setBattery(m.id)} />
              <b>{m.label}</b>
              <span>{m.detail}</span>
            </label>
          ))}
        </div>
        <div className="counter">Wants: 40% of the kW-max charge the companies avoid flows back to the cooperative. Usage is metered per member.</div>
      </div>
      <div className="sum">
        <span>Freed at 17:00</span>
        <b className={freed >= 400 ? 'ok' : ''}>{freed} / 400 kW</b>
      </div>
      <div className="actions">
        <button className="secondary" onClick={testScenario} disabled={freed === 0}>📈 Test scenario</button>
        <button className="primary" onClick={endMonth} disabled={!ok || step !== 'tested'}>✅ Sign deals & end month</button>
      </div>
      {testResult && (
        <div className={`result ${ok ? 'good' : 'bad'}`}>
          {ok
            ? `Peak ${Math.round(testResult.peakKw)} kW at ${fmtHour(testResult.peakHour)} (${Math.round(testResult.utilisation * 100)}%). Expansion fits.`
            : `Congested at ${testResult.congestedHours.map(fmtHour).join(', ')} (${Math.round(testResult.peakKw)} kW). Capacity moved, it didn't disappear — ease off a slider.`}
        </div>
      )}
    </div>
  );
}

function TurnReport() {
  const { lastReport, credits, buyProject, setStep, badges, role, vote, castVote } = useGame();
  if (!lastReport) return null;
  const community = role === 'community';
  return (
    <div className="panel report">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Month 1 · Turn report</div>
          <h2>Room to grow — achieved</h2>
        </div>
      </div>
      <table>
        <tbody>
          <tr><td>Peak at 17:00</td><td><b>{Math.round(lastReport.peakBefore)} → {Math.round(lastReport.peakAfter)} kW</b></td></tr>
          <tr><td>Expansion</td><td><b className="ok">Approved · +300 kW</b></td></tr>
          <tr><td>Capacity freed</td><td><b>{lastReport.freedKw} kW{lastReport.batteryKw ? ` (battery ${lastReport.batteryKw})` : ''}</b></td></tr>
          <tr><td>kW-max charge avoided</td><td><b className="credits">◎ {lastReport.peakSaved}</b> <span className="muted">/month</span></td></tr>
          <tr><td>…at next year's tariff (+55%)</td><td><b className="credits">◎ {lastReport.peakSavedNextYear}</b> <span className="muted">/month</span></td></tr>
          <tr><td>Diesel generator avoided</td><td><b>{lastReport.dieselAvoided} · ~60 t CO₂/yr</b></td></tr>
          <tr><td>Hub Credits earned</td><td><b className="credits">◎ {lastReport.credits}</b></td></tr>
          <tr><td>Badge</td><td><b>🏅 {badges[badges.length - 1]}</b></td></tr>
        </tbody>
      </table>
      <div className="block">
        <div className="muted" style={{ marginBottom: 8 }}>kW-max tariff: ◎ {PEAK_TARIFF} per kW of monthly peak now, ◎ {PEAK_TARIFF_NEXT_YEAR} next year. Every kW shaved keeps paying.</div>
        <div className="eyebrow">{community ? 'Member vote · what should the hub build?' : 'Reinvest · shared projects'}</div>
        {community && <div className="muted">180 households · 238 members · voting closes at end of month</div>}
        {PROJECTS.map((p) => {
          const share = p.id === 'heatnet' ? 62 : 38;
          return (
            <div key={p.id} className={`project ${vote === p.id ? 'voted' : ''}`}>
              <div>
                <b>{p.name}</b> <span className="muted">◎ {p.cost}</span>
                <div className="muted">{p.description}</div>
                <div className="muted">Community value +{p.communityScore} · {p.co2Tons} t CO₂/yr</div>
                {community && vote && (
                  <div className="votebar"><div style={{ width: `${share}%` }} /><span>{share}%</span></div>
                )}
              </div>
              {community ? (
                <button className="primary small" disabled={!!vote} onClick={() => castVote(p.id)}>{vote === p.id ? 'Voted' : 'Vote'}</button>
              ) : (
                <button className="primary small" disabled={credits < p.cost} onClick={() => buyProject(p.id)}>Build</button>
              )}
            </div>
          );
        })}
      </div>
      <button className="link" onClick={() => setStep('explore')}>skip for now</button>
    </div>
  );
}

function Month2() {
  const { committed, startMonth2 } = useGame();
  const heat = committed.projects.includes('heatnet');
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Project built</div>
          <h2>{heat ? 'Heat network live' : 'Community battery live'}</h2>
        </div>
      </div>
      <p>{heat ? 'Bakkerij Smid’s waste heat now warms the greenhouse and 180 homes. The chimneys in the neighbourhood have stopped; the park gives something back.' : 'The battery shaves 135 kW off the evening peak. The houses still burn gas — the neighbourhood noticed.'}</p>
      <p className="muted">Community value: <b>{heat ? '+50' : '+15'}</b></p>
      <div className="actions"><button className="primary" onClick={startMonth2}>▶ Start Month 2</button></div>
    </div>
  );
}

export default function SidePanel() {
  const { step, selected } = useGame();
  let body: React.ReactNode = null;
  if (step === 'committed' || step === 'reinvest') body = <TurnReport />;
  else if (step === 'month2') body = <Month2 />;
  else if (step === 'negotiate' || step === 'tested') body = selected ? <BuildingCard /> : <HubTable />;
  else if (selected) body = <BuildingCard />;
  return <aside className={`side ${body ? 'open' : ''}`}>{body}</aside>;
}
