const CAMERA_DEFAULT = {
  gameplayDepth: 7.2,
  gameplayHeight: 2.1,
  minFov: 48,
  maxFov: 60,
  finishDepth: 10.5,
  finishHeight: 5.4,
  finishSide: 6.8,
  finishFov: 58
};

function smoothCamera(overrides = {}) {
  return { ...CAMERA_DEFAULT, ...overrides };
}

function mapSegmentPositions(routeLength, defs) {
  const startX = -routeLength * 0.5;
  return defs.map((seg) => {
    const out = { ...seg };
    if (typeof seg.n0 === "number") out.x0 = startX + seg.n0 * routeLength;
    if (typeof seg.n1 === "number") out.x1 = startX + seg.n1 * routeLength;
    delete out.n0;
    delete out.n1;

    if (Array.isArray(seg.items)) {
      out.items = seg.items.map((item) => {
        const mapped = { ...item };
        if (typeof item.n === "number") mapped.x = startX + item.n * routeLength;
        delete mapped.n;
        return mapped;
      });
    }

    return out;
  });
}

function makeLevel(config) {
  const routeLength = config.routeLength;
  const startX = -routeLength * 0.5;
  const finishX = routeLength * 0.5;
  const finishSize = config.finishPadSize ?? 6.0;
  const spawnPadSize = config.launchPadSize ?? 3.4;

  const segments = mapSegmentPositions(routeLength, config.segments || []);
  if (!segments.some((s) => s.type === "finishApproach")) {
    segments.push({
      type: "finishApproach",
      x0: finishX - Math.min(12, routeLength * 0.22),
      x1: finishX
    });
  }

  return {
    id: config.id,
    name: config.name,
    gravity: config.gravity,
    routeLength,
    spawn: { x: startX, y: config.spawnY ?? 1.15, z: config.spawnZ ?? 0 },
    finishPad: { x: finishX, y: 0.5, z: 0, size: finishSize },
    launchPad: { x: startX, y: 0.5, z: 0, size: spawnPadSize },
    camera: smoothCamera(config.camera),
    corridor: {
      baseHalfHeight: config.corridorHalfHeight,
      baseHalfWidth: config.corridorHalfWidth,
      cutawaySide: "camera"
    },
    segments,
    visualTheme: "dark_sci_fi",
    difficulty: config.id
  };
}

