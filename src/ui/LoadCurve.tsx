import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID_LIMIT_KW } from '../data/park';
import { creditsFor, fmtHour, simulate } from '../sim/simulate';
import { useGame } from '../store/game';

export default function LoadCurve() {
  const { committed, testResult, showCurve, setShowCurve, hour, setHour, draft } = useGame();
  const preview = useMemo(() => (testResult ? creditsFor({ ...draft, expansion: true }) : null), [draft, testResult]);
  const before = useMemo(() => simulate(committed), [committed]);
  const data = before.hourly.map((v, h) => ({ h, label: fmtHour(h), before: Math.round(v), gen: Math.round(before.generation[h]), gross: Math.round(before.gross[h]), after: testResult ? Math.round(testResult.hourly[h]) : undefined }));
  const seasonName = { winter: 'winter', spring: 'spring', summer: 'summer', autumn: 'autumn' }[committed.season ?? 'winter'];

  return (
    <div className={`drawer ${showCurve ? 'open' : ''}`}>
      <button className="drawer-tab" onClick={() => setShowCurve(!showCurve)}>
        📈 24-hour load curve {showCurve ? '▾' : '▴'}
      </button>
      {showCurve && (
        <div className="drawer-body">
          <div className="drawer-legend">
            <span className="local-share">☀ Locally produced: <b>{Math.round(before.localShare * 100)}%</b> of today's consumption · {Math.round(before.selfConsumed * 100)}% self-consumed · {seasonName} day</span>
            <span><i style={{ background: '#F2C14E' }} /> Solar + wind</span>
            <span><i style={{ background: '#9ca3af' }} /> From the grid (net)</span>
            {testResult && <span><i style={{ background: testResult.congested ? '#E5484D' : '#3DBE6E' }} /> With deals + expansion</span>}
            <span><i style={{ background: '#E5484D', height: 2 }} /> 2,000 kW limit</span>
            <span className="muted">Click the chart to move the day clock</span>
          </div>
          {testResult && preview && (
            <div className="preview">
              <div><span>Peak</span><b>{Math.round(before.peakKw)} → {Math.round(testResult.peakKw)} kW</b></div>
              <div><span>Freed at {fmtHour(before.peakHour)}</span><b>{preview.freedKw} kW</b></div>
              <div><span>Expansion</span><b className={testResult.congested ? 'bad' : 'ok'}>{testResult.congested ? 'blocked' : 'fits ✓'}</b></div>
              {testResult.batteryKw > 0 && <div><span>Battery</span><b>−{testResult.batteryKw} kW</b></div>}
              <div><span>kW-max saved</span><b className="credits">◎ {preview.peakSaved}/mo <span className="muted">(◎ {preview.peakSavedNextYear} next yr)</span></b></div>
              <div><span>Credits if signed</span><b className="credits">◎ {testResult.congested ? 0 : preview.credits}</b></div>
              <div><span>Diesel avoided</span><b>{testResult.congested ? '—' : '1 · 60 t CO₂/yr'}</b></div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} onClick={(e) => e && e.activeLabel != null && setHour(Number(String(e.activeLabel).slice(0, 2)))}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis domain={[0, 2400]} tick={{ fontSize: 11 }} width={44} />
              <Tooltip formatter={(v) => [`${v} kW`]} labelFormatter={(l) => `${l}`} />
              <ReferenceLine y={GRID_LIMIT_KW} stroke="#E5484D" strokeWidth={2} strokeDasharray="6 4" />
              <Area type="monotone" dataKey="gen" stroke="#E0A33B" fill="#F2C14E" fillOpacity={0.55} strokeWidth={1.5} isAnimationActive={false} />
              <ReferenceLine x={fmtHour(hour)} stroke="#111827" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="before" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
              {testResult && <Area type="monotone" dataKey="after" stroke={testResult.congested ? '#E5484D' : '#3DBE6E'} fill={testResult.congested ? '#E5484D' : '#3DBE6E'} fillOpacity={0.25} strokeWidth={3} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
