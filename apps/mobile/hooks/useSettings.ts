import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from "@/lib/api/settings";

export const notificationPrefsQueryKey = (userId: string) =>
  ["notificationPrefs", userId] as const;

export function useNotificationPrefs(userId: string | undefined) {
  return useQuery({
    queryKey: notificationPrefsQueryKey(userId ?? ""),
    queryFn: () => fetchNotificationPrefs(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateNotificationPrefs(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: Partial<NotificationPrefs>) => {
      if (!userId) throw new Error("Not authenticated");
      return updateNotificationPrefs(userId, prefs);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: notificationPrefsQueryKey(userId),
        });
      }
    },
  });
}
