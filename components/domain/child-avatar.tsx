import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChildGender } from "@/lib/family/types";

type ChildAvatarProps = {
  name: string;
  gender?: ChildGender;
  photoDataUrl?: string;
  size?: "md" | "lg";
  className?: string;
};

const avatarSizeClasses = {
  md: "h-14 w-14 text-lg",
  lg: "h-16 w-16 text-xl",
};

const iconSizeClasses = {
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function getChildAvatarToneClasses(gender?: ChildGender) {
  if (gender === "male") {
    return "border-sky-blue/40 bg-sky-blue/15 text-sky-blue-text";
  }

  if (gender === "female") {
    return "border-bubblegum-pink/40 bg-bubblegum-pink/15 text-bubblegum-pink";
  }

  return "border-duo-green/40 bg-duo-green-light text-duo-green-dark";
}

export function ChildAvatar({ name, gender = "unspecified", photoDataUrl, size = "md", className }: ChildAvatarProps) {
  const trimmedName = name.trim();
  const initial = trimmedName.slice(0, 1);

  return (
    <div
      aria-label={`${trimmedName || "아이"} 아바타`}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-extrabold",
        avatarSizeClasses[size],
        getChildAvatarToneClasses(gender),
        className,
      )}
      data-gender={gender}
      role="img"
    >
      {photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-full w-full object-cover" decoding="async" loading="lazy" src={photoDataUrl} />
      ) : initial ? (
        initial
      ) : (
        <Camera aria-hidden="true" className={iconSizeClasses[size]} />
      )}
    </div>
  );
}
