"""Đo MAR theo pha và so sánh replay có/không có luật ngáp rồi nhắm mắt."""

import csv
import json
import math
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ai.runtime.pipeline import DriverPipeline, FaceObservation, PhoneObservation
from ai.runtime.thresholds import load_thresholds


INPUTS = (
    ROOT / "docs" / "experiments" / "live_session_2.json",
    ROOT / "docs" / "experiments" / "live_session_3.json",
)
OUTPUT_DIR = ROOT / "docs" / "experiments" / "mar_phases"
MAR_THRESHOLDS = (0.30, 0.35, 0.40, 0.45, 0.50)
CSV_FIELDS = (
    "session", "kind", "phase", "phase_occurrence", "frames_total", "face_frames", "mar_frames",
    "mar_p50", "mar_p95", "mar_max", "gt_0_30_pct", "gt_0_35_pct", "gt_0_40_pct",
    "gt_0_45_pct", "gt_0_50_pct",
)
WARNING_EVENTS = {
    "DROWSINESS_ACUTE", "LOOKING_AWAY", "LOOKING_DOWN", "YAWNING", "PHONE_USAGE", "DRIVER_ABSENCE",
}
EXPECTED = {
    "eyes_closed": ({"DROWSINESS_ACUTE"}, ("eyes_closed",)),
    "look_left": ({"LOOKING_AWAY"}, ("looking_away",)),
    "look_right": ({"LOOKING_AWAY"}, ("looking_away",)),
    "look_down": ({"LOOKING_DOWN"}, ("looking_down",)),
    "yawn": ({"YAWNING"}, ("yawning",)),
    "phone": ({"PHONE_USAGE"}, ("phone_detected", "phone_usage")),
    "phone_near_face": ({"PHONE_USAGE"}, ("phone_detected", "phone_usage")),
}


def load_session(path):
    with path.open(encoding="utf-8") as source:
        data = json.load(source)
    marks = [(str(mark["phase"]), float(mark["t"])) for mark in data.get("marks", [])]
    return data, marks


def phase_index_at(timestamp, marks):
    """Khớp replay_live_session.py: chọn mốc cuối không muộn hơn khung hình."""
    selected = None
    for index, (_, marked_at) in enumerate(marks):
        if timestamp >= marked_at:
            selected = index
    return selected


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    low = math.floor(position)
    high = math.ceil(position)
    if low == high:
        return ordered[low]
    return ordered[low] + (ordered[high] - ordered[low]) * (position - low)


def threshold_field(threshold):
    return f"gt_0_{int(threshold * 100):02d}_pct"


def collect_phase_frames(data, marks):
    phase_frames = {index: [] for index in range(len(marks))}
    if not marks:
        return phase_frames
    start = marks[0][1]
    for frame in data.get("frames", []):
        stamp = float(frame["t"])
        if stamp < start:
            continue
        index = phase_index_at(stamp, marks)
        if index is not None and marks[index][0] != "end":
            phase_frames[index].append(frame)
    return phase_frames


def frame_stats(frames):
    face_frames = [frame for frame in frames if bool(frame.get("face_detected"))]
    values = []
    for frame in face_frames:
        try:
            value = float(frame["mar"])
        except (KeyError, TypeError, ValueError):
            continue
        if math.isfinite(value):
            values.append(value)
    result = {
        "frames_total": len(frames),
        "face_frames": len(face_frames),
        "mar_frames": len(values),
        "mar_p50": statistics.median(values) if values else None,
        "mar_p95": percentile(values, 0.95),
        "mar_max": max(values) if values else None,
    }
    for threshold in MAR_THRESHOLDS:
        result[threshold_field(threshold)] = (
            100.0 * sum(value > threshold for value in values) / len(values) if values else None
        )
    return result


def build_mar_rows(loaded):
    rows = []
    combined_groups = {"yawn": [], "non_yawn": []}
    for path, data, marks in loaded:
        session = path.stem
        phase_frames = collect_phase_frames(data, marks)
        occurrences = defaultdict(int)
        session_groups = {"yawn": [], "non_yawn": []}
        for index, (phase, _) in enumerate(marks):
            if phase == "end":
                continue
            occurrences[phase] += 1
            frames = phase_frames[index]
            kind = "yawn" if phase == "yawn" else "non_yawn"
            session_groups[kind].extend(frames)
            combined_groups[kind].extend(frames)
            rows.append({
                "session": session,
                "kind": "phase",
                "phase": phase,
                "phase_occurrence": occurrences[phase],
                **frame_stats(frames),
            })
        for group, frames in session_groups.items():
            rows.append({
                "session": session, "kind": "group", "phase": group,
                "phase_occurrence": "", **frame_stats(frames),
            })
    for group, frames in combined_groups.items():
        rows.append({
            "session": "combined", "kind": "group", "phase": group,
            "phase_occurrence": "", **frame_stats(frames),
        })
    return rows


