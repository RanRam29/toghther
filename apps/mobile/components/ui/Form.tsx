import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-ink-2 mb-2">{label}</Text>
      <TextInput
        placeholderTextColor="#918D84"
        className={`bg-surface border rounded-card px-4 py-4 text-ink text-base ${
          error ? "border-coral" : "border-border"
        } ${className ?? ""}`}
        {...props}
      />
      {error ? <Text className="text-coral text-sm mt-1">{error}</Text> : null}
    </View>
  );
}

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  return (
    <View className="mb-6">
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        className="bg-surface border border-border rounded-card px-4 py-5 text-ink text-2xl text-center tracking-[12px] font-rubik"
        placeholder={"•".repeat(length)}
        placeholderTextColor="#D0CCC2"
      />
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "purple" | "teal";
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "purple",
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const bgClass = variant === "purple" ? "bg-purple" : "bg-teal";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${bgClass} rounded-card py-4 px-6 items-center ${
        isDisabled ? "opacity-60" : "active:opacity-90"
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-white text-base font-semibold font-rubik">{label}</Text>
      )}
    </Pressable>
  );
}

interface RoleCardProps {
  title: string;
  description: string;
  selected?: boolean;
  onPress?: () => void;
}

export function RoleCard({ title, description, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-card p-5 mb-4 border ${
        selected
          ? "bg-purple-bg border-purple"
          : "bg-surface border-border active:opacity-90"
      }`}
    >
      <Text
        className={`text-lg font-semibold mb-2 font-rubik ${
          selected ? "text-purple-ink" : "text-ink"
        }`}
      >
        {title}
      </Text>
      <Text className="text-sm text-ink-2 leading-5">{description}</Text>
    </Pressable>
  );
}

interface PlaceholderCardProps {
  text: string;
}

export function PlaceholderCard({ text }: PlaceholderCardProps) {
  return (
    <View className="bg-surface border border-border rounded-card p-5">
      <Text className="text-ink-2 text-center leading-6">{text}</Text>
    </View>
  );
}

interface ScreenShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function ScreenShell({
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  headerRight,
}: ScreenShellProps) {
  return (
    <View className="flex-1 bg-bg px-6 pt-16">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {eyebrow ? (
            <Text className="text-xs font-bold text-purple uppercase tracking-widest mb-3 font-rubik">
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-3xl font-bold text-ink mb-2 font-rubik">{title}</Text>
        </View>
        {headerRight && <View className="mt-2 ml-4">{headerRight}</View>}
      </View>
      {subtitle ? (
        <Text className="text-base text-ink-2 mb-8 leading-6">{subtitle}</Text>
      ) : null}
      <View className="flex-1">{children}</View>
      {footer}
    </View>
  );
}

interface LanguageToggleProps {
  language: "he" | "en";
  onToggle: () => void;
  label: string;
}

export function LanguageToggle({ language, onToggle, label }: LanguageToggleProps) {
  return (
    <Pressable onPress={onToggle} className="self-end mb-4">
      <Text className="text-purple font-medium font-rubik">
        {label}: {language === "he" ? "עברית" : "English"}
      </Text>
    </Pressable>
  );
}
