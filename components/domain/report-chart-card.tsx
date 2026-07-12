"use client";

import { useState, type ReactNode } from "react";
import {
  InteractiveBarPlot,
  type InteractiveBarDatum,
  type ReportChartColumns,
  type ReportChartTone,
} from "./interactive-bar-chart";
import { StaticLineChart } from "./static-line-chart";
import { cn } from "@/lib/utils";

export type ReportChartRange = "recent" | "all";

type ReportChartCardProps = {
  title: string;
  recentData: InteractiveBarDatum[];
  allData: InteractiveBarDatum[];
  tone: ReportChartTone;
  columns: ReportChartColumns;
  onSelect: (key: string) => void;
  footer?: ReactNode;
  initialRange?: ReportChartRange;
};

export function ReportChartCard({
  title,
  recentData,
  allData,
  tone,
  columns,
  onSelect,
  footer,
  initialRange = "recent",
}: ReportChartCardProps) {
  const [range, setRange] = useState<ReportChartRange>(initialRange);

  return (
    <section className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-almost-black">{title}</h2>
        <div aria-label={`${title} 표시 범위`} className="grid grid-cols-2 rounded-[12px] bg-[#f2f2f2] p-1" role="group">
          {([
            ["recent", "최근"],
            ["all", "전체"],
          ] as const).map(([value, label]) => (
            <button
              aria-pressed={range === value}
              className={cn(
                "inline-flex min-h-11 min-w-16 items-center justify-center rounded-[9px] px-3 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text",
                range === value ? "bg-white text-almost-black" : "text-graphite",
              )}
              key={value}
              onClick={() => setRange(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {range === "recent" ? (
          <InteractiveBarPlot columns={columns} data={recentData} onSelect={onSelect} title={title} tone={tone} />
        ) : (
          <StaticLineChart data={allData} title={title} tone={tone} />
        )}
      </div>

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
