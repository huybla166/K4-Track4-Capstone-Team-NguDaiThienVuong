import { API_URL } from "@/lib/api";

export function VideoFeed({ active }: { active: boolean }) {
  return (
    <div className="monitor-video">
      {active ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${API_URL}/api/v1/video/stream?overlay=true`}
          alt="Luồng camera tài xế"
        />
      ) : (
        <p className="monitor-video-empty">Chưa kết nối tới backend…</p>
      )}
    </div>
  );
}
