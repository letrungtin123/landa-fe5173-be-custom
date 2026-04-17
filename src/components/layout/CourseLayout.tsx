import { Outlet, useLocation } from "react-router-dom";
import { CourseSidebar } from "./CourseSidebar";
import { PageTransition } from "./PageTransition";

export function CourseLayout() {
  const location = useLocation();
  
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar with sticky/independent scroll */}
      <CourseSidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto relative bg-background">
        <PageTransition animationKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
