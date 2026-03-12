import { clamp } from "../theme";
import {
  ArenaSize,
  Camera,
  FailureReason,
  GameInput,
  GameWorld,
  LandingMetrics,
  LandingThresholds,
  LevelDefinition,
  LevelSection,
  LevelSectionKind,
  Obstacle,
  ObstacleKind,
  Pad,
  Rocket,
  Star,
  Vector
} from "./types";

const MAX_LEVEL = 30;
const ROCKET_WIDTH = 34;
const ROCKET_HEIGHT = 60;
const ROCKET_RADIUS = 18;
const MAX_STEER_ANGLE = Math.PI * 0.42;
const ROTATION_RESPONSE = 7.8;
const HORIZONTAL_DRAG = 0.22;
const VERTICAL_DRAG = 0.08;

type Rng = () => number;

function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomBetween(rng: Rng, min: number, max: number) {
  return min + rng() * (max - min);
}

function makeObstacle(
  id: string,
  kind: ObstacleKind,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0
): Obstacle {
  return {
    id,
    kind,
    position: { x, y },
    radius,
    size: {
      x: width,
      y: height
    }
  };
}

function createStars(width: number, height: number, rng: Rng): Star[] {
  const stars: Star[] = [];
  const starCount = 78;
  const tones: Star["tone"][] = ["white", "blue", "amber"];

  for (let index = 0; index < starCount; index += 1) {
    stars.push({
      alpha: randomBetween(rng, 0.3, 0.92),
      id: `star-${index}`,
      position: {
        x: randomBetween(rng, 0, width),
        y: randomBetween(rng, 0, height)
      },
      size: randomBetween(rng, 1.2, 3.6),
      tone: tones[index % tones.length]
    });
  }

  return stars;
}

function pickSectionKind(
  index: number,
  totalSections: number,
  levelNumber: number,
  rng: Rng
): LevelSectionKind {
  if (index === 0) {
    return "launch";
  }

  if (index === totalSections - 1) {
    return "landing";
  }

  const difficulty = (levelNumber - 1) / (MAX_LEVEL - 1);
  const roll = rng();

  if (difficulty > 0.45 && roll > 0.8) {
    return "needle";
  }

  if (roll > 0.58) {
    return "hangar";
  }

  if (roll > 0.28) {
    return "rock";
  }

  return "space";
}

function getSectionGap(
  levelNumber: number,
  kind: LevelSectionKind,
  rng: Rng
): number {
  const baseGap = 344 - levelNumber * 4.1;
  const penalties: Record<LevelSectionKind, number> = {
    hangar: 40,
    landing: 60,
    launch: -10,
    needle: 86,
    rock: 28,
    space: 0
  };

  return clamp(baseGap - penalties[kind] + randomBetween(rng, -18, 18), 150, 348);
}

function addSectionInterior(
  obstacles: Obstacle[],
  section: LevelSection,
  levelNumber: number,
  rng: Rng
) {
  const { endX, gapBottom, gapTop, id, kind, startX } = section;
  const sectionWidth = endX - startX;
  const gapHeight = gapBottom - gapTop;
  const difficulty = (levelNumber - 1) / (MAX_LEVEL - 1);

  switch (kind) {
    case "hangar": {
      const width = 34 + difficulty * 14;
      const height = clamp(gapHeight * (0.34 + rng() * 0.14), 84, gapHeight - 72);
      const fromTop = rng() > 0.5;
      const x = startX + sectionWidth * 0.52;
      const y = fromTop ? gapTop + 16 : gapBottom - height - 16;

      obstacles.push(
        makeObstacle(`${id}-door`, "hangar", x, y, width, height, 12)
      );
      break;
    }
    case "rock": {
      const count = difficulty > 0.52 ? 3 : 2;

      for (let index = 0; index < count; index += 1) {
        const size = 38 + difficulty * 16 + rng() * 18;
        const x = startX + sectionWidth * (0.24 + index * 0.24);
        const y =
          index % 2 === 0
            ? gapTop + 18 + rng() * Math.max(12, gapHeight * 0.18)
            : gapBottom -
              size -
              18 -
              rng() * Math.max(12, gapHeight * 0.18);

        obstacles.push(
          makeObstacle(`${id}-rock-${index}`, "rock", x, y, size, size, size * 0.32)
        );
      }
      break;
    }
    case "space": {
      if (rng() > 0.52) {
        const width = 28 + difficulty * 12;
        const height = clamp(gapHeight * 0.32, 72, 118);
        const fromTop = rng() > 0.5;

        obstacles.push(
          makeObstacle(
            `${id}-gate`,
            "gate",
            startX + sectionWidth * 0.58,
            fromTop ? gapTop + 20 : gapBottom - height - 20,
            width,
            height,
            10
          )
        );
      }
      break;
    }
    case "needle": {
      const width = 24 + difficulty * 8;
      const height = clamp(gapHeight * 0.28, 56, 92);
      const x = startX + sectionWidth * 0.5;

      obstacles.push(
        makeObstacle(`${id}-needle`, "gate", x, gapTop + 16, width, height, 10)
      );
      obstacles.push(
        makeObstacle(
          `${id}-needle-b`,
          "gate",
          x + width + 20,
          gapBottom - height - 16,
          width,
          height,
          10
        )
      );
      break;
    }
    case "landing":
    case "launch":
      break;
  }
}

