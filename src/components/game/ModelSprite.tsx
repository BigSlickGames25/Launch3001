import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme";
import { ModelSpriteProps } from "./model-types";

export function ModelSprite({
  height,
  kind,
  label,
  left,
  rotation = 0,
  thrusting = false,
  top,
  width
}: ModelSpriteProps) {
  if (kind === "launchpad") {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.padShell,
          {
            height,
            left,
            top,
            width
          }
        ]}
      >
        <View
          style={[
            styles.padBody,
            label === "LAND" ? styles.padBodyFinish : styles.padBodyStart
          ]}
        />
        {label ? <Text style={styles.padLabel}>{label}</Text> : null}
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.rocketShell,
        {
          height,
          left,
          top,
          transform: [{ rotate: `${rotation}rad` }],
          width
        }
      ]}
    >
      {thrusting ? (
        <View
          style={[
            styles.rocketFlame,
            {
              height: Math.max(18, height * 0.22),
              top: height * 0.82,
              width: Math.max(16, width * 0.22)
            }
          ]}
        />
      ) : null}
      <View style={[styles.rocketBody, { borderRadius: Math.max(8, width * 0.18) }]} />
      <View
        style={[
          styles.rocketWindow,
          {
            height: Math.max(7, width * 0.11),
            marginLeft: -Math.max(3.5, width * 0.055),
            width: Math.max(7, width * 0.11)
          }
        ]}
      />
      <View
        style={[
          styles.rocketFinLeft,
          {
            borderBottomWidth: Math.max(12, height * 0.2),
            borderLeftWidth: Math.max(9, width * 0.18),
            marginLeft: -Math.max(16, width * 0.3)
          }
        ]}
      />
      <View
        style={[
          styles.rocketFinRight,
          {
            borderBottomWidth: Math.max(12, height * 0.2),
            borderRightWidth: Math.max(9, width * 0.18),
            marginLeft: Math.max(6, width * 0.1)
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  padShell: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  padBody: {
    borderRadius: 999,
    borderWidth: 1,
    height: "100%",
    width: "100%"
  },
  padBodyStart: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: "rgba(125, 199, 255, 0.58)"
  },
  padBodyFinish: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderColor: "rgba(255, 190, 120, 0.62)"
  },
  padLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.1,
    position: "absolute",
    textTransform: "uppercase"
  },
  rocketShell: {
    alignItems: "center",
    position: "absolute"
  },
  rocketBody: {
    backgroundColor: "#d8e5f7",
    borderColor: "rgba(255,255,255,0.66)",
    borderWidth: 1,
    bottom: 0,
    left: "50%",
    marginLeft: -9,
    position: "absolute",
    top: 0,
    width: 18
  },
  rocketWindow: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    left: "50%",
    position: "absolute",
    top: "30%"
  },
  rocketFinLeft: {
    backgroundColor: "transparent",
    borderBottomColor: "#f97316",
    borderLeftColor: "transparent",
    bottom: 0,
    left: "50%",
    position: "absolute"
  },
  rocketFinRight: {
    backgroundColor: "transparent",
    borderBottomColor: "#f97316",
    borderRightColor: "transparent",
    bottom: 0,
    left: "50%",
    position: "absolute"
  },
  rocketFlame: {
    backgroundColor: "rgba(251, 191, 36, 0.92)",
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    left: "50%",
    marginLeft: -9,
    position: "absolute"
  }
});
