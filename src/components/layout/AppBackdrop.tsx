import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { theme } from "../../theme";

export function AppBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.backgroundAlt,
          theme.colors.background
        ]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.moon} />
      <View style={styles.craterA} />
      <View style={styles.craterB} />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
    </View>
  );
}

const styles = StyleSheet.create({
  moon: {
    backgroundColor: "rgba(250, 228, 181, 0.14)",
    borderColor: "rgba(255, 245, 219, 0.12)",
    borderRadius: 220,
    borderWidth: 1,
    height: 220,
    position: "absolute",
    right: 44,
    top: 56,
    width: 220
  },
  craterA: {
    backgroundColor: "rgba(255, 234, 194, 0.08)",
    borderRadius: 60,
    height: 60,
    position: "absolute",
    right: 142,
    top: 118,
    width: 60
  },
  craterB: {
    backgroundColor: "rgba(255, 234, 194, 0.06)",
    borderRadius: 38,
    height: 38,
    position: "absolute",
    right: 88,
    top: 174,
    width: 38
  },
  orbA: {
    backgroundColor: "rgba(125, 211, 252, 0.08)",
    borderRadius: 240,
    height: 240,
    left: -54,
    position: "absolute",
    top: 64,
    width: 240
  },
  orbB: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 300,
    bottom: 24,
    height: 260,
    position: "absolute",
    right: -84,
    width: 300
  }
});