function createLevel(levelNumber: number, arena: ArenaSize): LevelDefinition {
  const rng = createRng(levelNumber * 81173 + Math.round(arena.width * 17));
  const difficulty = (levelNumber - 1) / (MAX_LEVEL - 1);
  const height = Math.round(clamp(Math.max(arena.height * 1.48, 880), 840, 1120));
  const startPadY = Math.round(height - (176 + difficulty * 34));
  const startPad: Pad = {
    height: 14,
    kind: "start",
    position: {
      x: 190,
      y: startPadY
    },
    width: 166
  };
  const obstacles: Obstacle[] = [
    makeObstacle("launch-top", "terrain", 0, 0, 360, 48, 0),
    makeObstacle(
      "launch-floor",
      "platform",
      0,
      startPadY,
      360,
      height - startPadY,
      0
    )
  ];
  const sections: LevelSection[] = [
    {
      endX: 360,
      gapBottom: startPadY,
      gapTop: 48,
      id: "section-launch",
      kind: "launch",
      startX: 0
    }
  ];
  const sectionCount = 8 + Math.floor((levelNumber - 1) / 3);
  let cursorX = 360;
  let corridorCenter = clamp(startPadY - 180, 220, height - 220);

  for (let index = 1; index < sectionCount; index += 1) {
    const kind = pickSectionKind(index, sectionCount, levelNumber, rng);
    const sectionWidth = Math.round(
      randomBetween(rng, 250, 360) + difficulty * 74
    );
    const shiftAmount = randomBetween(
      rng,
      -(72 + levelNumber * 2.8),
      72 + levelNumber * 2.8
    );
    const gapHeight = getSectionGap(levelNumber, kind, rng);

    corridorCenter = clamp(
      corridorCenter + shiftAmount,
      180 + gapHeight / 2,
      height - 180 - gapHeight / 2
    );

    const gapTop = Math.round(
      clamp(corridorCenter - gapHeight / 2, 56, height - gapHeight - 96)
    );
    const gapBottom = Math.round(gapTop + gapHeight);
    const section: LevelSection = {
      endX: cursorX + sectionWidth,
      gapBottom,
      gapTop,
      id: `section-${index}`,
      kind,
      startX: cursorX
    };

    sections.push(section);
    obstacles.push(
      makeObstacle(
        `${section.id}-ceiling`,
        kind === "rock" ? "rock" : "terrain",
        cursorX,
        0,
        sectionWidth,
        gapTop,
        0
      ),
      makeObstacle(
        `${section.id}-floor`,
        kind === "hangar" || kind === "landing" ? "hangar" : "terrain",
        cursorX,
        gapBottom,
        sectionWidth,
        height - gapBottom,
        0
      )
    );
    addSectionInterior(obstacles, section, levelNumber, rng);
    cursorX += sectionWidth;
  }

  const finalSection = sections[sections.length - 1];
  const landingPadY = finalSection.gapBottom;
  const finishPad: Pad = {
    height: 14,
    kind: "finish",
    position: {
      x: finalSection.endX - Math.min(150, (finalSection.endX - finalSection.startX) * 0.28),
      y: landingPadY
    },
    width: clamp(146 - levelNumber, 102, 146)
  };
  const width = Math.round(cursorX + 120);

  return {
    difficulty,
    finishPad,
    height,
    number: levelNumber,
    obstacles,
    sections,
    stars: createStars(width, height, rng),
    startPad,
    width
  };
}

