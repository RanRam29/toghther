import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useState, useMemo } from "react";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ScreenShell } from "@/components/ui/Screen";
import { useProgressReport } from "@/hooks/useProgressReport";
import { supabase } from "@/lib/supabase";

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const RANGES = [
  { id: "30d", label: "30 ימים", days: 30 },
  { id: "90d", label: "3 חודשים", days: 90 },
  { id: "all", label: "מתחילת הדרך", days: 365 },
];

export default function ProgressReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = params.childId ?? "";

  const [rangeDays, setRangeDays] = useState(90);

  const { fromDate, toDate } = useMemo(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - rangeDays);
    return { fromDate: formatDate(start), toDate: formatDate(today) };
  }, [rangeDays]);

  const { data: report, isLoading, isError, error } = useProgressReport(childId, fromDate, toDate);

  async function handleExport() {
    if (!report) return;
    
    Alert.alert(
      t("report.exportWarningTitle", "שמירה על פרטיות"),
      t("report.exportWarningMessage", "הדוח כולל מידע אישי על הילד. שתפי אותו רק עם מי שאת סומכת עליו."),
      [
        { text: t("cancel", "ביטול"), style: "cancel" },
        { text: t("report.exportConfirm", "הבנתי, המשך"), onPress: generatePdf }
      ]
    );
  }

  async function generatePdf() {
    try {
      // track event
      await supabase.rpc('track_event', { p_event_name: 'progress_report_generated', p_properties: { period_days: rangeDays } });
      
      const html = `
        <html dir="rtl">
          <head>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1F2937; }
              h1 { color: #534AB7; margin-bottom: 5px; }
              .subtitle { color: #6B7280; margin-bottom: 30px; font-size: 14px; }
              .card { border: 1px solid #E5E7EB; padding: 20px; margin-bottom: 25px; border-radius: 12px; background-color: #F9FAFB; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .metric-box { padding: 10px; }
              .metric-label { font-size: 14px; color: #6B7280; margin-bottom: 5px; }
              .metric-value { font-size: 24px; font-weight: bold; color: #111827; }
              h2 { color: #374151; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #534AB7; padding-bottom: 5px; display: inline-block; }
              ul { list-style-type: none; padding: 0; }
              li { padding: 10px 0; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <h1>דוח התקדמות</h1>
            <div class="subtitle">תקופה: ${report?.period.from} עד ${report?.period.to}</div>
            
            <div class="card grid">
              <div class="metric-box">
                <div class="metric-label">ימי נוכחות מדווחים</div>
                <div class="metric-value">${report?.metrics.days_attended ?? 0}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">סה"כ דיווחים (Logs)</div>
                <div class="metric-value">${report?.metrics.total_logs ?? 0}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">ממוצע מצב רוח</div>
                <div class="metric-value">${report?.metrics.avg_mood ? report.metrics.avg_mood.toFixed(1) : '-'} / 5</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">ימי היעדרות/חופשה</div>
                <div class="metric-value">${report?.metrics.days_off ?? 0}</div>
              </div>
            </div>

            <h2>צוות מלווה בתקופה זו</h2>
            <div class="card">
              <ul>
                ${report?.matches_breakdown.map(m => `
                  <li>
                    <strong>${m.professional_name}</strong>
                    <span>${m.days_attended} ימי נוכחות</span>
                  </li>
                `).join('') ?? '<li>אין נתונים</li>'}
              </ul>
            </div>
            
            <div style="margin-top: 50px; font-size: 12px; color: #9CA3AF; text-align: center;">
              הופק באמצעות Together
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        // On web, Print.printAsync can be used to show the browser print dialog
        await Print.printAsync({ html });
        await supabase.rpc('track_event', { p_event_name: 'progress_report_shared', p_properties: { period_days: rangeDays, platform: 'web' } });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        await supabase.rpc('track_event', { p_event_name: 'progress_report_shared', p_properties: { period_days: rangeDays } });
      }
    } catch (err: any) {
      Alert.alert(t("error"), err.message);
    }
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("report.title", "דוח התקדמות")} showBack>
        <ActivityIndicator size="large" color="#534AB7" className="mt-8" />
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell title={t("report.title", "דוח התקדמות")} showBack>
        <View className="p-4">
          <Text className="text-red-500 text-center">{error?.message}</Text>
        </View>
      </ScreenShell>
    );
  }

  const hasEnoughData = (report?.metrics.days_attended ?? 0) >= 3;

  return (
    <ScreenShell title={t("report.title", "דוח התקדמות")} showBack>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        
        <View className="mb-6">
          <Text className="text-sm font-semibold text-ink-2 mb-2 text-start">בחר טווח:</Text>
          <View className="flex-row gap-2 justify-start">
            {RANGES.map(r => (
              <Pressable
                key={r.id}
                onPress={() => setRangeDays(r.days)}
                className={`px-4 py-2 rounded-lg border ${rangeDays === r.days ? "bg-teal border-teal" : "bg-white border-border"}`}
              >
                <Text className={`font-semibold ${rangeDays === r.days ? "text-white" : "text-ink-2"}`}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!hasEnoughData ? (
          <View className="bg-surface border border-border rounded-card p-6 mb-8 items-center">
            <Text className="text-xl font-bold text-ink mb-2">עוד קצת וזה מוכן</Text>
            <Text className="text-center text-ink-2 mb-4 leading-6">
              כדי להפיק דוח התקדמות משמעותי, המערכת אוספת נתונים מ-3 ימי ליווי לפחות בתקופה זו.
            </Text>
            <Text className="text-center text-ink-2">
              בינתיים, ניתן לראות את הדיווחים היומיים בדף היום שלי או ביומן הפגישות.
            </Text>
          </View>
        ) : (
          <>
            <View className="bg-surface border border-border rounded-card p-5 mb-6">
              <Text className="text-lg font-bold text-ink mb-4 text-start">סיכום התקופה</Text>
              <View className="flex-row flex-wrap gap-y-4">
                <View className="w-[50%] pr-2">
                  <Text className="text-xs text-ink-2 text-start">ימי נוכחות</Text>
                  <Text className="text-2xl font-bold text-ink text-start">{report?.metrics.days_attended}</Text>
                </View>
                <View className="w-[50%] pl-2">
                  <Text className="text-xs text-ink-2 text-start">דיווחי משלבת</Text>
                  <Text className="text-2xl font-bold text-ink text-start">{report?.metrics.total_logs}</Text>
                </View>
                <View className="w-[50%] pr-2">
                  <Text className="text-xs text-ink-2 text-start">ממוצע מצב רוח</Text>
                  <Text className="text-2xl font-bold text-ink text-start">
                    {report?.metrics.avg_mood ? report.metrics.avg_mood.toFixed(1) : '-'} <Text className="text-sm font-normal text-ink-2">/ 5</Text>
                  </Text>
                </View>
                <View className="w-[50%] pl-2">
                  <Text className="text-xs text-ink-2 text-start">ימי חופשה/ביטול</Text>
                  <Text className="text-2xl font-bold text-ink text-start">{report?.metrics.days_off}</Text>
                </View>
              </View>
            </View>

            {report?.weekly_trends && report.weekly_trends.length > 0 && (
              <View className="bg-surface border border-border rounded-card p-5 mb-6">
                <Text className="text-lg font-bold text-ink mb-4 text-start">מגמת מצב רוח שבועית</Text>
                <View className="flex-row items-end h-32 gap-2 border-b border-border w-max min-w-[280px]">
                  {report.weekly_trends.map((w, i) => {
                    const hPct = w.avg_mood ? (w.avg_mood / 5) * 100 : 0;
                    return (
                      <View key={i} className="flex-1 items-center">
                        <View className="w-full rounded-t-sm bg-purple" style={{ height: `${Math.max(hPct, 5)}%` }} />
                        <Text className="text-[10px] text-ink-2 mt-1 text-center" numberOfLines={1}>{formatDate(new Date(w.week_start)).slice(5)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <Pressable
              onPress={handleExport}
              className="bg-purple rounded-full py-4 items-center mb-8 active:opacity-90"
            >
              <Text className="text-white font-bold font-rubik text-base">
                {t("report.exportAction", "שתף דוח ב-PDF")}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}
