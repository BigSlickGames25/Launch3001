import { useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import { clamp, theme } from "../../theme";

export function SteeringSlider({
  onChange,
  showGuide,
  size,
  value
}: {
  onChange: (value: number) => void;
  showGuide?: boolean;
  size: number;
  value: number;
}) {
  const trackWidth = size;
  const knobSize = 34;
  const range = Math.max(1, trackWidth - knobSize);
  const [dragValue, setDragValue] = useState(value);

  function setFromDelta(deltaX: number) {
    const nextValue = clamp(deltaX / (range / 2), -1, 1);
    setDragValue(nextValue);
    onChange(nextValue);
  }

  function reset() {
    setDragValue(0);
    onChange(0);
  }

  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setDragValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      setFromDelta(gestureState.dx);
    },
    onPanResponderRelease: reset,
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false
  });

  const displayedValue = Math.abs(dragValue) > 0.001 ? dragValue : value;
  const knobTranslate = displayedValue * (range / 2);

  return (
    <View style={styles.wrapper}>
      <View
        {...responder.panHandlers}
        style={[
          styles.track,
          {
            borderRadius: size / 2,
            width: trackWidth
          }
        ]}
      >
        <View style={styles.centerLine} />
        <View
          style={[
            styles.knob,
            {
              borderRadius: knobSize / 2,
              height: knobSize,
              transform: [{ translateX: knobTranslate }],
              width: knobSize
            }
          ]}
        />
      </View>
      <View style={styles.readoutRow}>
        <Text style={styles.readoutLabel}>Left</Text>
        <Text style={styles.readoutValue}>
          {displayedValue > 0 ? "Right bias" : displayedValue < 0 ? "Left bias" : "Trimmed"}
        </Text>
        <Text style={styles.readoutLabel}>Right</Text>
      </View>
      {showGuide ? <Text style={styles.caption}>Touch steering fallback</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm
  },
  track: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: theme.colors.border,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 6
  },
  centerLine: {
    backgroundColor: "rgba(255,255,255,0.18)",
    height: 18,
    left: "50%",
    marginLeft: -1,
    position: "absolute",
    width: 2
  },
  knob: {
    alignSelf: "center",
    backgroundColor: theme.colors.accent
  },
  readoutRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  readoutLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  readoutValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  },
  caption: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  }
});
