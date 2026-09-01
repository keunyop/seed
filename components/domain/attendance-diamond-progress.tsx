import { Diamond } from "lucide-react";
import { ATTENDANCE_DIAMOND_COUNT, ATTENDANCES_PER_DIAMOND } from "@/lib/family/stats";

type AttendanceDiamondProgressProps = {
  childName: string;
  progress: number;
};

export function AttendanceDiamondProgress({ childName, progress }: AttendanceDiamondProgressProps) {
  const attendanceCount = Math.max(
    0,
    Math.min(ATTENDANCE_DIAMOND_COUNT * ATTENDANCES_PER_DIAMOND, Math.floor(progress)),
  );
  const completedDiamonds = Math.floor(attendanceCount / ATTENDANCES_PER_DIAMOND);
  const partialQuarters = attendanceCount % ATTENDANCES_PER_DIAMOND;
  const progressLabel = [
    `${childName} 출석 ${attendanceCount}회`,
    `다이아몬드 ${completedDiamonds}개 완성`,
    partialQuarters > 0 ? `다음 다이아몬드 ${partialQuarters}/4` : "",
  ].filter(Boolean).join(", ");

  return (
    <span
      aria-label={progressLabel}
      className="inline-flex shrink-0 items-center gap-0.5"
      role="img"
    >
      {Array.from({ length: ATTENDANCE_DIAMOND_COUNT }, (_, index) => {
        const filledQuarters = Math.max(
          0,
          Math.min(ATTENDANCES_PER_DIAMOND, attendanceCount - index * ATTENDANCES_PER_DIAMOND),
        );

        return (
          <span aria-hidden="true" className="relative h-3.5 w-3.5 shrink-0" key={index}>
            <Diamond className="absolute inset-0 h-3.5 w-3.5 fill-white stroke-[2.5] text-silver" />
            {filledQuarters > 0 ? (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${filledQuarters * 25}%` }}
              >
                <Diamond className="absolute inset-0 h-3.5 w-3.5 max-w-none fill-current stroke-[2.5] text-sky-blue" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
