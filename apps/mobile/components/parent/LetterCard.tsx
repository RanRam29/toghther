import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AnimatedEntrance } from "@/components/ui/AnimatedEntrance";
import { PrimaryButton } from "@/components/ui/Screen";
import { celebrateEntering, successHaptic } from "@/lib/motion";
import { webPressableClass } from "@/lib/platform";

interface LetterCardProps {
  professionalName: string;
  childName: string;
  letter: string;
  onApprove: () => void;
  onDismiss?: () => void;
  approveLoading?: boolean;
  index?: number;
}

export function LetterCard({
  professionalName,
  childName,
  letter,
  onApprove,
  onDismiss,
  approveLoading = false,
  index = 0,
}: LetterCardProps) {
  const { t } = useTranslation();

  useEffect(() => {
    successHaptic();
  }, []);

  return (
    <AnimatedEntrance
      entering={celebrateEntering(index)}
      className="bg-surface-2 border-2 border-purple rounded-card p-5 mb-4"
    >
      <Text className="text-base font-bold text-purple font-rubik mb-3 text-start">
        {t("parent.letterCardTitle", { name: professionalName, child: childName })}
      </Text>

      <Text className="text-base text-ink leading-7 text-start italic mb-4">
        « {letter} »
      </Text>

      <Text className="text-sm text-ink-2 text-start mb-5">— {professionalName}</Text>

      <PrimaryButton
        label={t("parent.approveRequest")}
        onPress={onApprove}
        loading={approveLoading}
        fullWidth
      />

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          className={`mt-3 py-2 active:opacity-80 ${webPressableClass}`}
        >
          <Text className="text-sm text-ink-3 text-center font-rubik">
            {t("parent.letterCardDismiss")}
          </Text>
        </Pressable>
      ) : null}
    </AnimatedEntrance>
  );
}

interface InterestedRequestCardsProps {
  requests: Array<{
    id: string;
    cover_letter: string | null;
    parent_message?: string | null;
    match_reason?: string | null;
    childName: string;
    professionalName: string;
  }>;
  onApprove: (requestId: string) => void;
}

export function InterestedRequestCards({
  requests,
  onApprove,
}: InterestedRequestCardsProps) {
  if (requests.length === 0) return null;

  return (
    <View className="mb-2">
      {requests.map((request, index) => {
        const letter =
          request.cover_letter?.trim() ||
          request.parent_message?.trim() ||
          request.match_reason?.trim();

        if (!letter) return null;

        return (
          <LetterCard
            key={request.id}
            index={index}
            professionalName={request.professionalName}
            childName={request.childName}
            letter={letter}
            onApprove={() => onApprove(request.id)}
          />
        );
      })}
    </View>
  );
}
