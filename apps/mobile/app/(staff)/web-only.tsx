import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/ui/Screen";

export default function StaffWebOnlyScreen() {
  const { t } = useTranslation();

  return (
    <ScreenShell
      title={t("staff.webOnlyTitle")}
      subtitle={t("staff.webOnlySubtitle")}
    >
      <View className="bg-amber-bg border border-amber rounded-card p-5">
        <Text className="text-amber-ink text-right leading-6">
          {t("staff.webOnlyBody")}
        </Text>
      </View>
    </ScreenShell>
  );
}