def fmt_number(value, digits=3):
    return "—" if value is None else f"{value:.{digits}f}"


def fmt_pct(value):
    return "—" if value is None else f"{value:.1f}%"


def render_mar_report(rows, input_paths):
    lines = [
        "# Thống kê MAR theo pha",
        "",
        "Nguồn: " + ", ".join(path.name for path in input_paths) + ".",
        "Chỉ tính MAR trên khung face_detected=true; tỉ lệ vượt ngưỡng dùng số khung có MAR hợp lệ làm mẫu số.",
        "P95 dùng nội suy tuyến tính. Dữ liệu chỉ gồm một người và hai phiên, không đủ để chọn ngưỡng tổng quát.",
        "",
        "| Phiên/pha | Mặt / tổng | MAR p50 | p95 | max | >0,30 | >0,35 | >0,40 | >0,45 | >0,50 |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in rows:
        label = row["session"]
        if row["kind"] == "phase":
            label += f" / {row['phase']}#{row['phase_occurrence']}"
        else:
            label += f" / {row['phase']}"
        rates = [fmt_pct(row.get(threshold_field(t))) for t in MAR_THRESHOLDS]
        lines.append(
            f"| {label} | {row['face_frames']} / {row['frames_total']} | {fmt_number(row['mar_p50'])} "
            f"| {fmt_number(row['mar_p95'])} | {fmt_number(row['mar_max'])} | "
            + " | ".join(rates) + " |"
        )
    return "\n".join(lines) + "\n"


def write_mar_outputs(rows, report):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = OUTPUT_DIR / "mar_phases.csv"
    with csv_path.open("w", newline="", encoding="utf-8-sig") as output:
        writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            csv_row = {}
            for key in CSV_FIELDS:
                value = row.get(key)
                if isinstance(value, (int, float)) and key in {"mar_p50", "mar_p95", "mar_max"}:
                    value = f"{value:.4f}"
                elif isinstance(value, (int, float)) and key.endswith("_pct"):
                    value = f"{value:.3f}"
                csv_row[key] = value
            writer.writerow(csv_row)
    report_path = OUTPUT_DIR / "mar_phases.txt"
    report_path.write_text(report, encoding="utf-8")
    return csv_path, report_path


def truthy(value):
    return value is True or value == 1


def replay_session(path, use_yawn_context):
    data, marks = load_session(path)
    if not marks:
        return {"phases": [], "expected": 0, "correct": 0, "false_alarms": 0, "latencies": []}
    thresholds = load_thresholds()
    # replay_live_session.py chỉ đưa pose vào khi có --pose-fallback.
    thresholds.use_pose_fallback = False
    thresholds.use_yawn_context = use_yawn_context
    pipeline = DriverPipeline(thresholds)
    phase_outputs = {index: [] for index in range(len(marks))}
    start = marks[0][1]
    for frame in data.get("frames", []):
        stamp = float(frame["t"])
        if stamp < start:
            continue
        face = (
            FaceObservation(
                float(frame.get("ear", 0.0)), float(frame.get("mar", 0.0)),
                float(frame.get("yaw", 0.0)), float(frame.get("pitch", 0.0)), 0.0,
            )
            if truthy(frame.get("face_detected")) else None
        )
        telemetry, events = pipeline.update(
            stamp, face, PhoneObservation(bool(frame.get("phone_detected", False)), False),
        )
        index = phase_index_at(stamp, marks)
        if index is not None and marks[index][0] != "end":
            phase_outputs[index].append((stamp, telemetry, events))

    phase_results = []
    all_latencies = []
    false_alarms = correct = expected_count = 0
    occurrences = defaultdict(int)
    for index, (phase, phase_start) in enumerate(marks):
        if phase == "end":
            continue
        occurrences[phase] += 1
        outputs = phase_outputs[index]
        if phase in EXPECTED:
            expected_count += 1
            expected_events, flag_names = EXPECTED[phase]
            signal_times = []
            for stamp, telemetry, events in outputs:
                matches_event = any(event.get("event_type") in expected_events for event in events)
                matches_flag = any(truthy(telemetry.get(name)) for name in flag_names)
                if matches_event or matches_flag:
                    signal_times.append(stamp)
            latency = max(0.0, min(signal_times) - phase_start) if signal_times else None
            detected = latency is not None
            correct += int(detected)
            if detected:
                all_latencies.append(latency)
            phase_results.append({
                "phase": phase, "occurrence": occurrences[phase],
                "detected": detected, "latency": latency,
            })
        else:
            for stamp, _, events in outputs:
                if stamp >= phase_start + 2.0:
                    false_alarms += sum(event.get("event_type") in WARNING_EVENTS for event in events)
    return {
        "phases": phase_results,
        "expected": expected_count,
        "correct": correct,
        "false_alarms": false_alarms,
        "latencies": all_latencies,
        "median_latency": statistics.median(all_latencies) if all_latencies else None,
    }


def fmt_seconds(value):
    return "—" if value is None else f"{value:.2f} s"


def replay_comparison(loaded):
    results = {}
    for path, _, _ in loaded:
        results[path.stem] = {
            False: replay_session(path, False),
            True: replay_session(path, True),
        }

    no_ctx_correct = ctx_correct = expected = no_ctx_false = ctx_false = 0
    no_ctx_latency = []
    ctx_latency = []
    lines = [
        "So sánh replay cùng dữ liệu, cùng pipeline; chỉ khác use_yawn_context.",
        "Pose fallback tắt như ở lệnh replay mặc định. Báo giả đếm event warning sau 2 giây đầu mỗi pha không mục tiêu.",
        "Độ trễ tính từ mốc pha đến cờ/event khớp đầu tiên; các pha lặp cùng tên được tính riêng.",
        "",
    ]
    for session, modes in results.items():
        baseline, contextual = modes[False], modes[True]
        expected += baseline["expected"]
        no_ctx_correct += baseline["correct"]
        ctx_correct += contextual["correct"]
        no_ctx_false += baseline["false_alarms"]
        ctx_false += contextual["false_alarms"]
        no_ctx_latency.extend(baseline["latencies"])
        ctx_latency.extend(contextual["latencies"])
        lines.extend([
            f"## {session}",
            "",
            "| Cấu hình | Pha đúng | Báo giả | Độ trễ trung vị |",
            "|---|---:|---:|---:|",
            f"| Tắt cờ | {baseline['correct']}/{baseline['expected']} | {baseline['false_alarms']} | {fmt_seconds(baseline['median_latency'])} |",
            f"| Bật cờ | {contextual['correct']}/{contextual['expected']} | {contextual['false_alarms']} | {fmt_seconds(contextual['median_latency'])} |",
            "",
            "| Pha mục tiêu | Tắt cờ | Trễ | Bật cờ | Trễ | Δ trễ (bật − tắt) |",
            "|---|---:|---:|---:|---:|---:|",
        ])
        for old, new in zip(baseline["phases"], contextual["phases"]):
            label = f"{old['phase']}#{old['occurrence']}"
            old_status = "đúng" if old["detected"] else "sót"
            new_status = "đúng" if new["detected"] else "sót"
            delta = new["latency"] - old["latency"] if old["latency"] is not None and new["latency"] is not None else None
            lines.append(
                f"| {label} | {old_status} | {fmt_seconds(old['latency'])} | {new_status} "
                f"| {fmt_seconds(new['latency'])} | {fmt_seconds(delta)} |"
            )
        lines.append("")
    median_old = statistics.median(no_ctx_latency) if no_ctx_latency else None
    median_new = statistics.median(ctx_latency) if ctx_latency else None
    lines.extend([
        "## Gộp hai phiên",
        "",
        "| Cấu hình | Pha đúng | Báo giả | Độ trễ trung vị |",
        "|---|---:|---:|---:|",
        f"| Tắt cờ | {no_ctx_correct}/{expected} | {no_ctx_false} | {fmt_seconds(median_old)} |",
        f"| Bật cờ | {ctx_correct}/{expected} | {ctx_false} | {fmt_seconds(median_new)} |",
        "",
        "Hai phiên không có pha nhắm mắt ngắn ngay sau ngáp, nên replay không kiểm chứng được lợi ích của luật trong tình huống mục tiêu. Chúng chỉ cho biết luật có làm thay đổi nhãn và báo giả trong các bản ghi này hay không.",
        "",
    ])
    return "\n".join(lines), results


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    loaded = []
    for path in INPUTS:
        if not path.is_file():
            raise SystemExit(f"Không tìm thấy phiên: {path}")
        data, marks = load_session(path)
        loaded.append((path, data, marks))

    rows = build_mar_rows(loaded)
    mar_report = render_mar_report(rows, INPUTS)
    csv_path, report_path = write_mar_outputs(rows, mar_report)
    compare_text, _ = replay_comparison(loaded)
    compare_path = OUTPUT_DIR / "replay_compare.txt"
    compare_path.write_text(compare_text, encoding="utf-8")

    print(mar_report, end="")
    print(f"\nCSV: {csv_path}\nBảng: {report_path}\nReplay: {compare_path}")
    print("\n" + compare_text)


if __name__ == "__main__":
    main()
