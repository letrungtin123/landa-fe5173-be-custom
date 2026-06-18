// ============================================================
// useAutoEnroll — Tự động enroll user vào tất cả khóa học
//
// Chạy 1 lần khi user login thành công.
// So sánh courses hiện có vs enrollments hiện tại,
// enroll những course chưa có.
// ============================================================

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMyEnrollments, useCourses } from "./useCourses";
import { enrollCourse } from "@/api/courses";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook auto-enroll — đặt ở component gốc (DashboardPage hoặc App).
 * Khi user đăng nhập, tự động enroll vào tất cả courses chưa enrolled.
 */
export function useAutoEnroll() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments();
  const { data: coursesData, isLoading: coursesLoading } = useCourses();
  const qc = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    // Chỉ chạy 1 lần per session, khi đã có cả 2 data
    if (!isAuthenticated || enrollLoading || coursesLoading) return;
    if (hasRun.current) return;
    if (!coursesData?.data) return;

    const enrolledIds = new Set(
      (enrollments || []).map(e => e.course_id)
    );

    const missingCourses = coursesData.data.filter(
      c => !enrolledIds.has(c.id)
    );

    if (missingCourses.length === 0) {
      hasRun.current = true;
      return;
    }

    hasRun.current = true;

    // Enroll song song tất cả courses chưa có
    const enrollPromises = missingCourses.map(course =>
      enrollCourse(course.id).catch(err => {
        console.warn(`[AutoEnroll] Failed to enroll in ${course.id}:`, err);
      })
    );

    Promise.all(enrollPromises).then(() => {
      // Refresh enrollment data
      qc.invalidateQueries({ queryKey: ["enrollments"] });
    });
  }, [isAuthenticated, enrollments, coursesData, enrollLoading, coursesLoading, qc]);
}
