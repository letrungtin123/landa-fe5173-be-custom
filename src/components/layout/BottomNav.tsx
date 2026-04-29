import { Link, useLocation } from "react-router-dom";
import { Compass, BookOpen, Library, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Khám phá", path: "/dashboard", icon: Compass },
  { label: "Khóa học", path: "/explore", icon: BookOpen },
  { label: "Thư viện", path: "/library", icon: Library },
  { label: "Danh hiệu", path: "/badges", icon: Award },
];

export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-background/95 backdrop-blur border-t border-border md:hidden px-2 pb-safe">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          (item.path !== "/" && location.pathname.startsWith(item.path));

        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-1 flex-col items-center justify-center gap-1 relative"
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-accent rounded-b-full" />
            )}
            <Icon
              className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
