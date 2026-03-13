import { Href, router } from "expo-router";
import { startTransition } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { GameButton } from "../components/ui/GameButton";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";

export function HomeScreen() {
  const device = useDeviceProfile();
  const { settings } = useGameSettings();
  const isWide = device.isLandscape || device.width >= 860;
  const isCompact = device.width < 390;
  const titleFontSize = Math.round(clamp(40 * device.textScale, 30, 46));

  function navigate(path: Href, cue: "confirm" | "tap" = "tap") {
    void fireHaptic(settings.haptics, cue);

    startTransition(() => {
      router.push(path);
    });
  }

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
    >
      <View style={[styles.topRow, isWide && styles.topRowWide]}>
        <View
          style={[
            styles.heroCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.kicker}>Launch3001</Text>
          <Text
            style={[
              styles.title,
              {
                fontSize: titleFontSize,
                lineHeight: titleFontSize + 4
              }
            ]}
          >
            Survive 30 moon-tunnel sectors in one run.
          </Text>
          <Text style={styles.description}>
            Tilt steers the rocket through lunar corridors, hold thrust to burn
            against gravity, and land softly on the right-side pad. Any crash
            or hard touchdown throws the run back to level 1.
          </Text>
          <View style={styles.inlineChips}>
            <InlineChip label="Tilt steer" />
            <InlineChip label="Tap + hold thrust" />
            <InlineChip label="Moon tunnel" />
            <InlineChip label="No saves" />
            <InlineChip label="30-level run" />
          </View>
        </View>

        <View
          style={[
            styles.notesCard,
            isWide && styles.splitPanel,
            isCompact && styles.compactCard
          ]}
        >
          <Text style={styles.notesTitle}>Prototype Status</Text>
          <Text style={styles.notesText}>
            Gameplay, level flow, crash rules, and camera behavior are live.
            The current target is a retro lunar run with chunky pixel-style UI,
            moon-tunnel silhouettes, and phone-tilt flight. Native gameplay
            renders the rocket and launchpad models while web keeps the lighter
            2D fallback path.
          </Text>
          <Text style={styles.notesMeta}>
            Expected source files: Rocket.obj, Rocket.mtl, Launchpad.obj,
            Launchpad.mtl
          </Text>
          <Text style={styles.notesMeta}>
            Runtime path: native GLB render, web 2D fallback
          </Text>
        </View>
      </View>

      <View style={[styles.bottomRow, isWide && styles.bottomRowWide]}>
        <View style={[styles.featureGrid, isWide && styles.bottomPanel]}>
          <FeatureChip
            compact={isCompact}
            label="Run Rule"
            value="Fail any level and restart from 1"
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Physics"
            value="Momentum, gravity, thrust, and landing thresholds"
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Camera"
            value="Dynamic pan, zoom, and look-ahead"
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Controls"
            value={
              settings.orientation === "landscape"
                ? "Landscape play tuned"
                : settings.orientation === "portrait"
                  ? "Portrait play tuned"
                  : "Adaptive orientation"
            }
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="HUD"
            value={
              settings.handPreference === "left"
                ? "Left-hand thrust layout"
                : "Right-hand thrust layout"
            }
            wide={isWide}
          />
          <FeatureChip
            compact={isCompact}
            label="Feedback"
            value={`Haptics ${settings.haptics}`}
            wide={isWide}
          />
        </View>

        <View style={[styles.buttonStack, isWide && styles.bottomPanel]}>
          <GameButton
            label="Start Launch3001"
            onPress={() => {
              navigate("/game" as Href, "confirm");
            }}
            subtitle="Enter Launch3001 immediately"
            tone="primary"
          />
          <GameButton
            label="Launch Bay"
            onPress={() => {
              navigate("/launcher" as Href);
            }}
            subtitle="Read the mission ramp, lunar vibe, and run structure"
          />
          <GameButton
            label="How To Play"
            onPress={() => {
              navigate("/how-to-play" as Href);
            }}
            subtitle="Controls, fail state, landing rules, and device fallback"
          />
          <GameButton
            label="Settings"
            onPress={() => {
              navigate("/settings" as Href);
            }}
            subtitle="Orientation, haptics, handedness, and touch labels"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function InlineChip({ label }: { label: string }) {
  return (
    <View style={styles.inlineChip}>
      <Text style={styles.inlineChipText}>{label}</Text>
    </View>
  );
}

function FeatureChip({
  compact,
  label,
  value,
  wide
}: {
  compact?: boolean;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View
      style={[
        styles.featureChip,
        wide && styles.featureChipWide,
        compact && styles.featureChipCompact
      ]}
    >
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={styles.featureValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: "auto",
    maxWidth: 1180,
    paddingBottom: theme.spacing.xxxl + 96,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  contentWide: {
    gap: theme.spacing.xl
  },
  topRow: {
    gap: theme.spacing.lg
  },
  topRowWide: {
    flexDirection: "row"
  },
  bottomRow: {
    gap: theme.spacing.lg
  },
  bottomRowWide: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  splitPanel: {
    flex: 1
  },
  bottomPanel: {
    flex: 1
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  compactCard: {
    padding: theme.spacing.lg
  },
  kicker: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    flexShrink: 1,
    fontFamily: theme.fonts.display,
    lineHeight: 38
  },
  description: {
    color: theme.colors.subtleText,
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24
  },
  inlineChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  inlineChip: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8
  },
  inlineChipText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  featureChip: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.lg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: 6,
    minWidth: "47%",
    padding: theme.spacing.md
  },
  featureChipWide: {
    minWidth: "31%"
  },
  featureChipCompact: {
    minWidth: "100%"
  },
  featureLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  featureValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  buttonStack: {
    gap: theme.spacing.md
  },
  notesCard: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: theme.radius.xl,
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  notesTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  notesText: {
    color: theme.colors.subtleText,
    flexShrink: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 23
  },
  notesMeta: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    lineHeight: 19
  }
});
