// ============================================================
// L&A Onboarding LMS — Mock Data
// Hard-coded data for UI development (no API calls)
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

// ── User ──
export const mockUser: User = {
  name: "John Henry",
  role: "Nhân viên kinh doanh",
  joinDate: "04/2026",
  avatar: null,
  streak: 12,
  overallProgress: 85,
};

// ── Course Structure ──
export const mockCourse: Course = {
  id: "c1",
  title: "L&A Onboarding 2026",
  modules: [
    {
      id: "m1",
      title: "Module 1: Giới thiệu tổng quan",
      progress: "4:12 / 12:45",
      completed: true,
      lessons: [
        { id: "l-m1-1", title: "Giới thiệu về L&A", completed: true },
        { id: "l-m1-2", title: "Giới thiệu về L&A Holding", completed: true },
        { id: "l-m1-3", title: "Giới thiệu về DNA các công ty", completed: true },
        { id: "l-m1-4", title: "Giá trị cốt lõi & hành vi văn hoá", completed: true },
        { id: "l-m1-5", title: "L&A Quiz", completed: true },
      ],
    },
    {
      id: "m2",
      title: "Module 02: Cơ cấu tổ chức & Đối tác chiến lược",
      completed: false,
      lessons: [
        { id: "l-m2-1", title: "Sơ đồ tổ chức L&A Holdings", completed: false, active: true },
        { id: "l-m2-2", title: "Sơ đồ tổ chức L&A", completed: false },
        { id: "l-m2-3", title: "Sơ đồ tổ chức KBM", completed: false },
        { id: "l-m2-4", title: "Sơ đồ tổ chức Skale", completed: false },
        { id: "l-m2-5", title: "Sơ đồ tổ chức Nesso", completed: false },
        { id: "l-m2-6", title: "Đối tác chiến lược", completed: false },
        { id: "l-m2-7", title: "L&A Quiz", completed: false },
      ],
    },
    {
      id: "m3",
      title: "Module 03: Nội dung Onboarding",
      completed: false,
      lessons: [
        { id: "l-m3-1", title: "Chính sách công ty", completed: false },
        { id: "l-m3-2", title: "Công tác phí", completed: false },
        { id: "l-m3-3", title: "Tài Nguyên - Hệ thống", completed: false },
        { id: "l-m3-4", title: "Các hoạt động gắn kết", completed: false },
        { id: "l-m3-5", title: "Các công ty liên kết", completed: false },
        { id: "l-m3-6", title: "Thông tin liên hệ", completed: false },
        { id: "l-m3-7", title: "L&A Quiz", completed: false },
      ],
    },
  ],
};

// ── Current Lesson Detail Dictionary ──
const generatedLessons: Record<string, LessonDetail> = {};

mockCourse.modules.forEach((module, mIndex) => {
  module.lessons.forEach((lesson, lIndex) => {
    const isQuiz = lesson.title.includes("Quiz");
    const isSlide = lIndex % 2 !== 0 && !isQuiz; // Alternate video and slide
    const type = isQuiz ? "quiz" : (isSlide ? "slide" : "video");
    
    generatedLessons[lesson.id] = {
      id: lesson.id,
      type: type,
      moduleTag: `MODULE ${String(mIndex + 1).padStart(2, '0')}`,
      lessonNumber: `Lesson ${lIndex + 1} of ${module.lessons.length}`,
      title: lesson.title,
      videoThumbnail: null,
      videoDuration: "12:45",
      videoCurrentTime: "04:12",
      objectives: [
        "Thấu hiểu mục tiêu chung của bài học",
        "Áp dụng hiệu quả vào công việc thực tế",
      ],
      description: "Bài học này cung cấp một cái nhìn toàn diện và hệ thống, giúp bạn nắm vững kiến thức chuyên môn và nền tảng cốt lõi.",
      bulletPoints: [
        { label: "Định hướng chiến lược:", text: "Nắm bắt tầm nhìn thiết thực và định hình phương hướng." },
        { label: "Kiến thức chuyên môn:", text: "Trang bị hành trang thiết yếu cho môi trường làm việc chuyên nghiệp." }
      ],
      mentors: [
        { name: "Anther Kiley", role: "Trưởng phòng nhân sự", company: "Le & Associates", avatar: null },
        { name: "John Henry", role: "Giám đốc Marketing", company: "Le & Associates", avatar: null }
      ],
      quizData: isQuiz ? {
        question: `Mục tiêu quan trọng nhất trong bài học ${lesson.title} là gì?`,
        options: [
          { id: "a", letter: "A", text: "Tối ưu hiệu suất làm việc để phát triển bền vững.", selected: true },
          { id: "b", letter: "B", text: "Cung cấp các giải pháp tiện lợi trong quá trình vận hành." },
          { id: "c", letter: "C", text: "Xây dựng môi trường thân thiện và hoà đồng." },
          { id: "d", letter: "D", text: "Tất cả các ý trên đều tương đối đúng." },
        ]
      } : undefined,
      slideData: type === "slide" ? {
        title: lesson.title,
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
      } : undefined
    };
  });
});

export const mockLessons = generatedLessons;

// Fallback for isolated components
export const mockLesson = mockLessons["l-m2-1"];

// ── Notifications ──
export const mockNotifications: Notification[] = [
  {
    id: "n1",
    icon: "badge",
    title: "New Badge!",
    message: "Chúc mừng bạn đã mở khóa danh hiệu mới",
    time: "15 phút trước",
    read: false,
  },
  {
    id: "n2",
    icon: "badge",
    title: "New Badge!",
    message: "Chúc mừng bạn đã mở khóa danh hiệu mới",
    time: "1 giờ trước",
    read: false,
  },
  {
    id: "n3",
    icon: "course",
    title: "Module mới!",
    message: "Module 03: Nội dung Onboarding đã sẵn sàng",
    time: "2 giờ trước",
    read: true,
  },
];

// ── Continue Learning Courses ──
export const mockContinueCourses: ContinueCourse[] = [
  {
    id: "cc1",
    moduleLabel: "Module 1",
    lessonLabel: "Giới thiệu về DNA các công ty",
    title: "L&A Onboarding 2026",
    thumbnail: null,
  },
  {
    id: "cc2",
    moduleLabel: "Module 3",
    lessonLabel: "Sắp xếp công việc hợp lý",
    title: "Quản lý thời gian hiệu quả",
    thumbnail: null,
  },
];
