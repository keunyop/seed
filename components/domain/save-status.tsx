import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

type SaveStatusProps = {
  state: "idle" | "loading" | "saved" | "error";
};

export function SaveStatus({ state }: SaveStatusProps) {
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-bold text-graphite">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        저장 중
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-bold text-[#b3261e]">
        <TriangleAlert aria-hidden="true" className="h-4 w-4" />
        저장 실패
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-duo-green-dark">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
      저장됨
    </span>
  );
}
