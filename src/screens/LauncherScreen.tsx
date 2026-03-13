import { Href, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { GameButton } from "../components/ui/GameButton";
import { theme } from "../theme";

export function LauncherScreen() {
  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Launch3001 Bay</Text>
        <Text style={styles.title}>Moon-tunnel run structure and asset handoff.</Text>
        <Text style={styles.description}>
          Launch3001 is built as a single-run arcade game. Clear each stage in
          sequence, survive all 30 sectors without saves, and fail once to
          reset the run back to level 1.
        </Text>
      </View>

      <View style={styles.grid}>
        <InfoCard
          body="Level 1 starts from a left-side launch deck. Every stage finishes on a dedicated landing pad. Difficulty rises through tighter gaps, longer routes, more hangar blockers, moon-tunnel pressure, and narrower landing windows."
          title="Mission Flow"
        />
        <InfoCard
          body="The camera follows with look-ahead, opens up when speed and sightlines matter, and tightens when the route or landing approach needs precision."
          title="Camera Behavior"
        />
        <InfoCard
          body="Rocket.obj, Rocket.mtl, Launchpad.obj, Launchpad.mtl, rocket.glb, and launchpad.glb are present. Native gameplay now renders the GLB assets through an Expo GL and Three.js model layer. Web still uses the 2D fallback renderer."
          title="Asset Pipeline"
        />
        <InfoCard
          body="The control path is built around tilt steering with a touch steering fallback if the motion sensor is unavailable. Thrust remains a direct hold interaction for quick arcade response."
          title="Input Path"
        />
      </View>

      <View style={styles.actions}>
        <GameButton
          label="Start Launch3001"
          onPress={() => {
            router.push("/game" as Href);
          }}
          subtitle="Jump straight into sector 1"
          tone="primary"
        />
        <GameButton
          label="How To Play"
          onPress={() => {
            router.push("/how-to-play" as Href);
          }}
          subtitle="Read controls, landing rules, and fallback behavior"
        />
      </View>
    </ScreenContainer>
  );
}

function InfoCard({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    marginHorizontal: "auto",
    maxWidth: 1180,
    paddingBottom: theme.spacing.xxxl + 32,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  kicker: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: 32
  },
  description: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    lineHeight: 24
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  card: {
    backgroundColor: theme.colors.cardMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    flexGrow: 1,
    gap: theme.spacing.sm,
    minWidth: 280,
    padding: theme.spacing.lg
  },
  cardTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 20
  },
  cardBody: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22
  },
  actions: {
    gap: theme.spacing.md
  }
});
