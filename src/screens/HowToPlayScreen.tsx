import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../components/layout/ScreenContainer";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { theme } from "../theme";

export function HowToPlayScreen() {
  const device = useDeviceProfile();
  const isWide = device.isLandscape || device.width >= 860;
  const isCompact = device.width < 390;

  return (
    <ScreenContainer
      scroll
      contentContainerStyle={[styles.content, isWide && styles.contentWide]}
    >
      <InfoCard
        body="Tilt the phone to steer the rocket's nose. Hold the thrust control to burn. Gravity is always active, so short, deliberate burns are safer than panic-holding."
        compact={isCompact}
        title="Core Controls"
        wide={isWide}
      />
      <InfoCard
        body="Each level begins on a left-side launch deck, then pushes through open space, hangars, rock tunnels, and narrow routes before a final landing pad."
        compact={isCompact}
        title="Level Shape"
        wide={isWide}
      />
      <InfoCard
        body="A safe landing needs controlled vertical speed, controlled horizontal speed, and a near-upright rocket. Hit obstacles, leave the route, or land too hard and the run resets to level 1."
        compact={isCompact}
        title="Fail State"
        wide={isWide}
      />
      <InfoCard
        body="The camera widens when you need route preview and tightens when the corridor or landing zone needs precision. Keep your eyes ahead of the rocket, not just on it."
        compact={isCompact}
        title="Camera Read"
        wide={isWide}
      />
      <InfoCard
        body="If device motion is unavailable, Launch exposes a touch steering fallback so the prototype remains playable. The intended final input is still phone tilt."
        compact={isCompact}
        title="Fallback Input"
        wide={isWide}
      />
      <InfoCard
        body="This checkout is missing Rocket.obj, Rocket.mtl, Launchpad.obj, and Launchpad.mtl, so the prototype renders placeholders. Convert those assets to GLB or GLTF and swap them into the render layer next."
        compact={isCompact}
        title="Asset Note"
        wide={isWide}
      />
    </ScreenContainer>
  );
}

function InfoCard({
  body,
  compact,
  title,
  wide
}: {
  body: string;
  compact?: boolean;
  title: string;
  wide?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        compact && styles.cardCompact
      ]}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.lg,
    marginHorizontal: "auto",
    maxWidth: 1180,
    paddingBottom: theme.spacing.xxxl + 96,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl
  },
  contentWide: {
    alignItems: "flex-start"
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    width: "100%"
  },
  cardCompact: {
    padding: theme.spacing.md
  },
  cardWide: {
    minWidth: "48%",
    width: "48%"
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
  }
});
