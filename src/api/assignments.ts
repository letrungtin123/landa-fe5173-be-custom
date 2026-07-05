import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export type AssignmentStatus = "not_submitted" | "submitted" | "feedback_given";

export interface AssignmentFileMeta {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
  created_at?: string;
}

export interface LearnerAssignmentSubmission {
  id: string;
  answer_text: string;
  files: AssignmentFileMeta[];
  status: AssignmentStatus;
  submitted_at: string;
  submission_version: number;
  feedback_text: string | null;
  feedback_files: AssignmentFileMeta[];
  feedback_at: string | null;
}

export interface LearnerAssignment {
  id: string;
  tenant_id: string;
  course_id: string;
  title: string;
  question: string;
  sort_order: number;
  is_published: boolean;
  allow_resubmission: boolean;
  status: AssignmentStatus;
  can_submit: boolean;
  submission: LearnerAssignmentSubmission | null;
}

export async function getLearnerCourseAssignments(courseId: string): Promise<LearnerAssignment[]> {
  const { data } = await apiClient.get<ApiResponse<LearnerAssignment[]>>(
    `/api/assignments/learner/courses/${encodeURIComponent(courseId)}`
  );
  return data.data;
}

export async function getLearnerAssignment(assignmentId: string): Promise<LearnerAssignment> {
  const { data } = await apiClient.get<ApiResponse<LearnerAssignment>>(
    `/api/assignments/learner/${encodeURIComponent(assignmentId)}`
  );
  return data.data;
}

export async function submitLearnerAssignment(
  assignmentId: string,
  input: { answer_text: string; files?: File[] }
): Promise<LearnerAssignment> {
  const form = new FormData();
  form.append("answer_text", input.answer_text);
  input.files?.forEach((file) => form.append("files", file));
  const { data } = await apiClient.post<ApiResponse<LearnerAssignment>>(
    `/api/assignments/learner/${encodeURIComponent(assignmentId)}/submit`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

export async function downloadAssignmentFile(file: AssignmentFileMeta): Promise<void> {
  const response = await apiClient.get(file.download_url, { responseType: "blob" });
  const url = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.original_name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

