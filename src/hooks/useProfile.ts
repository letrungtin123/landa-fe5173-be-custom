import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserAccount, updateUserAccount } from "@/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserAccount } from "@/api/types";

const PROFILE_QUERY_KEY = ["userProfile"];

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const username = user?.username;

  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, username],
    queryFn: () => getUserAccount(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const username = user?.username;

  return useMutation({
    mutationFn: (data: Partial<UserAccount>) => {
      if (!username) throw new Error("No username found");
      return updateUserAccount(username, data);
    },
    onSuccess: (updatedProfile) => {
      // Cập nhật cache ngay lập tức sau khi thành công
      queryClient.setQueryData([...PROFILE_QUERY_KEY, username], updatedProfile);
      
      // Update store nếu cần (tùy thuộc vào store đang lưu trữ gì)
      const updateStore = useAuthStore.getState().updateUser;
      if (updateStore && updatedProfile.name) {
         updateStore({ name: updatedProfile.name });
      }

      // Đánh dấu profile đã update để unlock badge
      localStorage.setItem(`la_profile_updated_${username}`, "true");
      window.dispatchEvent(new Event("la_profile_updated"));
    },
  });
}
