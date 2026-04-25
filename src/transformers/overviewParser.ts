// ============================================================
// Overview Parser — Extract structured data from course overview HTML
// Open edX stores instructor info in the overview HTML field
// with a standardized structure: section.course-staff > article.teacher
// ============================================================

import type { Mentor } from "@/data/types";

/**
 * Parse mentor/instructor data from the course overview HTML.
 *
 * Expected HTML structure (standard Open edX template):
 * ```html
 * <section class="course-staff">
 *   <article class="teacher">
 *     <div class="teacher-image"><img src="..." /></div>
 *     <h3>Name</h3>
 *     <p>Role/Bio</p>
 *   </article>
 * </section>
 * ```
 */
export function parseMentorsFromOverview(overviewHtml: string): Mentor[] {
  if (!overviewHtml) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(overviewHtml, "text/html");

    // Tìm tất cả article.teacher bên trong section.course-staff
    const teacherEls = doc.querySelectorAll(
      "section.course-staff article.teacher, .course-staff .teacher"
    );

    if (teacherEls.length === 0) return [];

    const mentors: Mentor[] = [];

    teacherEls.forEach((el) => {
      // Tên: lấy từ h3 hoặc h4
      const nameEl = el.querySelector("h3, h4, .teacher-name");
      const name = nameEl?.textContent?.trim() || "";

      if (!name) return; // Bỏ qua nếu không có tên

      // Role/Bio: lấy từ p đầu tiên (hoặc .teacher-bio)
      const bioEl = el.querySelector(
        ".teacher-bio p, p:not(.teacher-image p)"
      );
      const role = bioEl?.textContent?.trim() || "";

      // Avatar: lấy từ img trong .teacher-image
      const imgEl = el.querySelector(
        ".teacher-image img, img"
      ) as HTMLImageElement | null;
      const avatar = imgEl?.getAttribute("src") || null;

      mentors.push({
        name,
        role,
        company: "", // Open edX không có field company riêng
        avatar,
      });
    });

    return mentors;
  } catch {
    // Nếu parse lỗi, trả mảng rỗng
    return [];
  }
}
