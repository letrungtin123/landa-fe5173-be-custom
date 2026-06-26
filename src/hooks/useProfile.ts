import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserMe, updateProfile as updateProfileApi } from "@/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { avatarUrl } from "@/utils/storageUrl";

const PROFILE_QUERY_KEY = ["userProfile"];

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const username = user?.username;

  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, username],
    queryFn: async () => {
      const me = await getUserMe();
      // Sync avatar mới nhất từ DB vào auth store
      // (fix: sau upload avatar + F5, store vẫn giữ URL cũ)
      const freshAvatar = me.user.avatar_url
        ? avatarUrl(me.user.avatar_url)
        : null;
      const currentAvatar = useAuthStore.getState().user?.avatar;
      // So sánh base URL (bỏ ?v= cache-busting) để tránh infinite update
      const stripQuery = (u: string | null | undefined) => u?.split('?')[0] ?? '';
      if (stripQuery(freshAvatar) !== stripQuery(currentAvatar)) {
        useAuthStore.getState().updateUser({ avatar: freshAvatar });
      }
      useAuthStore.getState().setRoleLabels(me.role_labels || {});
      return me.user;
    },
    enabled: !!username,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const username = user?.username;

  return useMutation({
    mutationFn: (data: Partial<{
      full_name: string;
      phone: string;
      bio: string;
      avatar_url: string;
      gender: string;
      country: string;
      language: string;
      level_of_education: string;
      year_of_birth: number;
    }>) => {
      if (!username) throw new Error("No username found");
      return updateProfileApi(data);
    },
    onSuccess: (updatedProfile: any) => {
      // Invalidate để force refetch từ /api/auth/me (trả đủ fields)
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      
      const updateStore = useAuthStore.getState().updateUser;
      if (updateStore && updatedProfile.full_name) {
         updateStore({ fullName: updatedProfile.full_name });
      }

      localStorage.setItem(`la_profile_updated_${username}`, "true");
      window.dispatchEvent(new Event("la_profile_updated"));
    },
  });
}