function getPadByKind(level: LevelDefinition, kind: "start" | "finish") {
  return kind === "finish" ? level.finishPad : level.startPad;
}

function getRestingPosition(pad: Pad): Vector {
  return {
    x: pad.position.x,
    y: pad.position.y - ROCKET_HEIGHT * 0.48 - 4
  };
}

function createRocket(level: LevelDefinition): Rocket {
  return {
    angle: 0,
    height: ROCKET_HEIGHT,
    landed: true,
    launched: false,
    position: getRestingPosition(level.startPad),
    radius: ROCKET_RADIUS,
    restingPad: "start",
    thrusting: false,
    velocity: { x: 0, y: 0 },
    width: ROCKET_WIDTH
  };
}

function getCameraTarget(
  arena: ArenaSize,
  level: LevelDefinition,
  rocket: Rocket,
  section: LevelSection,
  deltaSeconds: number,
  previousCamera?: Camera
): Camera {
  const velocityLookAhead = clamp(rocket.velocity.x * 0.34, -60, 220);
  const finishDistance = level.finishPad.position.x - rocket.position.x;
  const precisionBias =
    section.kind === "landing" || section.kind === "needle" ? 1 : 0;
  const corridorTightness = clamp((250 - (section.gapBottom - section.gapTop)) / 120, 0, 1);
  const speedFactor = clamp(
    Math.hypot(rocket.velocity.x, rocket.velocity.y) / 420,
    0,
    1
  );
  const targetZoom = clamp(
    0.76 + corridorTightness * 0.42 + precisionBias * 0.08 - speedFactor * 0.1,
    0.7,
    1.24
  );
  const lookAhead =
    finishDistance < 420
      ? clamp(90 + finishDistance * 0.14, 48, 140)
      : 132 + velocityLookAhead;
  const halfVisibleWidth = arena.width / (targetZoom * 2);
  const halfVisibleHeight = arena.height / (targetZoom * 2);
  const targetCenter = {
    x: clamp(
      rocket.position.x + lookAhead,
      halfVisibleWidth,
      level.width - halfVisibleWidth
    ),
    y: clamp(
      finishDistance < 340
        ? level.finishPad.position.y - 120
        : rocket.position.y + rocket.velocity.y * 0.16,
      halfVisibleHeight,
      level.height - halfVisibleHeight
    )
  };

  if (!previousCamera) {
    return {
      center: targetCenter,
      zoom: targetZoom
    };
  }

  const smoothing = clamp(deltaSeconds * 4.6, 0, 1);

  return {
    center: {
      x: previousCamera.center.x + (targetCenter.x - previousCamera.center.x) * smoothing,
      y: previousCamera.center.y + (targetCenter.y - previousCamera.center.y) * smoothing
    },
    zoom: previousCamera.zoom + (targetZoom - previousCamera.zoom) * smoothing
  };
}

function findSection(level: LevelDefinition, x: number): LevelSection {
  const section =
    level.sections.find((item) => x >= item.startX && x <= item.endX) ??
    level.sections[level.sections.length - 1];

  return section;
}

function circleHitsRect(position: Vector, radius: number, obstacle: Obstacle) {
  const closestX = clamp(
    position.x,
    obstacle.position.x,
    obstacle.position.x + obstacle.size.x
  );
  const closestY = clamp(
    position.y,
    obstacle.position.y,
    obstacle.position.y + obstacle.size.y
  );

  return Math.hypot(position.x - closestX, position.y - closestY) <= radius;
}

function getLandingMetrics(rocket: Rocket): LandingMetrics {
  return {
    angleDegrees: Math.round(Math.abs((rocket.angle * 180) / Math.PI)),
    horizontalSpeed: Math.round(Math.abs(rocket.velocity.x)),
    totalSpeed: Math.round(Math.hypot(rocket.velocity.x, rocket.velocity.y)),
    verticalSpeed: Math.round(Math.abs(rocket.velocity.y))
  };
}

export function getLandingThresholds(levelNumber: number): LandingThresholds {
  const difficulty = (levelNumber - 1) / (MAX_LEVEL - 1);

  return {
    angleDegrees: Math.round(clamp(18 - difficulty * 8, 10, 18)),
    horizontalSpeed: Math.round(clamp(164 - difficulty * 48, 104, 164)),
    verticalSpeed: Math.round(clamp(146 - difficulty * 52, 94, 146))
  };
}

