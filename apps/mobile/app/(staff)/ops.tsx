import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { StaffQueryFeedback } from "@/components/admin/StaffQueryFeedback";
import { useLiveOpsAlerts } from "@/hooks/useLiveOps";
import { useStaffRoute } from "@/hooks/useStaffRoute";
import { MaterialIcons } from "@expo/vector-icons";

export default function OpsDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isReady, isAdmin } = useStaffRoute();
  const alerts = useLiveOpsAlerts();

  if (!isReady || !isAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  const handleAlertPress = (alert: any) => {
    switch (alert.alert_type) {
      case "INACTIVE_MATCH":
        router.push(`/(staff)/matches?highlight=${alert.resource_id}` as never);
        break;
      case "PENDING_PROFESSIONAL":
        router.push(`/(staff)/verification?highlight=${alert.resource_id}` as never);
        break;
      case "STALE_REQUEST":
        router.push(`/(staff)/matches?highlight=${alert.resource_id}` as never); // fallback to matches
        break;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "INACTIVE_MATCH":
        return "warning";
      case "PENDING_PROFESSIONAL":
        return "pending-actions";
      case "STALE_REQUEST":
        return "access-time";
      default:
        return "notifications";
    }
  };

  const getAlertTitle = (type: string, details: any) => {
    switch (type) {
      case "INACTIVE_MATCH":
        return `חיבור ללא דיווח (${details.child_name || "ילד"})`;
      case "PENDING_PROFESSIONAL":
        return `משלבת ממתינה לאימות`;
      case "STALE_REQUEST":
        return `בקשה ישנה פתוחה (${details.child_name || "ילד"})`;
      default:
        return "התראה חדשה";
    }
  };

  const getAlertDesc = (type: string, details: any) => {
    switch (type) {
      case "INACTIVE_MATCH":
        return `אין דיווח ב-3 ימים האחרונים.`;
      case "PENDING_PROFESSIONAL":
        return `ממתינה לאישור מסמכים כבר ${details.days_waiting} ימים.`;
      case "STALE_REQUEST":
        return `בקשה ממתינה ללא מענה כבר ${details.days_waiting} ימים.`;
      default:
        return "לחץ לפרטים";
    }
  };

  return (
    <ScrollView
      className="flex-1 px-6 py-6"
      refreshControl={
        <RefreshControl refreshing={alerts.isRefetching} onRefresh={() => alerts.refetch()} />
      }
    >
      <Text className="text-2xl font-bold text-ink mb-2 font-rubik text-right">
        חמ"ל פעיל (Live Ops)
      </Text>
      <Text className="text-sm text-ink-2 mb-6 text-right">
        תור משימות הדורש התערבות צוות באופן מיידי.
      </Text>

      {alerts.isLoading || alerts.isError ? (
        <StaffQueryFeedback
          isLoading={alerts.isLoading}
          isError={alerts.isError}
          error={alerts.error}
          onRetry={() => void alerts.refetch()}
        />
      ) : alerts.data && alerts.data.length > 0 ? (
        <View className="gap-3">
          {alerts.data.map((alert) => (
            <Pressable
              key={alert.alert_id}
              onPress={() => handleAlertPress(alert)}
              className={`bg-surface border rounded-card p-4 flex-row items-center justify-between active:opacity-70 ${
                alert.severity === "HIGH" ? "border-coral" : "border-border"
              }`}
            >
              <MaterialIcons name="chevron-left" size={24} color="#534AB7" />
              <View className="flex-1 mr-4">
                <Text className="text-base font-bold text-ink text-right font-rubik mb-1">
                  {getAlertTitle(alert.alert_type, alert.details)}
                </Text>
                <Text className="text-sm text-ink-2 text-right">
                  {getAlertDesc(alert.alert_type, alert.details)}
                </Text>
              </View>
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  alert.severity === "HIGH" ? "bg-coral-bg" : "bg-amber-bg"
                }`}
              >
                <MaterialIcons
                  name={getAlertIcon(alert.alert_type)}
                  size={20}
                  color={alert.severity === "HIGH" ? "#CC3333" : "#BA7517"}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="bg-teal-bg border border-teal rounded-card p-6 items-center mt-4">
          <MaterialIcons name="check-circle" size={48} color="#0F6E56" className="mb-2" />
          <Text className="text-lg font-bold text-teal-ink font-rubik mt-2">
            הכל תקין! תור המשימות ריק.
          </Text>
        </View>
      )}
      
      <View className="h-10" />
    </ScrollView>
  );
}
