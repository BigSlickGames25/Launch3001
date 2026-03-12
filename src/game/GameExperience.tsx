import { Href, router } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import {
  SensorType,
  useAnimatedSensor
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SteeringSlider } from "../components/controls/SteeringSlider";
import { ThrustButton } from "../components/controls/ThrustButton";
import { AppBackdrop } from "../components/layout/AppBackdrop";
import { useGameLoop } from "../engine/useGameLoop";
import { useDeviceProfile } from "../hooks/useDeviceProfile";
import { fireHaptic } from "../services/haptics";
import { useGameSettings } from "../store/game-settings";
import { clamp, theme } from "../theme";
import {
  Camera,
  GameInput,
  GameWorld,
  LandingMetrics,
  LevelSectionKind,
  Obstacle,
  Pad,
  Star,
  Vector
} from "./types";
import {
  createWorld,
  getLandingThresholds,
  resizeWorld,
  updateWorld
} from "./world";

function formatSectionLabel(kind: LevelSectionKind) {
  switch (kind) {
    case "launch":
      return "Launch";
    case "space":
      return "Open Space";
    case "hangar":
      return "Hangar";
    case "rock":
      return "Rock Tunnel";
    case "needle":
      return "Needle Route";
    case "landing":
      return "Landing";
  }
}

function projectPoint(
  point: Vector,
  camera: Camera,
  arena: { height: number; width: number }
) {
  return {
    x: (point.x - camera.center.x) * camera.zoom + arena.width / 2,
    y: (point.y - camera.center.y) * camera.zoom + arena.height / 2
  };
}

function obstacleColor(obstacle: Obstacle) {
  switch (obstacle.kind) {
    case "hangar":
      return "rgba(111, 163, 255, 0.26)";
    case "rock":
      return "rgba(255, 151, 89, 0.3)";
    case "gate":
      return "rgba(255, 255, 255, 0.2)";
    case "platform":
      return "rgba(80, 135, 255, 0.26)";
    case "terrain":
      return "rgba(18, 38, 70, 0.92)";
  }
}

function obstacleBorderColor(obstacle: Obstacle) {
  switch (obstacle.kind) {
    case "hangar":
      return "rgba(160, 201, 255, 0.56)";
    case "rock":
      return "rgba(255, 187, 139, 0.62)";
    case "gate":
      return "rgba(255, 255, 255, 0.4)";
    case "platform":
      return "rgba(120, 183, 255, 0.54)";
    case "terrain":
      return "rgba(80, 132, 222, 0.22)";
  }
}

function sectionBackdrop(kind: LevelSectionKind) {
  switch (kind) {
    case "launch":
      return "rgba(56, 189, 248, 0.06)";
    case "space":
      return "rgba(56, 189, 248, 0.04)";
    case "hangar":
      return "rgba(130, 150, 255, 0.06)";
    case "rock":
      return "rgba(249, 115, 22, 0.06)";
    case "needle":
      return "rgba(251, 113, 133, 0.06)";
    case "landing":
      return "rgba(249, 115, 22, 0.08)";
  }
}

function starColor(star: Star) {
  switch (star.tone) {
    case "amber":
      return `rgba(255, 178, 112, ${star.alpha})`;
    case "blue":
      return `rgba(125, 199, 255, ${star.alpha})`;
    case "white":
      return `rgba(255, 255, 255, ${star.alpha})`;
  }
}

function getRawTiltAxis(
  reading: { pitch?: number; roll?: number } | undefined,
  isLandscape: boolean
) {
  if (!reading) {
    return null;
  }

  const axis = isLandscape ? -(reading.pitch ?? 0) : reading.roll ?? 0;

  return Number.isFinite(axis) ? axis : null;
}

function formatLandingMetrics(metrics: LandingMetrics | null) {
  if (!metrics) {
    return null;
  }

  return `H ${metrics.horizontalSpeed}  V ${metrics.verticalSpeed}  A ${metrics.angleDegrees} deg`;
}