function isSafeLanding(levelNumber: number, metrics: LandingMetrics) {
  const thresholds = getLandingThresholds(levelNumber);

  return (
    metrics.angleDegrees <= thresholds.angleDegrees &&
    metrics.horizontalSpeed <= thresholds.horizontalSpeed &&
    metrics.verticalSpeed <= thresholds.verticalSpeed
  );
}

function getPadContact(rocket: Rocket, pad: Pad): boolean {
  const rocketFeetY = rocket.position.y + rocket.height * 0.48;
  const horizontalOffset = Math.abs(rocket.position.x - pad.position.x);

  return (
    rocket.velocity.y >= -30 &&
    horizontalOffset <= pad.width * 0.5 - 8 &&
    rocket.position.y < pad.position.y + 24 &&
    Math.abs(rocketFeetY - pad.position.y) <= 18
  );
}

function stampEvent(world: GameWorld, event: GameWorld["event"]): GameWorld {
  return {
    ...world,
    event,
    eventNonce: world.eventNonce + 1
  };
}

function createCrashState(
  world: GameWorld,
  reason: FailureReason,
  message: string,
  rocket: Rocket
): GameWorld {
  return stampEvent(
    {
      ...world,
      failureReason: reason,
      landingMetrics:
        reason === "hard-landing" || reason === "bad-angle"
          ? getLandingMetrics(rocket)
          : null,
      message,
      rocket: {
        ...rocket,
        thrusting: false
      },
      status: "crashed"
    },
    "crash"
  );
}

function getSectionMessage(kind: LevelSectionKind) {
  switch (kind) {
    case "launch":
      return "Lift off clean and set up the line.";
    case "space":
      return "Open space. Build speed before the next choke point.";
    case "hangar":
      return "Hangar girders ahead. Stay precise.";
    case "rock":
      return "Rock tunnel ahead. Hold your arc.";
    case "needle":
      return "Needle route. Tiny corrections only.";
    case "landing":
      return "Landing corridor. Bleed speed and stand the rocket up.";
  }
}

function buildWorld(arena: ArenaSize, levelNumber: number): GameWorld {
  const level = createLevel(levelNumber, arena);
  const rocket = createRocket(level);
  const section = findSection(level, rocket.position.x);
  const camera = getCameraTarget(arena, level, rocket, section, 0, undefined);

  return {
    arena,
    camera,
    currentSectionKind: section.kind,
    event: "none",
    eventNonce: 0,
    failureReason: null,
    landingMetrics: null,
    level,
    levelNumber,
    maxLevel: MAX_LEVEL,
    message: getSectionMessage(section.kind),
    progress: 0,
    rocket,
    status: "playing",
    time: 0
  };
}

export function createWorld(arena: ArenaSize, levelNumber = 1): GameWorld {
  return buildWorld(arena, clamp(Math.round(levelNumber), 1, MAX_LEVEL));
}

export function resizeWorld(world: GameWorld, arena: ArenaSize): GameWorld {
  return createWorld(arena, world.levelNumber);
}

