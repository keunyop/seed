import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PressableButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PressableButton({ className, children, type = "button", ...props }: PressableButtonProps) {
  return (
    <button
      className={cn(
        "pressable-shadow inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-duo-green px-5 py-3 text-center text-base font-extrabold text-almost-black transition-[box-shadow,transform,background-color] hover:bg-[#61d80b] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

