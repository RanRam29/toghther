import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { SlaLevel } from "@/lib/admin-verification";

const SLA_STYLES: Record<SlaLevel, { bg: string; text: string }> = {
  green: { bg: "bg-teal-bg", text: "text-teal" },
  yellow: { bg: "bg-amber-bg", text: "text-amber" },
  red: { bg: "bg-coral-bg", text: "text-coral" },
};

interface SlaBadgeProps {
  level: SlaLevel;
  submittedAt: string;
}

export function SlaBadge({ level, submittedAt }: SlaBadgeProps) {
  const { t } = useTranslation();
  const style = SLA_STYLES[level];

  return (
    <View className={`rounded-full px-3 py-1 ${style.bg}`}>
      <Text className={`text-xs font-semibold font-rubik ${style.text}`}>
        {t(`admin.sla.${level}`)} · {formatRelativeDate(submittedAt)}
      </Text>
    </View>
  );
}

function formatRelativeDate(iso: string): string {
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "היום";
  if (days === 1) return "אתמול";
  return `${days} ימים`;
}
