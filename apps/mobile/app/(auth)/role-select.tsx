import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, View, Pressable, Text, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";


import { AppLogo } from "@/components/ui/AppLogo";
import { changeAppLanguage } from "@/i18n";
import type { UserRole } from "@/lib/types";
import { useLocaleStore } from "@/stores/auth-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { AppPageWidth } from "@/components/ui/AppPageWidth";

export default function RoleSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language, setLanguage } = useLocaleStore();
  const { selectedRole, setSelectedRole } = useOnboardingStore();

  async function toggleLanguage() {
    const next = language === "he" ? "en" : "he";
    setLanguage(next);
    const needsReload = await changeAppLanguage(next);
    if (needsReload) {
      Alert.alert(
        t("common.language"),
        language === "he"
          ? "Restart the app to apply layout direction."
          : "הפעילו מחדש את האפליקציה כדי להחיל כיוון תצוגה."
      );
    }
  }

  function pickRole(role: UserRole) {
    setSelectedRole(role);
  }

  function continueToLogin() {
    if (!selectedRole) return;
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top", "bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="flex-grow">
        <AppPageWidth className="flex-grow px-6 py-6 flex flex-col justify-between">
          
          <View>
            {/* Header Area */}
            <View className="flex-row items-center justify-between mb-12">
              <View className="w-24 h-8 justify-center items-start">
                <AppLogo variant="compact" />
              </View>
              <Pressable 
                onPress={toggleLanguage}
                className="flex-row items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full border border-outline-variant active:opacity-80"
              >
                <MaterialIcons name="language" size={18} color="#474553" />
                <Text className="font-rubik-medium text-sm text-ink-2">
                  עברית / English
                </Text>
              </Pressable>
            </View>

            {/* Title Area */}
            <View className="items-center mb-8">
              <Text className="font-rubik-bold text-2xl text-ink mb-2 text-center">
                {t("auth.roleSelectTitle", "איך תרצו להשתמש בפלטפורמה?")}
              </Text>
              <Text className="font-rubik text-base text-ink-2 text-center">
                {t("auth.roleSelectSubtitle", "בחרו את התפקיד שלכם כדי שנתאים את החוויה")}
              </Text>
            </View>

            {/* Role Cards Grid */}
            <View className="space-y-4 gap-4">
              {/* Parent Card */}
              <Pressable
                onPress={() => pickRole("parent")}
                className={`relative flex-row items-center gap-4 p-6 rounded-[14px] border transition-colors ${
                  selectedRole === "parent" 
                    ? "border-purple bg-purple-bg/40" 
                    : "border-border bg-surface active:opacity-80"
                }`}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedRole === "parent" ? "bg-purple" : "bg-surface-2"
                }`}>
                  <MaterialIcons 
                    name="child-care" 
                    size={28} 
                    color={selectedRole === "parent" ? "#FFF" : "#5F5C55"} 
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-rubik-medium text-xl mb-1 ${
                    selectedRole === "parent" ? "text-purple" : "text-ink"
                  }`}>
                    {t("auth.roleParent", "אני הורה")}
                  </Text>
                  <Text className="font-rubik text-base text-ink-2 leading-6">
                    {t("auth.roleParentDesc", "מחפש/ת משלבת מתאימה לילד/ה שלי")}
                  </Text>
                </View>
                {selectedRole === "parent" && (
                  <View className="absolute top-4 left-4">
                    <MaterialIcons name="check-circle" size={24} color="#534AB7" />
                  </View>
                )}
              </Pressable>

              {/* Professional Card */}
              <Pressable
                onPress={() => pickRole("professional")}
                className={`relative flex-row items-center gap-4 p-6 rounded-[14px] border transition-colors ${
                  selectedRole === "professional" 
                    ? "border-purple bg-purple-bg/40" 
                    : "border-border bg-surface active:opacity-80"
                }`}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedRole === "professional" ? "bg-purple" : "bg-surface-2"
                }`}>
                  <MaterialIcons 
                    name="school" 
                    size={28} 
                    color={selectedRole === "professional" ? "#FFF" : "#5F5C55"} 
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-rubik-medium text-xl mb-1 ${
                    selectedRole === "professional" ? "text-purple" : "text-ink"
                  }`}>
                    {t("auth.roleProfessional", "אני משלבת")}
                  </Text>
                  <Text className="font-rubik text-base text-ink-2 leading-6">
                    {t("auth.roleProfessionalDesc", "מחפשת עבודה עם ילדים עם צרכים מיוחדים")}
                  </Text>
                </View>
                {selectedRole === "professional" && (
                  <View className="absolute top-4 left-4">
                    <MaterialIcons name="check-circle" size={24} color="#534AB7" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Footer Area */}
          <View className="mt-12 items-center w-full gap-4 pb-6">
            <Pressable
              onPress={continueToLogin}
              disabled={!selectedRole}
              className={`w-full h-[52px] rounded-[14px] flex-row items-center justify-center shadow-sm active:scale-[0.98] transition-transform ${
                selectedRole ? "bg-purple" : "bg-purple/50"
              }`}
            >
              <Text className="font-rubik-medium text-lg text-white mx-2">
                {t("common.continue", "המשך")}
              </Text>
              <MaterialIcons name="arrow-back" size={20} color="#FFF" />
            </Pressable>
            
            <Pressable onPress={() => router.replace("/(auth)/login")} className="p-2">
              <Text className="font-rubik-medium text-base text-purple active:opacity-70">
                {t("auth.backToLogin", "חזרה להתחברות")}
              </Text>
            </Pressable>
          </View>

        </AppPageWidth>
      </ScrollView>
    </SafeAreaView>
  );
}
