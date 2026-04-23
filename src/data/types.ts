// ============================================================
// L&A Onboarding LMS — FE Data Types
// (Extracted from mock.ts — used across all components)
// ============================================================

export interface User {
  name: string;
  role: string;
  joinDate: string;
  avatar: string | null;
  streak: number;
  overallProgress: number;
}

export interface Lesson {
  id: string;
  title: string;
  completed: boolean;
  active?: boolean;
  type?: "video" | "quiz" | "slide";
}

export interface Module {
  id: string;
  title: string;
  progress?: string;
  completed: boolean;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  modules: Module[];
}

export interface LessonDetail {
  id: string;
  moduleTag: string;
  lessonNumber: string;
  title: string;
  type?: "video" | "quiz" | "slide";
  videoThumbnail: string | null;
  videoDuration: string;
  videoCurrentTime: string;
  objectives: string[];
  description: string;
  bulletPoints: { label: string; text: string }[];
  mentors: Mentor[];
  quizData?: {
    question: string;
    options: { id: string; letter: string; text: string; selected?: boolean }[];
  };
  slideData?: {
    title: string;
    imageUrl: string;
  };
  // Trường bổ sung từ API (set bởi blockTransformer)
  _videoUrl?: string | null;
  _problemUsageKey?: string | null;
  _htmlBlocks?: string[];
  _htmlContent?: string | null;      // Nội dung HTML lấy trực tiếp từ blocks API
  _studentViewUrl?: string | null;
}

export interface Mentor {
  name: string;
  role: string;
  company: string;
  avatar: string | null;
}

export interface Notification {
  id: string;
  icon: "badge" | "course" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface ContinueCourse {
  id: string;
  moduleLabel: string;
  lessonLabel: string;
  title: string;
  thumbnail: string | null;
}