export function updateWorld(
  world: GameWorld,
  input: GameInput,
  deltaSeconds: number
): GameWorld {
  if (world.status !== "playing") {
    return world;
  }

  const steer = clamp(input.steer, -1, 1);
  const targetAngle = steer * MAX_STEER_ANGLE;
  const rotationBlend = clamp(deltaSeconds * ROTATION_RESPONSE, 0, 1);
  const gravity = 600 + world.levelNumber * 8.5;
  const thrustPower = 940 + world.levelNumber * 11;
  const maxSpeed = 510 + world.levelNumber * 11;
  const angle =
    world.rocket.angle + (targetAngle - world.rocket.angle) * rotationBlend;
  let rocket: Rocket = {
    ...world.rocket,
    angle,
    thrusting: input.thrust
  };

  if (rocket.landed && !input.thrust && rocket.restingPad) {
    const pad = getPadByKind(world.level, rocket.restingPad);
    rocket = {
      ...rocket,
      angle: angle + (0 - angle) * clamp(deltaSeconds * 6, 0, 1),
      position: getRestingPosition(pad),
      thrusting: false,
      velocity: { x: 0, y: 0 }
    };
  } else {
    if (rocket.landed && input.thrust) {
      rocket = {
        ...rocket,
        landed: false,
        launched: true,
        restingPad: null,
        position: {
          ...rocket.position,
          y: rocket.position.y - 2
        }
      };
    }

    const thrust = input.thrust ? thrustPower : 0;
    const acceleration = {
      x: Math.sin(angle) * thrust,
      y: gravity - Math.cos(angle) * thrust
    };
    const velocity = {
      x:
        (rocket.velocity.x + acceleration.x * deltaSeconds) /
        (1 + HORIZONTAL_DRAG * deltaSeconds),
      y:
        (rocket.velocity.y + acceleration.y * deltaSeconds) /
        (1 + VERTICAL_DRAG * deltaSeconds)
    };
    const speed = Math.hypot(velocity.x, velocity.y);
    const speedScale = speed > maxSpeed ? maxSpeed / speed : 1;

    rocket = {
      ...rocket,
      landed: false,
      launched: rocket.launched || input.thrust,
      position: {
        x: rocket.position.x + velocity.x * speedScale * deltaSeconds,
        y: rocket.position.y + velocity.y * speedScale * deltaSeconds
      },
      velocity: {
        x: velocity.x * speedScale,
        y: velocity.y * speedScale
      }
    };
  }

  let nextWorld: GameWorld = {
    ...world,
    event: "none",
    failureReason: null,
    landingMetrics: null,
    rocket,
    time: world.time + deltaSeconds
  };

  const outOfBounds =
    rocket.position.x < -60 ||
    rocket.position.x > world.level.width + 60 ||
    rocket.position.y < -80 ||
    rocket.position.y > world.level.height + 80;

  if (outOfBounds) {
    return createCrashState(
      nextWorld,
      "out-of-bounds",
      "You drifted out of the flight corridor. The run resets to level 1.",
      rocket
    );
  }

  for (const pad of [world.level.finishPad, world.level.startPad]) {
    if (!getPadContact(rocket, pad)) {
      continue;
    }

    const metrics = getLandingMetrics(rocket);

    if (!isSafeLanding(world.levelNumber, metrics)) {
      return createCrashState(
        nextWorld,
        metrics.angleDegrees > getLandingThresholds(world.levelNumber).angleDegrees
          ? "bad-angle"
          : "hard-landing",
        "Landing was too aggressive. The run resets to level 1.",
        rocket
      );
    }

    const settledRocket: Rocket = {
      ...rocket,
      angle: 0,
      landed: true,
      position: getRestingPosition(pad),
      restingPad: pad.kind,
      thrusting: false,
      velocity: { x: 0, y: 0 }
    };

    if (pad.kind === "finish") {
      const isRunComplete = world.levelNumber >= world.maxLevel;

      return stampEvent(
        {
          ...nextWorld,
          landingMetrics: metrics,
          message: isRunComplete
            ? "All 30 levels cleared. Start a new run from level 1."
            : `Level ${world.levelNumber} clear. Set up for level ${
                world.levelNumber + 1
              }.`,
          progress: 1,
          rocket: settledRocket,
          status: isRunComplete ? "run-complete" : "level-complete"
        },
        isRunComplete ? "run-complete" : "level-complete"
      );
    }

    nextWorld = stampEvent(
      {
        ...nextWorld,
        landingMetrics: metrics,
        message: "Stable on the launch deck. Thrust to relaunch.",
        rocket: settledRocket
      },
      "landing"
    );
    break;
  }

  if (nextWorld.status !== "playing") {
    return nextWorld;
  }

  const collided = world.level.obstacles.some((obstacle) =>
    circleHitsRect(nextWorld.rocket.position, nextWorld.rocket.radius, obstacle)
  );

  if (collided) {
    return createCrashState(
      nextWorld,
      "obstacle",
      "Impact detected. Fail a level and the run goes back to level 1.",
      nextWorld.rocket
    );
  }

  const section = findSection(world.level, nextWorld.rocket.position.x);
  const sectionMessage =
    nextWorld.rocket.landed && nextWorld.rocket.restingPad === "start"
      ? "Stable on the launch deck. Thrust to relaunch."
      : getSectionMessage(section.kind);

  return {
    ...nextWorld,
    camera: getCameraTarget(
      world.arena,
      world.level,
      nextWorld.rocket,
      section,
      deltaSeconds,
      world.camera
    ),
    currentSectionKind: section.kind,
    message: sectionMessage,
    progress: clamp(
      (nextWorld.rocket.position.x - world.level.startPad.position.x) /
        (world.level.finishPad.position.x - world.level.startPad.position.x),
      0,
      1
    )
  };
}
