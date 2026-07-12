"use client";

import { useId } from "react";
import type { InteractiveBarDatum, ReportChartTone } from "./interactive-bar-chart";

type StaticLineChartProps = {
  title: string;
  data: InteractiveBarDatum[];
  tone: ReportChartTone;
};

const toneClasses: Record<ReportChartTone, string> = {
  attendance: "text-duo-green-dark",
  qt: "text-sky-blue-text",
  birthday: "text-bubblegum-pink",
};

function getVisibleLabelIndexes(length: number) {
  if (length <= 6) {
    return Array.from({ length }, (_, index) => index);
  }

  const step = Math.ceil((length - 1) / 5);
  const indexes = Array.from({ length }, (_, index) => index).filter((index) => index % step === 0);
  if (indexes.at(-1) !== length - 1) {
    indexes.push(length - 1);
  }
  return indexes;
}

export function StaticLineChart({ title, data, tone }: StaticLineChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const left = 38;
  const right = 576;
  const top = 16;
  const bottom = 144;
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? (left + right) / 2 : left + (index / (data.length - 1)) * (right - left);
    const y = bottom - (item.value / maxValue) * (bottom - top);
    return { ...item, x, y };
  });
  const visibleLabelIndexes = getVisibleLabelIndexes(data.length);

  return (
    <figure aria-labelledby={titleId} className="min-w-0">
      <svg
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className={`h-48 w-full ${toneClasses[tone]}`}
        role="img"
        viewBox="0 0 600 168"
      >
        <title id={titleId}>{title} 라인 그래프</title>
        <desc id={descriptionId}>
          {data.length > 0
            ? data.map((item) => `${item.label} ${item.value}명`).join(", ")
            : "표시할 통계 데이터가 없습니다."}
        </desc>
        <text fill="#5c5c5c" fontSize="12" fontWeight="700" x="4" y={top + 4}>
          {maxValue}
        </text>
        <text fill="#5c5c5c" fontSize="12" fontWeight="700" x="16" y={bottom + 4}>
          0
        </text>
        <line stroke="#e5e5e5" strokeWidth="2" vectorEffect="non-scaling-stroke" x1={left} x2={right} y1={bottom} y2={bottom} />
        <line stroke="#f2f2f2" strokeWidth="1" vectorEffect="non-scaling-stroke" x1={left} x2={right} y1={top} y2={top} />
        {points.length > 1 ? (
          <polyline
            fill="none"
            points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {points.map((point) => (
          <circle cx={point.x} cy={point.y} fill="white" key={point.key} r="3.5" stroke="currentColor" strokeWidth="2" />
        ))}
      </svg>

      {data.length === 0 ? (
        <p className="text-center text-sm font-bold text-graphite">표시할 통계 데이터가 없습니다.</p>
      ) : (
        <div aria-hidden="true" className="flex justify-between gap-2 text-xs font-extrabold text-graphite">
          {visibleLabelIndexes.map((index) => (
            <span className="min-w-0 truncate text-center" key={data[index].key}>
              {data[index].label}
            </span>
          ))}
        </div>
      )}

      <ul className="sr-only">
        {data.map((item) => (
          <li key={item.key}>
            {item.label}: {item.value}명
          </li>
        ))}
      </ul>
    </figure>
  );
}
