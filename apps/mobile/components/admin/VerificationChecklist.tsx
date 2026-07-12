import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import {
  VERIFICATION_CHECKLIST_KEYS,
  type VerificationChecklistKey,
  type VerificationChecklistState,
} from "@/lib/admin-verification";

interface VerificationChecklistProps {
  state: VerificationChecklistState;
  onToggle: (key: VerificationChecklistKey) => void;
}

export function VerificationChecklist({
  state,
  onToggle,
}: VerificationChecklistProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-surface border border-border rounded-card p-4 mb-6">
      <Text className="text-base font-bold text-ink mb-4 font-rubik text-right">
        {t("admin.checklistTitle")}
      </Text>
      {VERIFICATION_CHECKLIST_KEYS.map((key) => {
        const checked = state[key];
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(key)}
            className="flex-row items-center justify-end py-3 border-b border-border last:border-b-0 active:opacity-90"
          >
            <Text
              className={`text-sm flex-1 text-right leading-5 ${
                checked ? "text-teal font-semibold" : "text-ink-2"
              }`}
            >
              {t(`admin.checklist.${key}`)}
            </Text>
            <View
              className={`w-6 h-6 rounded border-2 ml-3 items-center justify-center ${
                checked ? "bg-teal border-teal" : "border-border bg-bg"
              }`}
            >
              {checked ? (
                <Text className="text-white text-xs font-bold">✓</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
