import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View className="bg-amber px-4 py-2 border-b border-amber/30">
      <Text className="text-white text-sm font-semibold text-center font-rubik">
        {t("common.offline")}
      </Text>
    </View>
  );
}
