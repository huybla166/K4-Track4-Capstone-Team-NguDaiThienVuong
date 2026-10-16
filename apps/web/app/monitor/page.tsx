"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EarMarChart } from "@/components/charts/ear-mar-chart";
import { Controls } from "@/components/controls/controls";
import { DriverStatus } from "@/components/driver-status/driver-status";
import { RiskMeter } from "@/components/risk-meter/risk-meter";
import { VideoFeed } from "@/components/video-feed/video-feed";
import { EventTable } from "@/components/monitor/event-table";
import { RiskTimeline } from "@/components/monitor/risk-timeline";
import { SystemHealth } from "@/components/monitor/system-health";
import { useTelemetry } from "@/lib/useTelemetry";
import { useRiskHistory } from "@/lib/useRiskHistory";
import { activeReasons } from "@/lib/reasons";
import { useAlertStage } from "@/lib/useAlertStage";
import { useAlertSound } from "@/lib/useAlertSound";
import "./monitor.css";

export default function MonitorPage() {
  const { telemetry, connected, history } = useTelemetry();
  const { points, events } = useRiskHistory(telemetry);
  const [now, setNow] = useState(0);
  // Âm thanh ở trang giám sát tắt mặc định, để không kêu trùng với màn hình tài xế
  const [soundOn, setSoundOn] = useState(false);
  const stage = useAlertStage(telemetry?.risk_level ?? "NORMAL", telemetry?.muted ?? false, connected, telemetry?.calibrated ?? false);
  useAlertSound(stage, soundOn);
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = setInterval(update, 1000); return () => clearInterval(timer); }, []);
  return <main className="monitor-page"><div className="monitor-content app-stagger">
    <AppHeader page="Giám sát" connected={connected} links={[{ href: "/", label: "Màn hình tài xế" }, { href: "/camera", label: "Camera" }]}/>
    <div className="monitor-top">
      <VideoFeed active={connected}/>
      <div className="monitor-now">
        {telemetry
          ? <RiskMeter score={telemetry.risk_score} level={telemetry.risk_level} muted={telemetry.muted} reasons={activeReasons(telemetry)}/>
          : <section className="monitor-panel monitor-empty"><h2 className="monitor-panel-title">Bây giờ</h2><p>Đang chờ dữ liệu từ AI worker. Kiểm tra kết nối và camera.</p></section>}
        <Controls disabled={!connected} soundOn={soundOn} onSoundChange={setSoundOn}/>
      </div>
    </div>
    <div className="monitor-pair">
      {telemetry ? <DriverStatus t={telemetry}/> : <section className="monitor-panel monitor-empty"><h2 className="monitor-panel-title">Tín hiệu tài xế</h2><p>Chưa có dữ liệu.</p></section>}
      <EarMarChart history={history}/>
    </div>
    <RiskTimeline points={points} events={events} now={now}/>
    <EventTable/>
    <SystemHealth telemetry={telemetry} connected={connected}/>
  </div></main>;
}
