import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";

export function MainLayout() {
  const location = useLocation();
  const isCourseRoute = location.pathname.startsWith("/courses");
  const routeKey = isCourseRoute ? "courses" : location.pathname;

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      <Header />
      <PageTransition animationKey={routeKey}>
        <Outlet />
      </PageTransition>
    </div>
  );
}
