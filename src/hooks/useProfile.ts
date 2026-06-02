import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserMe, updateProfile as updateProfileApi } from "@/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";

const PROFILE_QUERY_KEY = ["userProfile"];

export function useProfile() {
  const user = useAuthStore((s) => s.user);
  const username = user?.username;

  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, username],
    queryFn: async () => {
      const me = await getUserMe();
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
