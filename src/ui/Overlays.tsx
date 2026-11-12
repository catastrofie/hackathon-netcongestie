import { useGame } from '../store/game';

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismissToast(t.id)}>
          {t.kind === 'error' ? '⛔ ' : t.kind === 'success' ? '✅ ' : t.kind === 'badge' ? '🏅 ' : 'ℹ️ '}
          {t.text}
        </div>
      ))}
    </div>
  );
}

const OBJECTIVES: Record<string, string> = {
  explore: 'Click Veldman Metaal and request the expansion.',
  refused: 'Free 400 kW at the evening peak. Open the Hub Table.',
  negotiate: 'Assemble a package of offers, then Test scenario.',
  tested: 'If the curve stays under the red line: sign and end the month.',
  committed: 'Reinvest your Hub Credits in a shared project.',
  reinvest: 'Reinvest your Hub Credits in a shared project.',
  month2: 'Project built. Start Month 2.',
};

export function Objective() {
  const { step, month } = useGame();
  if (step === 'intro') return null;
  const text = month === 2 ? 'Month 2: Drenthe Logistiek wants +200 kW for 10 e-trucks. Help them.' : OBJECTIVES[step];
  return (
    <div className="objective">
      <span className="eyebrow">Objective</span>
      <span>{text}</span>
    </div>
  );
}

export function Intro() {
  const { step, setStep } = useGame();
  if (step !== 'intro') return null;
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="eyebrow">Hackathon prototype · Track 3 · Provincie Drenthe</div>
        <h1>Growth Within Limits</h1>
        <p className="lead">A playable digital twin of an energy hub. The grid connection is full. The only way to grow is together.</p>
        <ul>
          <li><b>Spot</b> where the shared connection pinches</li>
          <li><b>Negotiate</b> flexibility with your neighbours</li>
          <li><b>Test</b> the deal in the twin before you sign</li>
          <li><b>Earn</b> credits and <b>reinvest</b> them in the park</li>
        </ul>
        <button className="primary big-btn" onClick={() => setStep('explore')}>▶ Play Month 1: “Room to grow”</button>
        <div className="muted small">Simulated twin with a fictional park. Neighbours are scripted. No real data.</div>
      </div>
    </div>
  );
}
