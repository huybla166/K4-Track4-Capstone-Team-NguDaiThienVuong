"use client";

import { useTelemetry } from "@/lib/useTelemetry";
import { AppHeader } from "@/components/app-header";
import { LiveView } from "@/components/camera/live-view";
import "./camera.css";

export default function CameraPage() {
  const { telemetry, connected } = useTelemetry();

  return (
    <main className="camera-page">
      <div className="camera-content app-stagger">
        <AppHeader
          page="Camera"
          connected={connected}
          links={[
            { href: "/", label: "Màn hình tài xế" },
            { href: "/monitor", label: "Giám sát" },
          ]}
        />

        <LiveView telemetry={telemetry} connected={connected} />

        <footer className="camera-footer">
          <p className="camera-caption">
            Hình có chú thích nhận diện từ AI worker. Không lưu hình.
          </p>
        </footer>
      </div>
    </main>
  );
}
