// ============================================================
// API Types — Kiểu dữ liệu response từ Open edX
// ============================================================

// ── Xác thực ──

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string; // "Bearer"
  expires_in: number;
  scope: string;
}

// ── Người dùng ──

export interface UserMe {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser?: boolean;
}

export interface UserAccount {
  username: string;
  name: string;
  email: string;
  date_joined: string;
  bio: string | null;
  country: string | null;
  level_of_education: string | null;
  language: string | null;
  language_proficiencies: Array<{ code: string }>;
  gender: string | null;
  year_of_birth: number | null;
  phone_number: string | null;
  profile_image: {
    image_url_full: string;
    image_url_large: string;
    image_url_medium: string;
    image_url_small: string;
    has_image: boolean;
  };
  extended_profile?: Array<{
    field_name: string;
    field_value: string;
  }>;
}

// ── Khóa học ──

export interface CourseListResponse {
  pagination: {
    count: number;
    previous: string | null;
    next: string | null;
    num_pages: number;
  };
  results: CourseInfo[];
}

export interface CourseInfo {
  id: string; // VD: "course-v1:L_A+ONB2026+2026"
  name: string;
  number: string;
  org: string;
  short_description: string;
  overview: string;               // Full HTML overview from course about page
  course_handouts: string | null;  // URL to course handouts page
  start: string | null;
  end: string | null;
  enrollment_start: string | null;
  enrollment_end: string | null;
  media: {
    course_image: { uri: string };
    course_video: { uri: string | null };
    image: { raw: string; small: string; large: string };
  };
  course_modes?: Array<{
    slug: string;
    name: string;
  }>;
  effort: string | null;
  pacing: "self" | "instructor";
}

// ── Blocks ──

export interface BlocksResponse {
  root: string;
  blocks: Record<string, Block>;
}

export interface Block {
  id: string;
  type: string;
  display_name: string;
  lms_web_url?: string;
  student_view_url?: string;
  children?: string[];
  graded?: boolean;
  completion?: number;
  student_view_data?: VideoBlockData | Record<string, unknown>;
}

export interface VideoBlockData {
  duration: number | null;
  transcripts: Record<string, string>;
  encoded_videos: Record<
    string,
    { url: string; file_size: number }
  >;
  only_on_web: boolean;
}

// ── Ghi danh ──

export interface EnrollmentItem {
  created: string;
  mode: string;
  is_active: boolean;
  course_details: {
    course_id: string;
    course_name: string;
    enrollment_start: string | null;
    enrollment_end: string | null;
    invite_only: boolean;
    course_modes: Array<{ slug: string; name: string }>;
  };
  user: string;
}

// ── Tiến độ / Hoàn thành ──

export interface CourseCompletionResponse {
  completion: number; // 0.0 → 1.0
  course_key: string;
}

// ── Điểm ──

export interface CourseGradeResponse {
  username: string;
  email: string;
  percent: number;
  letter_grade: string | null;
  passed: boolean;
  section_breakdown: Array<{
    category: string;
    label: string;
    percent: number;
  }>;
}

// ── Thông báo ──

export interface NotificationResponse {
  count: number;
  next: string | null;
  results: OpenEdXNotification[];
}

export interface OpenEdXNotification {
  id: number;
  app_name: string;
  notification_type: string;
  content: string;
  content_context?: {
    course_name?: string;
    [key: string]: any;
  };
  content_url: string | null;
  created: string;
  last_read: string | null;
  last_seen: string | null;
}

// ── XBlock ──

export interface XBlockViewResponse {
  content: string; // HTML đã render
  resources: unknown[];
}
