export type Vector = {
  x: number;
  y: number;
};

export type ArenaSize = {
  width: number;
  height: number;
};

export type GameEvent =
  | "none"
  | "crash"
  | "landing"
  | "level-complete"
  | "run-complete";

export type GameStatus =
  | "playing"
  | "crashed"
  | "level-complete"
  | "run-complete";

export type ObstacleKind =
  | "terrain"
  | "hangar"
  | "rock"
  | "gate"
  | "platform";

export type LevelSectionKind =
  | "launch"
  | "space"
  | "hangar"
  | "rock"
  | "needle"
  | "landing";

export type Obstacle = {
  id: string;
  kind: ObstacleKind;
  position: Vector;
  radius: number;
  size: Vector;
};

export type Pad = {
  kind: "start" | "finish";
  height: number;
  position: Vector;
  width: number;
};

export type LevelSection = {
  endX: number;
  gapBottom: number;
  gapTop: number;
  id: string;
  kind: LevelSectionKind;
  startX: number;
};

export type Star = {
  alpha: number;
  id: string;
  position: Vector;
  size: number;
  tone: "amber" | "blue" | "white";
};

export type LevelDefinition = {
  difficulty: number;
  finishPad: Pad;
  height: number;
  number: number;
  obstacles: Obstacle[];
  sections: LevelSection[];
  stars: Star[];
  startPad: Pad;
  width: number;
};

export type Rocket = {
  angle: number;
  height: number;
  landed: boolean;
  launched: boolean;
  position: Vector;
  radius: number;
  restingPad: "start" | "finish" | null;
  thrusting: boolean;
  velocity: Vector;
  width: number;
};

export type Camera = {
  center: Vector;
  zoom: number;
};

export type LandingMetrics = {
  angleDegrees: number;
  horizontalSpeed: number;
  totalSpeed: number;
  verticalSpeed: number;
};

export type FailureReason =
  | "obstacle"
  | "out-of-bounds"
  | "hard-landing"
  | "bad-angle";

export type LandingThresholds = {
  angleDegrees: number;
  horizontalSpeed: number;
  verticalSpeed: number;
};

export type GameInput = {
  steer: number;
  thrust: boolean;
};

export type GameWorld = {
  arena: ArenaSize;
  camera: Camera;
  currentSectionKind: LevelSectionKind;
  event: GameEvent;
  eventNonce: number;
  failureReason: FailureReason | null;
  landingMetrics: LandingMetrics | null;
  level: LevelDefinition;
  levelNumber: number;
  maxLevel: number;
  message: string;
  progress: number;
  rocket: Rocket;
  status: GameStatus;
  time: number;
};