export function GameExperience() {
  const device = useDeviceProfile();
  const { settings } = useGameSettings();
  const [arenaSize, setArenaSize] = useState({ width: 0, height: 0 });
  const [world, setWorld] = useState<GameWorld | null>(null);
  const [paused, setPaused] = useState(false);
  const [runBestLevel, setRunBestLevel] = useState(1);
  const [thrustActive, setThrustActive] = useState(false);
  const [touchSteer, setTouchSteer] = useState(0);
  const inputRef = useRef<GameInput>({
    steer: 0,
    thrust: false
  });
  const tiltTrimRef = useRef<number | null>(null);
  const rotationSensor = useAnimatedSensor(SensorType.ROTATION, {
    adjustToInterfaceOrientation: true,
    interval: 16
  });
  const isLandscape = device.isLandscape;
  const thrustSize = Math.round(
    clamp((isLandscape ? 124 : 138) * device.controlScale, 112, 154)
  );
  const fallbackSliderSize = Math.round(
    clamp((isLandscape ? 190 : 156) * device.controlScale, 148, 212)
  );
  const usingTouchFallback = !rotationSensor.isAvailable;
  const thresholds = getLandingThresholds(world?.levelNumber ?? 1);

  useEffect(() => {
    if (settings.keepAwake) {
      void activateKeepAwakeAsync("game-session");
    } else {
      void deactivateKeepAwake("game-session");
    }

    return () => {
      void deactivateKeepAwake("game-session");
    };
  }, [settings.keepAwake]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const { body, documentElement } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyPosition = body.style.position;
    const previousBodyInset = body.style.inset;
    const previousBodyWidth = body.style.width;
    const preventTouchDefault = (event: Event) => {
      event.preventDefault();
    };

    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    body.style.position = "fixed";
    body.style.inset = "0";
    body.style.width = "100%";
    window.scrollTo(0, 0);
    document.addEventListener("touchmove", preventTouchDefault, {
      passive: false
    });

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.touchAction = previousBodyTouchAction;
      body.style.position = previousBodyPosition;
      body.style.inset = previousBodyInset;
      body.style.width = previousBodyWidth;
      document.removeEventListener("touchmove", preventTouchDefault);
    };
  }, []);

  useEffect(() => {
    if (!arenaSize.width || !arenaSize.height) {
      return;
    }

    setWorld((current) =>
      current ? resizeWorld(current, arenaSize) : createWorld(arenaSize)
    );
  }, [arenaSize.height, arenaSize.width]);

  useEffect(() => {
    if (!world) {
      return;
    }

    if (world.levelNumber > runBestLevel) {
      setRunBestLevel(world.levelNumber);
    }
  }, [runBestLevel, world]);

  useEffect(() => {
    if (!world || world.event === "none") {
      return;
    }

    switch (world.event) {
      case "crash":
        void fireHaptic(settings.haptics, "damage");
        break;
      case "landing":
      case "level-complete":
        void fireHaptic(settings.haptics, "collect");
        break;
      case "run-complete":
        void fireHaptic(settings.haptics, "confirm");
        break;
    }
  }, [settings.haptics, world?.event, world?.eventNonce]);

  useEffect(() => {
    if (!rotationSensor.isAvailable) {
      return;
    }

    const rawAxis = getRawTiltAxis(rotationSensor.sensor.value, isLandscape);

    if (rawAxis !== null) {
      tiltTrimRef.current = rawAxis;
    }
  }, [isLandscape, rotationSensor.isAvailable]);

  useGameLoop(Boolean(world) && !paused && world?.status === "playing", (deltaSeconds) => {
    const rawAxis = getRawTiltAxis(rotationSensor.sensor.value, isLandscape);

    if (rawAxis !== null) {
      if (tiltTrimRef.current === null) {
        tiltTrimRef.current = rawAxis;
      }

      inputRef.current.steer = clamp((rawAxis - tiltTrimRef.current) / 0.58, -1, 1);
    } else {
      inputRef.current.steer = touchSteer;
    }

    setWorld((current) => {
      if (!current) {
        return current;
      }

      return updateWorld(current, inputRef.current, deltaSeconds);
    });
  });

  function recalibrateTilt() {
    const rawAxis = getRawTiltAxis(rotationSensor.sensor.value, isLandscape);

    if (rawAxis !== null) {
      tiltTrimRef.current = rawAxis;
    }
  }

  function resetControls() {
    inputRef.current = {
      steer: 0,
      thrust: false
    };
    setTouchSteer(0);
    setThrustActive(false);
  }

  function startLevel(levelNumber: number) {
    if (!arenaSize.width || !arenaSize.height) {
      return;
    }

    resetControls();
    recalibrateTilt();
    setPaused(false);
    setWorld(createWorld(arenaSize, levelNumber));
  }

  function handleArenaLayout(event: LayoutChangeEvent) {
    const { height, width } = event.nativeEvent.layout;

    setArenaSize((current) => {
      if (current.width === width && current.height === height) {
        return current;
      }

      return {
        width,
        height
      };
    });
  }

  function handlePauseToggle() {
    if (!world || world.status !== "playing") {
      return;
    }

    void fireHaptic(settings.haptics, "pause");
    setPaused((current) => !current);
  }

  function handlePrimaryAction() {
    if (!world) {
      return;
    }

    if (paused && world.status === "playing") {
      void fireHaptic(settings.haptics, "tap");
      setPaused(false);
      return;
    }

    void fireHaptic(settings.haptics, "confirm");

    if (world.status === "level-complete") {
      startLevel(world.levelNumber + 1);
      return;
    }

    startLevel(1);
    setRunBestLevel(1);
  }

  function leaveGame() {
    resetControls();
    void fireHaptic(settings.haptics, "tap");
    router.replace("/" as Href);
  }

  const speed = world
    ? Math.round(Math.hypot(world.rocket.velocity.x, world.rocket.velocity.y))
    : 0;
  const steerValue = inputRef.current.steer;

  function renderStatusCard() {
    return (
      <ControlStatus
        onRecalibrate={rotationSensor.isAvailable ? recalibrateTilt : undefined}
        sectionKind={world?.currentSectionKind ?? "launch"}
        showGuide={settings.showTouchGuide}
        steerValue={steerValue}
        usingTouchFallback={usingTouchFallback}
      >
        {usingTouchFallback ? (
          <SteeringSlider
            onChange={(value) => {
              setTouchSteer(value);
              inputRef.current.steer = value;
            }}
            showGuide={settings.showTouchGuide}
            size={fallbackSliderSize}
            value={touchSteer}
          />
        ) : null}
      </ControlStatus>
    );
  }

  function renderThrustButton() {
    return (
      <ThrustButton
        active={thrustActive}
        onPressIn={() => {
          if (!inputRef.current.thrust) {
            void fireHaptic(settings.haptics, "boost");
          }

          inputRef.current.thrust = true;
          setThrustActive(true);
        }}
        onPressOut={() => {
          inputRef.current.thrust = false;
          setThrustActive(false);
        }}
        showGuide={settings.showTouchGuide}
        size={thrustSize}
      />
    );
  }

  const leftRail =
    settings.handPreference === "left" ? renderStatusCard() : renderThrustButton();
  const rightRail =
    settings.handPreference === "left" ? renderThrustButton() : renderStatusCard();

  return (
    <View style={styles.root}>
      <AppBackdrop />
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={styles.safeArea}
      >
        <View style={[styles.gameShell, isLandscape && styles.gameShellLandscape]}>
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            <MetricBlock label="Level" value={`${world?.levelNumber ?? 1}/30`} />
            <MetricBlock label="Best Run" value={`${runBestLevel}/30`} />
            <MetricBlock label="Speed" value={`${speed}`} />
            <MetricBlock
              label="Landing"
              value={`H${thresholds.horizontalSpeed} V${thresholds.verticalSpeed} A${thresholds.angleDegrees}deg`}
            />
            <Pressable
              onPress={handlePauseToggle}
              style={({ pressed }) => [
                styles.pauseButton,
                pressed && styles.pauseButtonPressed
              ]}
            >
              <Text style={styles.pauseLabel}>{paused ? "Resume" : "Pause"}</Text>
            </Pressable>
          </View>

          {isLandscape ? (
            <View style={styles.landscapeSession}>
              <View style={[styles.landscapeRail, styles.landscapeRailLeft]}>
                {leftRail}
              </View>
              <View style={styles.landscapeCenterColumn}>
                <View
                  onLayout={handleArenaLayout}
                  style={[styles.arenaShell, styles.arenaShellLandscape]}
                >
                  {world ? <Arena world={world} /> : null}
                  {paused || world?.status !== "playing" ? (
                    <GameOverlay
                      onLeave={leaveGame}
                      onPrimaryAction={handlePrimaryAction}
                      paused={paused}
                      world={world}
                    />
                  ) : null}
                </View>
              </View>
              <View style={[styles.landscapeRail, styles.landscapeRailRight]}>
                {rightRail}
              </View>
            </View>
          ) : (
            <>
              <View onLayout={handleArenaLayout} style={styles.arenaShell}>
                {world ? <Arena world={world} /> : null}
                {paused || world?.status !== "playing" ? (
                  <GameOverlay
                    onLeave={leaveGame}
                    onPrimaryAction={handlePrimaryAction}
                    paused={paused}
                    world={world}
                  />
                ) : null}
              </View>
              <View style={styles.controlsRow}>
                {leftRail}
                {rightRail}
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ControlStatus({
  children,
  onRecalibrate,
  sectionKind,
  showGuide,
  steerValue,
  usingTouchFallback
}: {
  children?: React.ReactNode;
  onRecalibrate?: () => void;
  sectionKind: LevelSectionKind;
  showGuide?: boolean;
  steerValue: number;
  usingTouchFallback: boolean;
}) {
  return (
    <View style={styles.controlCard}>
      <Text style={styles.controlLabel}>
        {usingTouchFallback ? "Touch Steering" : "Tilt Steering"}
      </Text>
      <Text style={styles.controlValue}>{formatSectionLabel(sectionKind)}</Text>
      <View style={styles.steerMeter}>
        <View style={styles.steerMeterCenter} />
        <View
          style={[
            styles.steerMeterFill,
            {
              width: `${Math.abs(steerValue) * 50}%`,
              left: steerValue >= 0 ? "50%" : undefined,
              right: steerValue < 0 ? "50%" : undefined
            }
          ]}
        />
      </View>
      <Text style={styles.controlCopy}>
        {usingTouchFallback
          ? "Motion sensor unavailable in this build. Drag to bias the nose."
          : "Bank the phone to bias the rocket while the camera keeps the route readable."}
      </Text>
      {onRecalibrate ? (
        <Pressable
          onPress={onRecalibrate}
          style={({ pressed }) => [
            styles.trimButton,
            pressed && styles.trimButtonPressed
          ]}
        >
          <Text style={styles.trimButtonText}>Trim</Text>
        </Pressable>
      ) : null}
      {children}
      {showGuide ? <Text style={styles.controlHint}>Tilt to steer</Text> : null}
    </View>
  );
}

function GameOverlay({
  onLeave,
  onPrimaryAction,
  paused,
  world
}: {
  onLeave: () => void;
  onPrimaryAction: () => void;
  paused: boolean;
  world: GameWorld | null;
}) {
  const metrics = formatLandingMetrics(world?.landingMetrics ?? null);
  const title = paused
    ? "Paused"
    : world?.status === "crashed"
      ? "Rocket Lost"
      : world?.status === "level-complete"
        ? `Level ${world.levelNumber} Clear`
        : "Run Complete";
  const body = paused
    ? "Launch is on hold. Resume when you want the run back live."
    : world?.message ?? "Run state unavailable.";
  const primaryLabel = paused
    ? "Resume"
    : world?.status === "level-complete"
      ? `Level ${Math.min(30, (world?.levelNumber ?? 0) + 1)}`
      : "Level 1";

  return (
    <View style={styles.overlay}>
      <Text style={styles.overlayTitle}>{title}</Text>
      <Text style={styles.overlayText}>{body}</Text>
      {metrics ? <Text style={styles.overlayMetrics}>{metrics}</Text> : null}
      <View style={styles.overlayButtons}>
        <Pressable onPress={onPrimaryAction} style={styles.overlayPrimary}>
          <Text style={styles.overlayPrimaryText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable onPress={onLeave} style={styles.overlaySecondary}>
          <Text style={styles.overlaySecondaryText}>Menu</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Arena({ world }: { world: GameWorld }) {
  const visibleWidth = world.arena.width / world.camera.zoom;
  const minX = world.camera.center.x - visibleWidth / 2 - 180;
  const maxX = world.camera.center.x + visibleWidth / 2 + 180;
  const visibleSections = world.level.sections.filter(
    (section) => section.endX >= minX && section.startX <= maxX
  );
  const visibleObstacles = world.level.obstacles.filter(
    (obstacle) =>
      obstacle.position.x + obstacle.size.x >= minX &&
      obstacle.position.x <= maxX
  );
  const rocketPoint = projectPoint(world.rocket.position, world.camera, world.arena);
  const rocketScale = clamp(world.camera.zoom * 1.02, 0.86, 1.28);
  const rocketWidth = world.rocket.width * rocketScale;
  const rocketHeight = world.rocket.height * rocketScale;

  return (
    <View style={styles.arena}>
      <View style={styles.skyGlowTop} />
      <View style={styles.skyGlowBottom} />
      {world.level.stars.map((star) => {
        const screenX =
          (star.position.x - world.camera.center.x * 0.48) *
            world.camera.zoom *
            0.78 +
          world.arena.width / 2;
        const screenY =
          (star.position.y - world.camera.center.y * 0.2) * 0.74 +
          world.arena.height / 2;

        if (
          screenX < -24 ||
          screenX > world.arena.width + 24 ||
          screenY < -24 ||
          screenY > world.arena.height + 24
        ) {
          return null;
        }

        return (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                backgroundColor: starColor(star),
                borderRadius: star.size,
                height: star.size,
                left: screenX,
                top: screenY,
                width: star.size
              }
            ]}
          />
        );
      })}
      {visibleSections.map((section) => {
        const left =
          (section.startX - world.camera.center.x) * world.camera.zoom +
          world.arena.width / 2;
        const width = (section.endX - section.startX) * world.camera.zoom;

        return (
          <View
            key={section.id}
            style={[
              styles.sectionBand,
              {
                backgroundColor: sectionBackdrop(section.kind),
                left,
                width
              }
            ]}
          />
        );
      })}
      <View style={styles.horizonGrid}>
        <View style={[styles.horizonLine, styles.horizonLineTop]} />
        <View style={[styles.horizonLine, styles.horizonLineMid]} />
        <View style={[styles.horizonLine, styles.horizonLineBottom]} />
      </View>
      {visibleObstacles.map((obstacle) => {
        const topLeft = projectPoint(obstacle.position, world.camera, world.arena);
        const width = obstacle.size.x * world.camera.zoom;
        const height = obstacle.size.y * world.camera.zoom;

        if (
          topLeft.x + width < -64 ||
          topLeft.x > world.arena.width + 64 ||
          topLeft.y + height < -64 ||
          topLeft.y > world.arena.height + 64
        ) {
          return null;
        }

        return (
          <View
            key={obstacle.id}
            style={[
              styles.obstacle,
              {
                backgroundColor: obstacleColor(obstacle),
                borderColor: obstacleBorderColor(obstacle),
                borderRadius: obstacle.radius * world.camera.zoom,
                height,
                left: topLeft.x,
                top: topLeft.y,
                width
              }
            ]}
          />
        );
      })}
      <PadSprite arena={world.arena} camera={world.camera} pad={world.level.startPad} />
      <PadSprite arena={world.arena} camera={world.camera} pad={world.level.finishPad} />
      <View
        style={[
          styles.rocket,
          {
            height: rocketHeight,
            left: rocketPoint.x - rocketWidth / 2,
            top: rocketPoint.y - rocketHeight * 0.48,
            transform: [{ rotate: `${world.rocket.angle}rad` }],
            width: rocketWidth
          }
        ]}
      >
        {world.rocket.thrusting ? (
          <View
            style={[
              styles.rocketFlame,
              {
                height: 20 * rocketScale,
                top: rocketHeight - 4,
                width: 18 * rocketScale
              }
            ]}
          />
        ) : null}
        <View style={[styles.rocketBody, { borderRadius: 14 * rocketScale }]} />
        <View
          style={[
            styles.rocketWindow,
            { height: 8 * rocketScale, width: 8 * rocketScale }
          ]}
        />
        <View
          style={[
            styles.rocketFinLeft,
            {
              borderBottomWidth: 14 * rocketScale,
              borderLeftWidth: 10 * rocketScale
            }
          ]}
        />
        <View
          style={[
            styles.rocketFinRight,
            {
              borderBottomWidth: 14 * rocketScale,
              borderRightWidth: 10 * rocketScale
            }
          ]}
        />
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>{formatSectionLabel(world.currentSectionKind)}</Text>
        <Text style={styles.bannerCopy}>{world.message}</Text>
      </View>
      <View style={[styles.progressBar, { width: `${Math.max(6, world.progress * 100)}%` }]} />
    </View>
  );
}

function PadSprite({
  arena,
  camera,
  pad
}: {
  arena: { height: number; width: number };
  camera: Camera;
  pad: Pad;
}) {
  const topLeft = projectPoint(
    {
      x: pad.position.x - pad.width / 2,
      y: pad.position.y - pad.height
    },
    camera,
    arena
  );
  const width = pad.width * camera.zoom;
  const height = (pad.height + 6) * camera.zoom;

  return (
    <View
      style={[
        styles.pad,
        pad.kind === "finish" ? styles.padFinish : styles.padStart,
        {
          height,
          left: topLeft.x,
          top: topLeft.y,
          width
        }
      ]}
    >
      <Text style={styles.padText}>{pad.kind === "finish" ? "LAND" : "START"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
    overflow: "hidden",
    overscrollBehavior: "none",
    touchAction: "none"
  },
  safeArea: {
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.md
  },
  gameShell: {
    flex: 1,
    gap: theme.spacing.md
  },
  gameShellLandscape: {
    gap: theme.spacing.sm
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm
  },
  headerLandscape: {
    paddingBottom: theme.spacing.sm
  },
  metricBlock: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    minWidth: 84,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  metricLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  metricValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18
  },
  pauseButton: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  pauseButtonPressed: {
    opacity: 0.82
  },
  pauseLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14
  },
  arenaShell: {
    backgroundColor: "rgba(6, 16, 29, 0.8)",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    position: "relative"
  },
  arenaShellLandscape: {
    minHeight: 0
  },
  arena: {
    flex: 1
  },
  skyGlowTop: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 280,
    height: 280,
    left: -80,
    position: "absolute",
    top: -70,
    width: 280
  },
  skyGlowBottom: {
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    borderRadius: 340,
    bottom: -140,
    height: 340,
    position: "absolute",
    right: -120,
    width: 340
  },
  star: {
    position: "absolute"
  },
  sectionBand: {
    bottom: 0,
    position: "absolute",
    top: 0
  },
  horizonGrid: {
    bottom: 0,
    left: 0,
    opacity: 0.42,
    position: "absolute",
    right: 0,
    top: "62%"
  },
  horizonLine: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0
  },
  horizonLineTop: {
    top: "20%"
  },
  horizonLineMid: {
    top: "48%"
  },
  horizonLineBottom: {
    top: "76%"
  },
  obstacle: {
    borderWidth: 1,
    position: "absolute"
  },
  pad: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    position: "absolute"
  },
  padStart: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: "rgba(125, 199, 255, 0.58)"
  },
  padFinish: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderColor: "rgba(255, 190, 120, 0.62)"
  },
  padText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.label,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  rocket: {
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
    marginLeft: -4,
    position: "absolute",
    top: 18
  },
  rocketFinLeft: {
    backgroundColor: "transparent",
    borderBottomColor: "#f97316",
    borderLeftColor: "transparent",
    bottom: 0,
    left: "50%",
    marginLeft: -18,
    position: "absolute"
  },
  rocketFinRight: {
    backgroundColor: "transparent",
    borderBottomColor: "#f97316",
    borderRightColor: "transparent",
    bottom: 0,
    left: "50%",
    marginLeft: 8,
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
  },
  banner: {
    backgroundColor: "rgba(6, 16, 29, 0.68)",
    borderRadius: 999,
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    maxWidth: "82%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: "absolute"
  },
  bannerLabel: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  bannerCopy: {
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  progressBar: {
    backgroundColor: theme.colors.surface,
    bottom: 0,
    height: 5,
    left: 0,
    position: "absolute"
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(7, 17, 31, 0.78)",
    gap: theme.spacing.md,
    inset: 0,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    position: "absolute"
  },
  overlayTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.display,
    fontSize: 30,
    textAlign: "center"
  },
  overlayText: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  overlayMetrics: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.label,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  overlayButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  overlayPrimary: {
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  overlayPrimaryText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  overlaySecondary: {
    backgroundColor: theme.colors.cardMuted,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  overlaySecondaryText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15
  },
  controlsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.md
  },
  controlCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    minWidth: 166,
    padding: theme.spacing.md
  },
  controlLabel: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  controlValue: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18
  },
  controlCopy: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    lineHeight: 19
  },
  controlHint: {
    color: theme.colors.subtleText,
    fontFamily: theme.fonts.label,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  steerMeter: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 14,
    overflow: "hidden",
    position: "relative"
  },
  steerMeterCenter: {
    backgroundColor: "rgba(255,255,255,0.16)",
    height: "100%",
    left: "50%",
    marginLeft: -1,
    position: "absolute",
    width: 2
  },
  steerMeterFill: {
    backgroundColor: theme.colors.accent,
    bottom: 0,
    position: "absolute",
    top: 0
  },
  trimButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6
  },
  trimButtonPressed: {
    opacity: 0.82
  },
  trimButtonText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12
  },
  landscapeSession: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 0
  },
  landscapeCenterColumn: {
    flex: 1,
    minHeight: 0
  },
  landscapeRail: {
    justifyContent: "center",
    paddingBottom: theme.spacing.sm,
    width: 212
  },
  landscapeRailLeft: {
    alignItems: "flex-start"
  },
  landscapeRailRight: {
    alignItems: "flex-end"
  }
});
