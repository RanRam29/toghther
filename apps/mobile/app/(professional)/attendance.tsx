import { useState } from "react";
import { View, Text, ScrollView, Pressable, Share } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenShell, PrimaryButton } from "@/components/ui/Screen";
import { useMonthlyAttendance } from "@/hooks/useProfessionalTools";
import { errorMessage, showError } from "@/lib/feedback";
import { BrandSpinner } from "@/components/motion/BrandSpinner";

export default function AttendanceScreen() {
  const { t, i18n } = useTranslation();
  
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  
  // Format as YYYY-MM-01
  const monthStr = currentDate.toISOString().split("T")[0];
  
  const { data, isLoading } = useMonthlyAttendance(monthStr);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric"
  }).format(currentDate);

  const handleShare = async () => {
    if (!data || data.length === 0) return;
    
    try {
      let message = `דוח נוכחות חודשי - ${monthLabel}\n\n`;
      data.forEach((match) => {
        message += `ילד/ה: ${match.child_name}\n`;
        message += `ימי נוכחות: ${match.days_attended}\n`;
        message += `ימי חופשה: ${match.days_off}\n`;
        message += `-----------------\n`;
      });
      message += `\n* כלי עזר לרישום — אינו מסמך חשבונאי *`;
      
      await Share.share({
        message });
    } catch (err) {
      showError(errorMessage(err, t("common.tryAgain")));
    }
  };

  return (
    <ScreenShell
      eyebrow="כלים מקצועיים"
      title="דוח נוכחות חודשי"
      showBack
      backFallbackHref="/(professional)/today"
    >
      <View className="flex-row items-center justify-between bg-surface border border-border rounded-full px-4 py-2 mb-6 mt-2">
        {/* eslint-disable-next-line no-restricted-syntax -- month stepper nav chevron, not a page CTA */}
        <Pressable onPress={prevMonth} className="px-2 py-1">
          <Text className="text-purple font-bold text-lg font-rubik">&lt;</Text>
        </Pressable>
        <Text className="text-base font-bold text-ink font-rubik">{monthLabel}</Text>
        {/* eslint-disable-next-line no-restricted-syntax -- month stepper nav chevron, not a page CTA */}
        <Pressable onPress={nextMonth} className="px-2 py-1">
          <Text className="text-purple font-bold text-lg font-rubik">&gt;</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <BrandSpinner size="large" />
        ) : !data || data.length === 0 ? (
          <View className="bg-surface border border-border rounded-card p-5 mt-4">
            <Text className="text-ink-2 text-center leading-6">
              לא נמצאו נתוני נוכחות לחודש זה
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {data.map((match) => (
              <View key={match.match_id} className="bg-surface border border-border rounded-card p-5">
                <Text className="text-lg font-bold text-purple mb-3 font-rubik text-start">
                  ליווי של {match.child_name}
                </Text>
                
                <View className="flex-row justify-between mb-2">
                  <Text className="text-base text-ink font-rubik text-start">ימי נוכחות (Check-ins):</Text>
                  <Text className="text-base font-bold text-teal font-rubik">{match.days_attended}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-base text-ink font-rubik text-start">ימי חופשה מדווחים:</Text>
                  <Text className="text-base font-bold text-amber font-rubik">{match.days_off}</Text>
                </View>
              </View>
            ))}
            
            <View className="mt-4">
              <PrimaryButton 
                label="שתף דוח שעות" 
                onPress={handleShare} 
                variant="purple" 
              />
            </View>
          </View>
        )}
        
        <View className="mt-8 mb-8 items-center px-4">
          <Text className="text-xs text-ink-2 text-center leading-5">
            כלי עזר לרישום — אינו מסמך חשבונאי
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}
