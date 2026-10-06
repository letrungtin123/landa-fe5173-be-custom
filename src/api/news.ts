import { apiClient } from '@/api/client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface NewsPostSummary {
  id: string;
  title: string;
  excerpt: string;
  preview_image_path: string | null;
  created_at: string;
  updated_at: string;
  archived_at: null;
  version: number;
}

export interface NewsPostDetail extends NewsPostSummary {
  content_html: string;
  created_by: string | null;
  updated_by: string | null;
  archived_by: null;
}

export interface NewsPage {
  results: NewsPostSummary[];
  page_size: number;
  has_more: boolean;
  next_cursor: string | null;
}

export async function getNewsFeed(params: {
  cursor?: string;
  limit?: number;
  search?: string;
}): Promise<NewsPage> {
  const { data } = await apiClient.get<ApiResponse<NewsPage>>('/api/news', { params });
  return data.data;
}

export async function getNewsPost(postId: string): Promise<NewsPostDetail> {
  const { data } = await apiClient.get<ApiResponse<NewsPostDetail>>(`/api/news/${postId}`);
  return data.data;
}
