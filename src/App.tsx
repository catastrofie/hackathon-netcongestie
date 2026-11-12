import { useEffect } from 'react';
import IsoMap from './map/IsoMap';
import { useGame } from './store/game';
import LoadCurve from './ui/LoadCurve';
import { Intro, Objective, Toasts } from './ui/Overlays';
import SidePanel from './ui/SidePanel';
import TopBar from './ui/TopBar';

export default function App() {
  const tick = useGame((s) => s.tick);
  const restart = useGame((s) => s.restart);
  useEffect(() => {
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div className="app">
      <TopBar />
      <div className="main">
        <div className="stage">
          <IsoMap />
          <Objective />
          <LoadCurve />
        </div>
        <aside className="side">
          <SidePanel />
          <button className="link restart" onClick={restart}>↺ restart demo</button>
        </aside>
      </div>
      <Toasts />
      <Intro />
    </div>
  );
}
