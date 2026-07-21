import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";

const buttonStyles = tv({
  base: "flex-row items-center justify-center rounded-card px-6 py-4 active:opacity-80 transition-opacity",
  variants: {
    variant: {
      primary: "bg-purple",
      secondary: "bg-teal",
      outline: "border-2 border-purple bg-transparent",
      "outline-secondary": "border-2 border-teal bg-transparent",
      "outline-destructive": "border-2 border-coral bg-transparent",
      "outline-warning": "border-2 border-amber bg-transparent",
      ghost: "bg-transparent",
      destructive: "bg-coral",
      // Neutral: white surface + neutral border (social / alternate-action buttons).
      neutral: "bg-white border border-border",
      // Tonal: soft tinted fill for lower-emphasis actions (matches Badge tones).
      "tonal-primary": "bg-purple-bg",
      "tonal-secondary": "bg-teal-bg",
      "tonal-warning": "bg-amber-bg",
      "tonal-destructive": "bg-coral-bg",
    },
    size: {
      sm: "px-4 py-2",
      md: "px-6 py-4",
      lg: "px-8 py-5",
    },
    disabled: {
      true: "opacity-50",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

const textStyles = tv({
  base: "font-rubik-medium text-base text-center",
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-white",
      outline: "text-purple",
      "outline-secondary": "text-teal",
      "outline-destructive": "text-coral",
      "outline-warning": "text-amber",
      ghost: "text-purple",
      destructive: "text-white",
      neutral: "text-ink",
      "tonal-primary": "text-purple-ink",
      "tonal-secondary": "text-teal-ink",
      "tonal-warning": "text-amber-ink",
      "tonal-destructive": "text-coral-ink",
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

// Spinner colour per variant — mirrors the text colour so the loading state
// reads on the same fill. Values come from lib/theme.
const SPINNER_COLOR: Record<string, string> = {
  primary: "#FFFFFF",
  secondary: "#FFFFFF",
  destructive: "#FFFFFF",
  outline: "#534AB7",
  ghost: "#534AB7",
  "outline-secondary": "#0F6E56",
  "outline-destructive": "#D85A30",
  "outline-warning": "#BA7517",
  neutral: "#24221E",
  "tonal-primary": "#3C3489",
  "tonal-secondary": "#085041",
  "tonal-warning": "#633806",
  "tonal-destructive": "#712B13",
};

type ButtonBaseProps = Omit<TouchableOpacityProps, "children"> &
  VariantProps<typeof buttonStyles> & {
    loading?: boolean;
    icon?: React.ReactNode;
    /** Which side the icon sits on relative to the label. Default "leading". */
    iconPosition?: "leading" | "trailing";
  };

// A button either has a visible text label, or is icon-only — in which case an
// accessibilityLabel is required so the control is still announced.
export type ButtonProps =
  | (ButtonBaseProps & { label: string })
  | (ButtonBaseProps & { label?: undefined; icon: React.ReactNode; accessibilityLabel: string });

export const Button = React.forwardRef<View, ButtonProps>(
  ({ label, variant, size, disabled, loading, icon, iconPosition = "leading", className, style, ...props }, ref) => {
    const iconOnly = !label;
    const trailing = iconPosition === "trailing";
    const iconEl = icon ? (
      <View className={iconOnly ? "" : trailing ? "ml-2" : "mr-2"}>{icon}</View>
    ) : null;
    const labelEl = label ? <Text className={textStyles({ variant, size })}>{label}</Text> : null;
    return (
      <TouchableOpacity
        ref={ref}
        style={style}
        className={buttonStyles({
          variant,
          size,
          disabled: disabled || loading,
          // Icon-only collapses to square padding; caller className still wins.
          className: [iconOnly ? "p-3" : "", className].filter(Boolean).join(" ") || undefined,
        })}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={SPINNER_COLOR[variant ?? "primary"] ?? "#FFFFFF"} />
        ) : (
          <>
            {trailing ? labelEl : iconEl}
            {trailing ? iconEl : labelEl}
          </>
        )}
      </TouchableOpacity>
    );
  }
);
Button.displayName = "Button";
