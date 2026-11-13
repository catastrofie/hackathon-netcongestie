import { useEffect } from 'react';
import IsoMap from './map/IsoMap';
import { useGame } from './store/game';
import LoadCurve from './ui/LoadCurve';
import { Intro, Objective, Refusal, RolePick, Title, Toasts } from './ui/Overlays';
import ReinvestChoice from './ui/ReinvestChoice';
import SidePanel from './ui/SidePanel';
import BatteryChoice from './ui/BatteryChoice';
import TopBar from './ui/TopBar';

export default function App() {
  const tick = useGame((s) => s.tick);
  const restart = useGame((s) => s.restart);
  const step = useGame((s) => s.step);
  const cinema = step === 'title' || step === 'role';
  useEffect(() => {
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div className={`app ${cinema ? 'cinema' : ''}`}>
      <TopBar />
      <div className="main">
        <div className="stage">
          <IsoMap />
          <Objective />
          <Refusal />
          <LoadCurve />
          <SidePanel />
          <button className="link restart" onClick={restart}>↺ restart demo</button>
        </div>
      </div>
      <Toasts />
      <BatteryChoice />
      <ReinvestChoice />
      <Intro />
      <RolePick />
      <Title />
    </div>
  );
}
