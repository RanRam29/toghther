import { Text, View } from "react-native";

interface TrendChartProps {
  title: string;
  emptyLabel: string;
  insufficientLabel: string;
  metricLabels: Record<string, string>;
  metricKeys: string[];
  logs: Array<{ log_date: string; metrics: Record<string, number> | null }>;
}

function formatDay(dateStr: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(
      new Date(dateStr),
    );
  } catch {
    return dateStr.slice(5);
  }
}

export function TrendChart({
  title,
  emptyLabel,
  insufficientLabel,
  metricLabels,
  metricKeys,
  logs,
}: TrendChartProps) {
  const recent = [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .slice(-7);

  if (recent.length === 0) {
    return (
      <View className="bg-surface border border-border rounded-card p-5 mb-4">
        <Text className="text-base font-bold text-ink mb-2 font-rubik">{title}</Text>
        <Text className="text-sm text-ink-2">{emptyLabel}</Text>
      </View>
    );
  }

  if (recent.length < 3) {
    return (
      <View className="bg-surface border border-border rounded-card p-5 mb-4">
        <Text className="text-base font-bold text-ink mb-2 font-rubik">{title}</Text>
        <Text className="text-sm text-ink-2">{insufficientLabel}</Text>
      </View>
    );
  }

  const primaryKey = metricKeys[0];
  if (!primaryKey) {
    return null;
  }

  const maxValue = 5;

  return (
    <View className="bg-surface border border-border rounded-card p-5 mb-4">
      <Text className="text-base font-bold text-ink mb-1 font-rubik">{title}</Text>
      <Text className="text-xs text-teal mb-4">
        {metricLabels[primaryKey] ?? primaryKey}
      </Text>
      <View className="flex-row items-end justify-between gap-2 h-28">
        {recent.map((log) => {
          const value = log.metrics?.[primaryKey] ?? 0;
          const heightPct = Math.max(8, (value / maxValue) * 100);
          return (
            <View key={log.log_date} className="flex-1 items-center">
              <View
                className="w-full rounded-t-md bg-purple"
                style={{ height: `${heightPct}%` }}
              />
              <Text className="text-[10px] text-ink-2 mt-1 text-center">
                {formatDay(log.log_date, "he")}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