export const LEVELS = [
  makeLevel({
    id: 1,
    name: "Straight Run",
    gravity: 8.8,
    routeLength: 40,
    corridorHalfHeight: 4.8,
    corridorHalfWidth: 5.4,
    segments: [
      { type: "straight", n0: 0.00, n1: 0.82 }
    ]
  }),

  makeLevel({
    id: 2,
    name: "Soft Curve",
    gravity: 9.0,
    routeLength: 46,
    corridorHalfHeight: 4.6,
    corridorHalfWidth: 4.9,
    segments: [
      { type: "curve", n0: 0.12, n1: 0.52, from: 0.0, to: 1.0 },
      { type: "curve", n0: 0.52, n1: 0.82, from: 1.0, to: 0.2 },
      { type: "walls", n0: 0.22, n1: 0.72, halfWidth: 4.2 }
    ]
  }),

  makeLevel({
    id: 3,
    name: "Single Arch",
    gravity: 9.2,
    routeLength: 50,
    corridorHalfHeight: 4.7,
    corridorHalfWidth: 4.8,
    segments: [
      { type: "straight", n0: 0.00, n1: 0.30 },
      { type: "arch", n0: 0.34, n1: 0.54, drop: 2.3 },
      { type: "straight", n0: 0.54, n1: 0.82 }
    ]
  }),

  makeLevel({
    id: 4,
    name: "Curve And Arch",
    gravity: 9.5,
    routeLength: 56,
    corridorHalfHeight: 4.5,
    corridorHalfWidth: 4.6,
    segments: [
      { type: "curve", n0: 0.08, n1: 0.36, from: 0.0, to: 0.8 },
      { type: "arch", n0: 0.42, n1: 0.60, drop: 2.0 },
      { type: "curve", n0: 0.56, n1: 0.84, from: 0.8, to: -0.2 },
      { type: "walls", n0: 0.18, n1: 0.76, halfWidth: 4.0 }
    ]
  }),

  makeLevel({
    id: 5,
    name: "Dip And Ceiling",
    gravity: 9.8,
    routeLength: 64,
    corridorHalfHeight: 4.3,
    corridorHalfWidth: 4.4,
    segments: [
      { type: "dip", n0: 0.20, n1: 0.42, depth: 1.5 },
      { type: "arch", n0: 0.45, n1: 0.63, drop: 2.2 },
      { type: "mound", n0: 0.66, n1: 0.78, height: 0.8 },
      { type: "walls", n0: 0.28, n1: 0.74, halfWidth: 3.9 }
    ]
  }),

  makeLevel({
    id: 6,
    name: "Twin Arches",
    gravity: 10.2,
    routeLength: 74,
    corridorHalfHeight: 4.1,
    corridorHalfWidth: 4.1,
    segments: [
      { type: "arch", n0: 0.24, n1: 0.38, drop: 2.2 },
      { type: "walls", n0: 0.20, n1: 0.62, halfWidth: 3.6 },
      { type: "arch", n0: 0.46, n1: 0.61, drop: 2.35 },
      { type: "dip", n0: 0.64, n1: 0.78, depth: 1.0 }
    ]
  }),

  makeLevel({
    id: 7,
    name: "Bulge And Arch",
    gravity: 10.8,
    routeLength: 86,
    corridorHalfHeight: 3.95,
    corridorHalfWidth: 3.9,
    segments: [
      { type: "mound", n0: 0.22, n1: 0.42, height: 1.35 },
      { type: "arch", n0: 0.40, n1: 0.57, drop: 2.45 },
      { type: "walls", n0: 0.28, n1: 0.70, halfWidth: 3.45 },
      { type: "curve", n0: 0.58, n1: 0.84, from: 0.0, to: 0.7 }
    ]
  }),

  makeLevel({
    id: 8,
    name: "Interior Rocks",
    gravity: 11.3,
    routeLength: 96,
    corridorHalfHeight: 3.8,
    corridorHalfWidth: 4.2,
    camera: { gameplayDepth: 8.0, maxFov: 62 },
    segments: [
      { type: "walls", n0: 0.16, n1: 0.82, halfWidth: 3.5 },
      { type: "arch", n0: 0.30, n1: 0.43, drop: 2.0 },
      { type: "rocks", n0: 0.34, n1: 0.68, items: [
        { n: 0.38, y: 2.4, z: -1.8, r: 0.95, sx: 1.2, sy: 1.0, sz: 0.9 },
        { n: 0.50, y: 1.5, z: -0.8, r: 1.05, sx: 1.0, sy: 1.25, sz: 0.9 },
        { n: 0.62, y: 3.2, z: -2.1, r: 0.9, sx: 1.0, sy: 0.85, sz: 1.2 }
      ] }
    ]
  }),

  makeLevel({
    id: 9,
    name: "Long Gauntlet",
    gravity: 11.9,
    routeLength: 112,
    corridorHalfHeight: 3.65,
    corridorHalfWidth: 3.85,
    camera: { gameplayDepth: 8.3, maxFov: 63 },
    segments: [
      { type: "curve", n0: 0.08, n1: 0.22, from: 0.0, to: 0.8 },
      { type: "arch", n0: 0.24, n1: 0.36, drop: 2.25 },
      { type: "dip", n0: 0.36, n1: 0.48, depth: 1.35 },
      { type: "walls", n0: 0.20, n1: 0.86, halfWidth: 3.35 },
      { type: "mound", n0: 0.54, n1: 0.67, height: 1.0 },
      { type: "arch", n0: 0.68, n1: 0.80, drop: 2.35 },
      { type: "rocks", n0: 0.40, n1: 0.82, items: [
        { n: 0.44, y: 2.8, z: -1.4, r: 0.85, sx: 1.1, sy: 0.9, sz: 1.2 },
        { n: 0.58, y: 1.3, z: -2.0, r: 1.0, sx: 1.2, sy: 1.2, sz: 0.95 },
        { n: 0.72, y: 2.4, z: -0.7, r: 0.9, sx: 0.9, sy: 1.15, sz: 1.0 }
      ] }
    ]
  }),

  makeLevel({
    id: 10,
    name: "Final Run",
    gravity: 12.4,
    routeLength: 132,
    corridorHalfHeight: 3.55,
    corridorHalfWidth: 3.7,
    camera: { gameplayDepth: 8.8, maxFov: 64, finishSide: 7.4, finishDepth: 11.2 },
    segments: [
      { type: "curve", n0: 0.06, n1: 0.18, from: 0.0, to: 0.9 },
      { type: "walls", n0: 0.14, n1: 0.90, halfWidth: 3.15 },
      { type: "arch", n0: 0.20, n1: 0.30, drop: 2.2 },
      { type: "dip", n0: 0.30, n1: 0.40, depth: 1.4 },
      { type: "mound", n0: 0.46, n1: 0.56, height: 1.2 },
      { type: "arch", n0: 0.56, n1: 0.66, drop: 2.45 },
      { type: "curve", n0: 0.64, n1: 0.76, from: 0.9, to: -0.1 },
      { type: "rocks", n0: 0.34, n1: 0.88, items: [
        { n: 0.38, y: 2.7, z: -1.8, r: 0.9, sx: 1.15, sy: 1.0, sz: 0.95 },
        { n: 0.52, y: 1.4, z: -1.0, r: 1.05, sx: 1.1, sy: 1.25, sz: 1.1 },
        { n: 0.63, y: 3.0, z: -2.2, r: 0.95, sx: 1.25, sy: 0.9, sz: 1.15 },
        { n: 0.78, y: 2.1, z: -0.6, r: 0.85, sx: 0.95, sy: 1.1, sz: 0.95 }
      ] }
    ]
  })
];
