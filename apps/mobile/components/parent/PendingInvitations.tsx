import React from "react";
import { View, Text, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useMyParentInvitations, useParentInvitations } from "@/hooks/useParentInvitations";
import { PrimaryButton } from "@/components/ui/Screen";
import { useAuthStore } from "@/stores/auth-store";

export function PendingInvitations() {
  const { t } = useTranslation();
  const { data: invitations, isLoading } = useMyParentInvitations();
  const { acceptInvitation, loading: accepting } = useParentInvitations();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);

  if (isLoading || !invitations || invitations.length === 0) return null;

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      Alert.alert(t("success"), t("parent.invitationAccepted", "ההזמנה התקבלה בהצלחה!"));
      queryClient.invalidateQueries({ queryKey: ["my_parent_invitations", session?.user?.id] });
      queryClient.invalidateQueries({ queryKey: ["children", session?.user?.id] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error");
      Alert.alert(t("error"), message);
    }
  };

  return (
    <View className="mb-6 gap-4">
      {invitations.map((inv: { id: string; child?: { first_name?: string } | null }) => (
        <View key={inv.id} className="bg-amber-bg p-4 rounded-card border border-amber/30">
          <Text className="text-amber-ink text-start font-bold text-lg mb-1">
            {t("parent.youAreInvited", "הוזמנת להצטרף לפרופיל")}
          </Text>
          <Text className="text-amber text-start mb-4">
            {t("parent.invitedToChild", "הוזמנת לשמש כהורה נוסף עבור {{name}}", {
              name: inv.child?.first_name || "הילד",
            })}
          </Text>
          {session?.user?.user_metadata?.role === "professional" ||
          useAuthStore.getState().profile?.role === "professional" ? (
            <Text className="text-coral text-start font-medium">
              {t(
                "parent.professionalRoleError",
                "לא ניתן לאשר את ההזמנה. חשבונך רשום כמשלבת במערכת, תפקיד הורה נוסף מיועד להורים בלבד.",
              )}
            </Text>
          ) : (
            <PrimaryButton
              label={t("parent.acceptInvitation", "קבל הזמנה")}
              onPress={() => handleAccept(inv.id)}
              loading={accepting}
            />
          )}
        </View>
      ))}
    </View>
  );
}
