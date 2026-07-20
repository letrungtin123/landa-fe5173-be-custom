import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

import dashboardIcon from "@/assets/MobileRouteIcon/dashboard-icon.png";
import exploreIcon from "@/assets/MobileRouteIcon/explore-icon.png";
import libraryIcon from "@/assets/MobileRouteIcon/library-icon.png";
import badgeIcon from "@/assets/MobileRouteIcon/badge-icon.png";

const NAV_ITEMS = [
  { label: "Khám phá", path: "/dashboard", iconSrc: dashboardIcon },
  { label: "Khóa học", path: "/explore", iconSrc: exploreIcon },
  { label: "Thư viện", path: "/library", iconSrc: libraryIcon },
  { label: "Danh hiệu", path: "/badges", iconSrc: badgeIcon },
];

export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-background/95 backdrop-blur border-t border-border lg:hidden px-2 pb-safe">
      {NAV_ITEMS.map((item) => {
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
              <span className="absolute inset-x-4 top-0 h-0.5 bg-accent" />
            )}
            <img
              src={item.iconSrc}
              alt={item.label}
              className={cn(
                "h-5 w-5 object-contain transition-opacity",
                isActive ? "opacity-100" : "opacity-50"
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
