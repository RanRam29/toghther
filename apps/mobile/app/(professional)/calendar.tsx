import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenShell, PrimaryButton, TextField } from "@/components/ui/Screen";
import { useMonthlyAttendance, useMarkDaysOffRange } from "@/hooks/useProfessionalTools";
import { BrandSpinner } from "@/components/motion/BrandSpinner";

export default function ProfessionalCalendarScreen() {
  const { t, i18n } = useTranslation();
  const now = new Date();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    return d;
  });

  const monthStr = currentWeekStart.toISOString().split("T")[0];
  const { data, isLoading } = useMonthlyAttendance(monthStr);

  const prevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(prev.getDate() + 7);
      return d;
    });
  };

  const weekLabel = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    day: "numeric" }).format(currentWeekStart) + " - " + new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    day: "numeric" }).format(new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6));

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [startDate, setStartDate] = useState(now.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  
  // Initialize selectedMatch if data is available
  useEffect(() => {
    if (data && data.length > 0 && !selectedMatch) {
      setSelectedMatch(data[0].match_id);
    }
  }, [data, selectedMatch]);
  
  const markDaysOff = useMarkDaysOffRange();

  const handleMarkOff = async () => {
    if (!selectedMatch) return;
    try {
      await markDaysOff.markDaysOffRange({
        matchId: selectedMatch,
        startDate,
        endDate,
        reason
      });
      setIsModalVisible(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <ScreenShell
      eyebrow="כלים מקצועיים"
      title="יומן שבועי מאוחד"
      showBack
      backFallbackHref="/(professional)/today"
    >
      <View className="flex-row items-center justify-between bg-surface border border-border rounded-full px-4 py-2 mb-4 mt-2">
        <Pressable onPress={prevWeek} className="px-2 py-1">
          <Text className="text-purple font-bold text-lg font-rubik">&lt;</Text>
        </Pressable>
        <Text className="text-base font-bold text-ink font-rubik text-center">{weekLabel}</Text>
        <Pressable onPress={nextWeek} className="px-2 py-1">
          <Text className="text-purple font-bold text-lg font-rubik">&gt;</Text>
        </Pressable>
      </View>

      <PrimaryButton 
        label="דווח חופשה מרוכזת" 
        onPress={() => setIsModalVisible(true)} 
        variant="teal" 
      />

      <ScrollView className="flex-1 mt-6" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <BrandSpinner size="large" />
        ) : !data || data.length === 0 ? (
          <View className="bg-surface border border-border rounded-card p-5 mt-4">
            <Text className="text-ink-2 text-center leading-6">
              אין שיבוצים פעילים
            </Text>
          </View>
        ) : (
          <View className="gap-4 mb-8">
            {[0,1,2,3,4,5,6].map(dayOffset => {
              const dayDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + dayOffset);
              const dayIso = dayDate.toISOString().split("T")[0];
              const dayLabel = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(dayDate);
              
              const dayItems = data.map(match => {
                const isAttended = match.attended_dates.includes(dayIso);
                const isOff = match.off_dates.includes(dayIso);
                if (!isAttended && !isOff) return null;
                return { match, isAttended, isOff };
              }).filter(Boolean);

              return (
                <View key={dayOffset} className="bg-surface border border-border rounded-card p-4">
                  <Text className="text-base font-bold text-ink mb-2 font-rubik text-start">
                    {dayLabel} - {dayDate.getDate()} בחודש
                  </Text>
                  
                  {dayItems.length === 0 ? (
                    <Text className="text-sm text-ink-2 text-start">אין פעילות מדווחת</Text>
                  ) : (
                    dayItems.map((item, idx) => (
                      <View key={idx} className="flex-row items-center mt-1">
                        <Text className="text-sm text-ink font-rubik flex-1 text-start">
                          ליווי של {item!.match.child_name}
                        </Text>
                        {item!.isAttended && (
                          <Text className="text-xs font-bold text-teal bg-teal-bg px-2 py-1 rounded-full">נוכחות</Text>
                        )}
                        {item!.isOff && (
                          <Text className="text-xs font-bold text-amber bg-sand px-2 py-1 rounded-full">חופשה</Text>
                        )}
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface p-6 rounded-t-3xl min-h-[60%]">
            <Text className="text-xl font-bold text-purple mb-4 text-center font-rubik">
              דיווח חופשה מרוכזת
            </Text>
            
            <Text className="text-sm text-ink font-bold mb-2 text-start">בחר ליווי:</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {data?.map(m => (
                <Pressable 
                  key={m.match_id} 
                  onPress={() => setSelectedMatch(m.match_id)}
                  className={`px-3 py-2 border rounded-full ${selectedMatch === m.match_id ? 'bg-purple border-purple' : 'border-border'}`}
                >
                  <Text className={`text-sm ${selectedMatch === m.match_id ? 'text-white' : 'text-ink'}`}>
                    {m.child_name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextField 
              label="תאריך התחלה (YYYY-MM-DD)" 
              value={startDate} 
              onChangeText={setStartDate} 
              className="mb-4"
            />
            
            <TextField 
              label="תאריך סיום (YYYY-MM-DD)" 
              value={endDate} 
              onChangeText={setEndDate} 
              className="mb-4"
            />

            <TextField 
              label="סיבה (רשות)" 
              value={reason} 
              onChangeText={setReason} 
              className="mb-6"
            />

            <View className="gap-3">
              <PrimaryButton 
                label="שמור דיווח" 
                onPress={handleMarkOff} 
                loading={markDaysOff.isPending}
                variant="teal" 
              />
              <PrimaryButton 
                label="ביטול" 
                onPress={() => setIsModalVisible(false)} 
                variant="teal" 
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
