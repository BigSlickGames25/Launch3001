import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme";

export function ThrustButton({
  active,
  onPressIn,
  onPressOut,
  showGuide,
  size
}: {
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  showGuide?: boolean;
  size: number;
}) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.button,
          {
            borderRadius: size / 2,
            height: size,
            width: size
          },
          active && styles.buttonActive,
          pressed && styles.buttonPressed
        ]}
      >
        <Text style={styles.label}>Thrust</Text>
        <Text style={styles.subLabel}>Hold</Text>
      </Pressable>
      {showGuide ? <Text style={styles.caption}>Tap and hold for burn</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    justifyContent: "center",
    shadowColor: theme.colors.surface,
    shadowOffset: {
      height: 0,
      width: 0
    },
    shadowOpacity: 0.28,
    shadowRadius: 24
  },
  buttonActive: {
    backgroundColor: theme.colors.surfacePressed,
    transform: [{ scale: 1.02 }]
  },
  buttonPressed: {
    opacity: 0.92
  },
  label: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20,
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  subLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.1,
    marginTop: 4,
    textTransform: "uppercase"
  },
  caption: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  }
});
