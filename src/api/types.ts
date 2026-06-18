// ============================================================
// API Types — Kiểu dữ liệu response từ Custom Backend
// ============================================================

// ── Wrapper response ──

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Xác thực ──

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  user: AuthUserInfo;
  permissions: PermissionsMap;
  tenant_modules: string[];
  managed_tenants: TenantBasic[];
}

export interface AuthUserInfo {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'learner' | 'learner_plus' | 'staff' | 'superuser' | 'superadmin';
  tenant_id: string | null;
  tenant_name: string | null;
}

export interface TenantBasic {
  id: string;
  name: string;
}

export interface PermissionsMap {
  [moduleCode: string]: {
    can_view: boolean;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

// ── Khóa học ──

export interface CourseInfo {
  id: string;
  display_name: string;
  org: string;
  image_url: string;
  start_date: string | null;
  end_date: string | null;
  visible_to_staff_only: boolean;
  created_at: string;
  /** Categories — optional, chưa implement trên custom BE */
  categories?: Array<{ id: number; name: string; slug: string }>;
  mentors?: CourseMentorInfo[];
}

export interface CourseMentorInfo {
  id: string;
  username?: string;
  name: string;
  full_name?: string | null;
  role: string;
  company: string;
  avatar: string | null;
  email?: string;
  phone?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
  profile_image_url_full?: string | null;
}

export interface CourseCategoryInfo {
  id: string;
  name: string;
}

export interface CourseListResponse {
  data: CourseInfo[];
  categories: CourseCategoryInfo[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Course Blocks ──

export interface CourseBlock {
  id: string;
  parent_id: string | null;
  block_type: 'course' | 'chapter' | 'sequential' | 'vertical' | 'video' | 'html' | 'problem' | 'la_crossword' | 'la_sortable' | 'la_diagram' | 'la_faq' | 'la_pdf';
  display_name: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  sort_order: number;
  completed: boolean;
}

export interface CourseBlocksResponse {
  root_id: string | null;
  blocks: CourseBlock[];
}

// ── Ghi danh ──

export interface EnrollmentItem {
  id: string;
  course_id: string;
  enrolled_at: string;
  is_active: boolean;
  display_name: string;
  image_url: string;
  org: string;
  progress: number;       // 0 - 100
  is_completed: boolean;
  completed_at: string | null;
  last_activity_at: string | null;
}

// ── Tiến độ ──

export interface CourseProgress {
  progress: number;
  is_completed: boolean;
  completed_at: string | null;
  last_activity_at: string | null;
}

// ── Badges ──

export interface UserBadge {
  badge_id: string;
  is_shown: boolean;
  earned_at: string;
}

// ── Thông báo ──

export interface Notification {
  id: string;
  title: string;
  message: string;
  course_id: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  sent_by_name: string | null;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  unread_count: number;
}

// ── Backward compat — giữ để không lỗi import chỗ cũ ──
// Sẽ dọn dẹp sau

/** @deprecated dùng LoginResponse */
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** @deprecated dùng AuthUserInfo */
export interface UserMe {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser?: boolean;
}

/** @deprecated */
export interface UserAccount {
  username: string;
  name: string;
  is_active: boolean;
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

/** @deprecated */
export interface BlocksResponse {
  root: string;
  blocks: Record<string, Block>;
}

/** @deprecated */
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

/** @deprecated */
export interface VideoBlockData {
  duration: number | null;
  transcripts: Record<string, string>;
  encoded_videos: Record<
    string,
    { url: string; file_size: number }
  >;
  only_on_web: boolean;
}

/** @deprecated */
export interface CourseCompletionResponse {
  completion: number;
  course_key: string;
}

/** @deprecated */
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

/** @deprecated */
export interface NotificationResponse {
  count: number;
  next: string | null;
  results: OpenEdXNotification[];
}

/** @deprecated */
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

/** @deprecated */
export interface XBlockViewResponse {
  content: string;
  resources: unknown[];
}

