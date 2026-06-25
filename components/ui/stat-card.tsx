import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
};

export function StatCard({ icon: Icon, label, value, helper }: StatCardProps) {
  return (
    <article className="rounded-[12px] border-2 border-cloud-gray p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-graphite">{label}</p>
        <Icon aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
      </div>
      <p className="mt-3 text-3xl font-extrabold leading-none text-almost-black">{value}</p>
      <p className="mt-2 text-sm font-medium text-graphite">{helper}</p>
    </article>
  );
}

