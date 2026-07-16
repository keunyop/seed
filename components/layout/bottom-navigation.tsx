import { BarChart3, CalendarCheck2, Home, Settings, UserRoundCog, UsersRound } from "lucide-react";
import Link from "next/link";

const items = [
  { id: "home", label: "홈", href: "/dashboard", icon: Home },
  { id: "attendance", label: "출석", href: "/attendance", icon: CalendarCheck2 },
  { id: "children", label: "아이들", href: "/children", icon: UsersRound },
  { id: "teachers", label: "선생님", href: "/teachers", icon: UserRoundCog },
  { id: "reports", label: "통계", href: "/reports", icon: BarChart3 },
  { id: "settings", label: "설정", href: "/settings", icon: Settings },
];

type BottomNavigationProps = {
  active: "home" | "attendance" | "children" | "teachers" | "reports" | "settings";
};

export function BottomNavigation({ active }: BottomNavigationProps) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-cloud-gray bg-white px-2 pb-[calc(8px+var(--safe-bottom))] pt-2"
    >
      <div className="mx-auto grid max-w-[640px] grid-cols-6 gap-1">
        {items.map((item) => (
          <Link
            aria-current={item.id === active ? "page" : undefined}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[12px] px-1 text-xs font-extrabold text-graphite transition hover:bg-duo-green-light aria-[current=page]:bg-duo-green-light aria-[current=page]:text-duo-green-dark"
            href={item.href}
            key={item.href}
          >
            <item.icon aria-hidden="true" className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
