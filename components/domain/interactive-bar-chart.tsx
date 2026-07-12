"use client";

import { cn } from "@/lib/utils";

export type InteractiveBarDatum = {
  key: string;
  label: string;
  value: number;
  ariaLabel: string;
};

type InteractiveBarChartProps = {
  title: string;
  description: string;
  data: InteractiveBarDatum[];
  tone: "attendance" | "qt" | "birthday";
  columns: "weeks" | "months";
  onSelect: (key: string) => void;
};

const toneClasses = {
  attendance: "bg-duo-green group-hover:bg-duo-green-dark group-focus-visible:bg-duo-green-dark",
  qt: "bg-sky-blue group-hover:bg-sky-blue-text group-focus-visible:bg-sky-blue-text",
  birthday: "bg-bubblegum-pink group-hover:bg-[#a72772] group-focus-visible:bg-[#a72772]",
};

export function InteractiveBarChart({
  title,
  description,
  data,
  tone,
  columns,
  onSelect,
}: InteractiveBarChartProps) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <section className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-extrabold text-almost-black">{title}</h2>
        <p className="mt-1 text-sm font-bold text-graphite">{description}</p>
      </div>

      <div
        aria-label={`${title} 막대그래프`}
        className={cn(
          "mt-5 grid items-end gap-x-2 gap-y-4",
          columns === "weeks" ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-12",
        )}
        role="group"
      >
        {data.map((item) => {
          const height = item.value === 0 ? 4 : Math.max(12, Math.round((item.value / maxValue) * 100));

          return (
            <button
              aria-label={item.ariaLabel}
              className="group flex min-h-44 min-w-0 flex-col items-center justify-end rounded-[12px] px-0.5 py-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text"
              key={item.key}
              onClick={() => onSelect(item.key)}
              type="button"
            >
              <span className="mb-1 text-sm font-extrabold tabular-nums text-almost-black">{item.value}</span>
              <span
                aria-hidden="true"
                className="flex h-28 w-full max-w-10 items-end justify-center overflow-hidden rounded-t-[10px] bg-[#f2f2f2]"
              >
                <span
                  className={cn("block w-full rounded-t-[10px] transition-colors", toneClasses[tone])}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span className="mt-2 min-h-8 text-xs font-extrabold leading-4 text-graphite">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
