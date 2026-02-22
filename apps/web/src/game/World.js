import * as THREE from "three";

export class World {
  constructor() {
    this.group = new THREE.Group();
    this._time = 0;
    this.worldHalfX = 120;
    this.worldHalfZ = 60;
    this._terrainProfile = null;
    this._craters = [];
    this._mountains = [];
    this._chasms = [];
    this._centerSpires = [];
    this._tunnelGates = [];
    this._tunnelCollisionBoxes = [];
    this._terrainPeakY = 0;
    this._routePeakY = 0;
    this._tunnelOpeningTopY = 0;
    this._flightCeilingY = 12;
    this._canyonHazeBaseOpacity = 0.08;

    const hemi = new THREE.HemisphereLight(0x99cfff, 0x0f0818, 0.95);
    this.group.add(hemi);

    const dir = new THREE.DirectionalLight(0xeef6ff, 1.05);
    dir.position.set(10, 16, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 70;
    dir.shadow.camera.left = -28;
    dir.shadow.camera.right = 28;
    dir.shadow.camera.top = 28;
    dir.shadow.camera.bottom = -28;
    dir.shadow.bias = -0.00025;
    this.group.add(dir);
    this.sunLight = dir;

    this.skyDome = this._createSkyDome();
    this.group.add(this.skyDome);

    this.starField = this._createStarField();
    this.group.add(this.starField);

    this.horizonGlowA = this._createHorizonGlow(24, 36, 0x00ddff, 0.18);
    this.group.add(this.horizonGlowA);
    this.horizonGlowB = this._createHorizonGlow(28, 44, 0xff2bd6, 0.1);
    this.group.add(this.horizonGlowB);

    this.terrain = this._createTerrain();
    this.group.add(this.terrain);

    this.canyonRim = this._createCanyonRim();
    this.group.add(this.canyonRim);

    this.routeFeatures = new THREE.Group();
    this.group.add(this.routeFeatures);

    this.launchPad = this._createLaunchPad();
    this.launchPad.position.set(-10, 0.5, 0);
    this.launchPad.castShadow = true;
    this.launchPad.receiveShadow = true;
    this.group.add(this.launchPad);

    this.landingPad = this._createLandingPad();
    this.landingPad.position.set(12, 0.5, 0);
    this.landingPad.castShadow = true;
    this.landingPad.receiveShadow = true;
    this.group.add(this.landingPad);

    this.launchGlow = new THREE.PointLight(0x00ffff, 2.3, 26, 2);
    this.launchGlow.position.set(this.launchPad.position.x, 2.8, this.launchPad.position.z);
    this.group.add(this.launchGlow);

    this.landingGlow = new THREE.PointLight(0xffcf45, 2.2, 24, 2);
    this.landingGlow.position.set(this.landingPad.position.x, 2.8, this.landingPad.position.z);
    this.group.add(this.landingGlow);

    this.roof = this._createRoof();
    this.roof.visible = false;
    this.roof.castShadow = true;
    this.roof.receiveShadow = true;
    this.group.add(this.roof);

    this.launchPadHalf = 1.5;
    this.landingPadHalf = 1.5;
    this.spawn = new THREE.Vector3(-10, this.launchPadTopY() + 0.6, 0);

    // Initialize with a flat profile; real values are applied per level.
    this._applyTerrainProfile({
      terrainAmp: 0,
      terrainRidge: 0,
      terrainDetail: 0,
      terrainFreqX: 0.08,
      terrainFreqZ: 0.08,
      terrainDiagFreq: 0.05,
      craterCount: 0,
      craterDepth: 0,
      craterRadiusMin: 1.2,
      craterRadiusMax: 2.8,
      craterRim: 0,
      terrainSeed: 1,
      corridorHalfWidth: 6,
      corridorFlattenStrength: 1,
      mountainCount: 0,
      mountainHeight: 0,
      mountainIntrusion: 0,
      mountainRadiusMin: 1.5,
      mountainRadiusMax: 3.0,
      centerSpireCount: 0,
      centerSpireHeight: 0,
      centerSpireRadiusMin: 0.9,
      centerSpireRadiusMax: 1.8,
      chasmCount: 0,
      chasmDepth: 0,
      chasmWidthX: 1.0,
      chasmWidthZ: 4.0,
      tunnelGateCount: 0,
      tunnelGapWidth: 3.2,
      tunnelGapHeight: 3.6,
      tunnelDepth: 1.1,
      tunnelFrameThickness: 0.45,
      terrainMinClamp: -2.8,
      terrainMaxClamp: 4.8
    });
  }

  _createSkyDome() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0.0, "#010108");
    g.addColorStop(0.35, "#050b1d");
    g.addColorStop(0.65, "#1a0b2f");
    g.addColorStop(1.0, "#030309");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(140, 40, 24), mat);
    mesh.position.set(1, 18, 0);
    return mesh;
  }

  _createStarField() {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 46 + Math.random() * 82;
      const y = 8 + Math.pow(Math.random(), 0.45) * 78;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;

      const t = Math.random();
      c.setRGB(0.65 + t * 0.35, 0.75 + t * 0.25, 1.0);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.48,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false
    });

    return new THREE.Points(geom, mat);
  }

  _createHorizonGlow(inner, outer, color, opacity) {
    const geom = new THREE.RingGeometry(inner, outer, 96);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(1, 0.2, 0);
    return mesh;
  }

  _createTerrain() {
    this.terrainGeom = new THREE.PlaneGeometry(this.worldHalfX * 2, this.worldHalfZ * 2, 240, 120);
    this.terrainGeom.rotateX(-Math.PI / 2);

    this.terrainBase = new THREE.Mesh(
      this.terrainGeom,
      new THREE.MeshStandardMaterial({
        color: 0x4b4d52,
        emissive: 0x07090b,
        emissiveIntensity: 0.08,
        metalness: 0.02,
        roughness: 0.98
      })
    );
    this.terrainBase.position.y = -0.012;
    this.terrainBase.receiveShadow = true;

    this.terrainWire = new THREE.Mesh(
      this.terrainGeom,
      new THREE.MeshStandardMaterial({
        color: 0x6d7783,
        emissive: 0x0a1017,
        emissiveIntensity: 0.08,
        metalness: 0.0,
        roughness: 0.95,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      })
    );
    this.terrainWire.receiveShadow = false;

    const terrainGroup = new THREE.Group();
    terrainGroup.add(this.terrainBase);
    terrainGroup.add(this.terrainWire);
    return terrainGroup;
  }

  _padAdd(parent, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _createLaunchPad() {
    const group = new THREE.Group();

    const hull = new THREE.MeshStandardMaterial({
      color: 0x2c3138,
      emissive: 0x080a10,
      emissiveIntensity: 0.08,
      metalness: 0.36,
      roughness: 0.72
    });
    const deck = new THREE.MeshStandardMaterial({
      color: 0x474f58,
      emissive: 0x080c13,
      emissiveIntensity: 0.08,
      metalness: 0.22,
      roughness: 0.84
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x6af8ff,
      emissive: 0x0b4252,
      emissiveIntensity: 0.65,
      metalness: 0.3,
      roughness: 0.26
    });
    const caution = new THREE.MeshStandardMaterial({
      color: 0xd7b05f,
      emissive: 0x2e1f08,
      emissiveIntensity: 0.2,
      metalness: 0.22,
      roughness: 0.42
    });

    this._padAdd(group, new THREE.CylinderGeometry(1.52, 1.45, 0.86, 8), hull, 0, -0.07, 0);
    this._padAdd(group, new THREE.CylinderGeometry(1.42, 1.42, 0.12, 8), deck, 0, 0.44, 0);
    this._padAdd(group, new THREE.CylinderGeometry(1.15, 1.15, 0.04, 8), deck, 0, 0.49, 0);

    const trenchRing = this._padAdd(
      group,
      new THREE.TorusGeometry(1.05, 0.03, 10, 48),
      trim,
      0,
      0.505,
      0,
      Math.PI / 2,
      0,
      0
    );
    trenchRing.receiveShadow = false;

    const railGeom = new THREE.BoxGeometry(0.14, 0.06, 1.1);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const x = Math.cos(a) * 0.72;
      const z = Math.sin(a) * 0.72;
      const rail = this._padAdd(group, railGeom, trim, x, 0.505, z, 0, a, 0);
      rail.receiveShadow = false;
    }

    const pylonGeom = new THREE.BoxGeometry(0.14, 0.44, 0.14);
    const pylonCapGeom = new THREE.BoxGeometry(0.22, 0.06, 0.22);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = 1.2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      this._padAdd(group, pylonGeom, hull, x, 0.74, z);
      this._padAdd(group, pylonCapGeom, caution, x, 0.99, z);
    }

    // Imperial-style docking braces / gantries
    for (const side of [-1, 1]) {
      const gx = side * 0.88;
      this._padAdd(group, new THREE.BoxGeometry(0.12, 0.9, 0.12), hull, gx, 0.95, 0);
      this._padAdd(group, new THREE.BoxGeometry(0.12, 0.72, 0.12), hull, gx * 0.86, 0.82, 0.52);
      this._padAdd(group, new THREE.BoxGeometry(0.12, 0.72, 0.12), hull, gx * 0.86, 0.82, -0.52);
      this._padAdd(group, new THREE.BoxGeometry(0.22, 0.08, 1.14), hull, gx * 0.93, 1.34, 0);

      const lamp = this._padAdd(group, new THREE.BoxGeometry(0.06, 0.06, 0.9), trim, gx * 0.93, 1.29, 0);
      lamp.receiveShadow = false;
    }

    return group;
  }

  _createLandingPad() {
    const group = new THREE.Group();

    const base = new THREE.MeshStandardMaterial({
      color: 0x343b45,
      emissive: 0x080a10,
      emissiveIntensity: 0.08,
      metalness: 0.28,
      roughness: 0.78
    });
    const yellow = new THREE.MeshStandardMaterial({
      color: 0xffd347,
      emissive: 0x473208,
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.34
    });
    const black = new THREE.MeshStandardMaterial({
      color: 0x0f1116,
      emissive: 0x050608,
      emissiveIntensity: 0.04,
      metalness: 0.32,
      roughness: 0.58
    });

    this._padAdd(group, new THREE.CylinderGeometry(1.5, 1.42, 0.9, 32), base, 0, -0.05, 0);
    this._padAdd(group, new THREE.CylinderGeometry(1.42, 1.42, 0.08, 32), yellow, 0, 0.46, 0);
    this._padAdd(group, new THREE.CylinderGeometry(1.14, 1.14, 0.03, 32), base, 0, 0.495, 0);

    const ring = this._padAdd(
      group,
      new THREE.TorusGeometry(1.31, 0.04, 12, 64),
      yellow,
      0,
      0.505,
      0,
      Math.PI / 2
    );
    ring.receiveShadow = false;

    // Black warning stripes around the edge (scaled with pad size because they are children of the pad group).
    const stripeGeom = new THREE.BoxGeometry(0.12, 0.035, 0.36);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const x = Math.cos(a) * 1.3;
      const z = Math.sin(a) * 1.3;
      const stripe = this._padAdd(group, stripeGeom, black, x, 0.51, z, 0, a, 0);
      stripe.receiveShadow = false;
    }

    const centerMark = this._padAdd(group, new THREE.RingGeometry(0.58, 0.72, 32), black, 0, 0.514, 0, -Math.PI / 2);
    centerMark.receiveShadow = false;
    const hBarA = this._padAdd(group, new THREE.BoxGeometry(0.15, 0.02, 0.85), black, 0, 0.515, 0);
    hBarA.receiveShadow = false;
    const hBarB = this._padAdd(group, new THREE.BoxGeometry(0.75, 0.02, 0.14), black, 0, 0.515, 0);
    hBarB.receiveShadow = false;

    return group;
  }

  _createCanyonRim() {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x50555d,
      emissive: 0x090b0f,
      emissiveIntensity: 0.06,
      metalness: 0.02,
      roughness: 0.98
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x6a717b,
      emissive: 0x0b0d12,
      emissiveIntensity: 0.06,
      metalness: 0.02,
      roughness: 0.94
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x334455,
      transparent: true,
      opacity: 0.08,
      depthWrite: false
    });

    this.canyonRockMat = rockMat;
    this.canyonCapMat = capMat;
    this.canyonRimGroup = group;

    const addRock = (geom, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };

    const rand = this._randFactory(74021);
    const sideDepthBase = 5.2;
    const sideZBase = this.worldHalfZ + 8;
    const spanX = this.worldHalfX + 24;
    const sideSegments = 34;
    for (const sign of [-1, 1]) {
      for (let i = 0; i < sideSegments; i++) {
        const t = sideSegments === 1 ? 0.5 : i / (sideSegments - 1);
        const x = -spanX + t * spanX * 2 + (rand() - 0.5) * 2.6;
        const w = 3.2 + rand() * 3.6;
        const h = 6.0 + rand() * 7.0 + (i % 3 === 0 ? 2.0 : 0);
        const d = sideDepthBase + rand() * 3.6;
        const z = sign * (sideZBase + rand() * 2.8);
        const y = h * 0.5 - 0.3;
        const rotY = (rand() - 0.5) * 0.14;
        addRock(new THREE.BoxGeometry(w, h, d), rockMat, x, y, z, (rand() - 0.5) * 0.08, rotY, (rand() - 0.5) * 0.08);

        if (rand() > 0.35) {
          const mesa = addRock(
            new THREE.DodecahedronGeometry(1, 0),
            capMat,
            x + (rand() - 0.5) * 1.6,
            y + h * 0.45 + 1.2 + rand() * 1.4,
            z + (rand() - 0.5) * 1.6,
            rand() * Math.PI,
            rand() * Math.PI,
            rand() * Math.PI,
            1.0 + rand() * 1.4,
            0.8 + rand() * 1.6,
            1.0 + rand() * 1.5
          );
          mesa.castShadow = true;
        }
      }
    }

    // End walls to complete the canyon enclosure.
    const endSegments = 14;
    const spanZ = this.worldHalfZ + 10;
    for (const sign of [-1, 1]) {
      for (let i = 0; i < endSegments; i++) {
        const t = endSegments === 1 ? 0.5 : i / (endSegments - 1);
        const z = -spanZ + t * spanZ * 2 + (rand() - 0.5) * 1.7;
        const w = 4.8 + rand() * 3.2;
        const h = 6.5 + rand() * 8.0;
        const d = 3.0 + rand() * 3.4;
        const x = sign * (this.worldHalfX + 16 + rand() * 5.0);
        addRock(new THREE.BoxGeometry(d, h, w), rockMat, x, h * 0.5 - 0.5, z, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.06);
      }
    }

    // Low atmospheric floor haze to blend the canyon walls into the scene.
    const haze = new THREE.Mesh(new THREE.RingGeometry(36, 92, 128), glowMat);
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = 0.08;
    haze.receiveShadow = false;
    group.add(haze);
    this.canyonHaze = haze;

    return group;
  }

  _createRoof() {
    const g = new THREE.BoxGeometry(20, 1, 18);
    const m = new THREE.MeshStandardMaterial({
      color: 0x9900ff,
      emissive: 0x220022,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.35
    });
    const roof = new THREE.Mesh(g, m);
    roof.position.set(2, 7.0, 0);
    return roof;
  }

  _randFactory(seed) {
    let s = (seed | 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
    return t * t * (3 - 2 * t);
  }

  _generateCraters(profile) {
    this._craters = [];
    if (!profile.craterCount || profile.craterCount <= 0) return;

    const rand = this._randFactory(profile.terrainSeed || 1);
    const craterHalfX = this.worldHalfX * 0.9;
    const craterHalfZ = this.worldHalfZ * 0.82;
    for (let i = 0; i < profile.craterCount; i++) {
      const x = -craterHalfX + rand() * craterHalfX * 2;
      const z = -craterHalfZ + rand() * craterHalfZ * 2;
      const radius = profile.craterRadiusMin + rand() * (profile.craterRadiusMax - profile.craterRadiusMin);
      const depth = profile.craterDepth * (0.55 + rand() * 0.85);
      const rim = profile.craterRim * (0.7 + rand() * 0.8);
      this._craters.push({ x, z, radius, depth, rim });
    }
  }

  _generateHazards(profile) {
    this._mountains = [];
    this._chasms = [];
    this._centerSpires = [];
    this._tunnelGates = [];
    this._tunnelCollisionBoxes = [];

    const rand = this._randFactory((profile.terrainSeed || 1) * 97 + 13);
    const routeMinX = this.launchPad.position.x + 3.5;
    const routeMaxX = this.landingPad.position.x - 1.2;
    const corridorHalf = Math.max(1.5, profile.corridorHalfWidth ?? 4.5);
    const usableHalf = Math.max(0.9, corridorHalf - 0.5);

    const mountainCount = Math.max(0, profile.mountainCount || 0);
    for (let i = 0; i < mountainCount; i++) {
      const t = (i + 1) / (mountainCount + 1);
      const x = routeMinX + (routeMaxX - routeMinX) * t + (rand() - 0.5) * 1.8;
      const side = ((i + (profile.terrainSeed || 1)) % 2 === 0) ? 1 : -1;
      const intrude = Math.max(0, Math.min(1, profile.mountainIntrusion ?? 0.4));
      const laneBase = corridorHalf * (0.75 - intrude * 0.55);
      const z = side * (laneBase + (rand() - 0.5) * Math.max(0.6, corridorHalf * 0.45));
      const rx = (profile.mountainRadiusMin || 1.5) + rand() * ((profile.mountainRadiusMax || 3.0) - (profile.mountainRadiusMin || 1.5));
      const rz = rx * (0.75 + rand() * 0.75);
      const h = (profile.mountainHeight || 0) * (0.8 + rand() * 0.55);
      this._mountains.push({ x, z, rx, rz, h });
    }

    const chasmCount = Math.max(0, profile.chasmCount || 0);
    for (let i = 0; i < chasmCount; i++) {
      const t = (i + 1) / (chasmCount + 1);
      const x = routeMinX + (routeMaxX - routeMinX) * t + (rand() - 0.5) * 2.2;
      const side = ((i + (profile.terrainSeed || 1)) % 2 === 0) ? -1 : 1;
      const z = side * corridorHalf * (0.15 + rand() * 0.45);
      const rx = (profile.chasmWidthX || 1.0) * (0.8 + rand() * 0.6);
      const rz = (profile.chasmWidthZ || 4.0) * (0.85 + rand() * 0.55);
      const depth = (profile.chasmDepth || 0) * (0.8 + rand() * 0.45);
      const rim = depth * 0.12;
      this._chasms.push({ x, z, rx, rz, depth, rim });
    }

    const centerSpireCount = Math.max(0, profile.centerSpireCount || 0);
    for (let i = 0; i < centerSpireCount; i++) {
      const t = (i + 1) / (centerSpireCount + 1);
      const x = routeMinX + (routeMaxX - routeMinX) * t + (rand() - 0.5) * 1.8;
      const z = (rand() - 0.5) * Math.min(usableHalf * 1.2, 2.6);
      const rx = (profile.centerSpireRadiusMin || 1.0) + rand() * ((profile.centerSpireRadiusMax || 2.0) - (profile.centerSpireRadiusMin || 1.0));
      const rz = rx * (0.8 + rand() * 0.6);
      const h = (profile.centerSpireHeight || 0) * (0.82 + rand() * 0.45);
      this._centerSpires.push({ x, z, rx, rz, h });
    }

    const tunnelGateCount = Math.max(0, profile.tunnelGateCount || 0);
    for (let i = 0; i < tunnelGateCount; i++) {
      const t = (i + 1) / (tunnelGateCount + 1);
      const x = routeMinX + (routeMaxX - routeMinX) * t + (rand() - 0.5) * 1.4;
      const z = (rand() - 0.5) * Math.min(usableHalf * 0.9, 1.9);
      const openW = (profile.tunnelGapWidth || 3.0) * (0.92 + rand() * 0.16);
      const openH = (profile.tunnelGapHeight || 3.4) * (0.94 + rand() * 0.12);
      const depth = (profile.tunnelDepth || 1.1) * (0.9 + rand() * 0.2);
      const frameThickness = (profile.tunnelFrameThickness || 0.45) * (0.92 + rand() * 0.18);
      this._tunnelGates.push({ x, z, openW, openH, depth, frameThickness });
    }
  }

  _routeFeatureDeltaAt(x, z) {
    let y = 0;

    for (const s of this._centerSpires) {
      const dx = (x - s.x) / s.rx;
      const dz = (z - s.z) / s.rz;
      const q = dx * dx + dz * dz;
      if (q < 8) {
        y += Math.exp(-q) * s.h;

        // Sharpen the silhouette slightly so the center feels more like rock spires than smooth hills.
        if (q < 2.4) {
          y += Math.exp(-q * 1.8) * s.h * 0.35;
        }
      }
    }

    return y;
  }

  _terrainHeightRaw(x, z) {
    const p = this._terrainProfile;
    if (!p) return 0;
    if (
      p.terrainAmp <= 0 &&
      p.craterCount <= 0 &&
      (p.mountainCount || 0) <= 0 &&
      (p.chasmCount || 0) <= 0
    ) return 0;

    let y = 0;
    const seed = p.terrainSeed || 1;

    y += Math.sin(x * p.terrainFreqX + seed * 0.71) * p.terrainAmp * 0.42;
    y += Math.cos(z * p.terrainFreqZ - seed * 0.43) * p.terrainAmp * 0.35;
    y += Math.sin((x + z) * p.terrainDiagFreq + seed * 0.33) * p.terrainRidge * 0.4;
    y += Math.cos((x - z) * (p.terrainDiagFreq * 0.78) - seed * 0.21) * p.terrainRidge * 0.28;
    y += Math.sin(x * 0.31 + seed) * Math.cos(z * 0.27 - seed * 0.6) * p.terrainDetail;

    for (const c of this._craters) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.sqrt(dx * dx + dz * dz) / c.radius;

      if (d < 1.35) {
        if (d < 1) {
          const bowl = 1 - d * d;
          y -= bowl * c.depth;
        }
        const rimFalloff = (d - 1.02) / 0.22;
        y += Math.exp(-(rimFalloff * rimFalloff)) * c.rim;
      }
    }

    for (const m of this._mountains) {
      const dx = (x - m.x) / m.rx;
      const dz = (z - m.z) / m.rz;
      const q = dx * dx + dz * dz;
      if (q < 7) {
        y += Math.exp(-q) * m.h;
      }
    }

    for (const c of this._chasms) {
      const dx = (x - c.x) / c.rx;
      const dz = (z - c.z) / c.rz;
      const q = dx * dx + dz * dz;
      if (q < 8) {
        y -= Math.exp(-q) * c.depth;
        const rimDist = Math.sqrt(q);
        const rimBand = (rimDist - 1.08) / 0.28;
        y += Math.exp(-(rimBand * rimBand)) * c.rim;
      }
    }

    return y;
  }

  _flattenAround(y, x, z, cx, cz, flatRadius, blendRadius) {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d <= flatRadius) return 0;
    if (d >= blendRadius) return y;
    const t = this._smoothstep(flatRadius, blendRadius, d);
    return y * t;
  }

  _terrainHeightAt(x, z) {
    let y = this._terrainHeightRaw(x, z);
    const p = this._terrainProfile || {};

    const launchBlend = this.launchPadHalf + 1.7;
    const landingBlend = this.landingPadHalf + 2.0;
    y = this._flattenAround(y, x, z, this.launchPad.position.x, this.launchPad.position.z, this.launchPadHalf + 0.55, launchBlend);
    y = this._flattenAround(y, x, z, this.landingPad.position.x, this.landingPad.position.z, this.landingPadHalf + 0.65, landingBlend);

    const corridorHalf = p.corridorHalfWidth ?? 4.5;
    if (corridorHalf > 0 && x > this.launchPad.position.x - 1.5 && x < this.landingPad.position.x + 2.5) {
      const az = Math.abs(z);
      if (az < corridorHalf + 1.2) {
        const t = this._smoothstep(corridorHalf, corridorHalf + 1.2, az);
        const flattenStrength = Math.max(0, Math.min(1, p.corridorFlattenStrength ?? 1));
        const flattened = y * t;
        y += (flattened - y) * flattenStrength;
      }
    }

    y += this._routeFeatureDeltaAt(x, z);

    const minClamp = p.terrainMinClamp ?? -2.8;
    const maxClamp = p.terrainMaxClamp ?? 4.8;
    return Math.max(minClamp, Math.min(maxClamp, y));
  }

  _applyTerrainProfile(level) {
    this._terrainProfile = {
      terrainAmp: level.terrainAmp ?? 0,
      terrainRidge: level.terrainRidge ?? 0,
      terrainDetail: level.terrainDetail ?? 0,
      terrainFreqX: level.terrainFreqX ?? 0.1,
      terrainFreqZ: level.terrainFreqZ ?? 0.09,
      terrainDiagFreq: level.terrainDiagFreq ?? 0.07,
      craterCount: level.craterCount ?? 0,
      craterDepth: level.craterDepth ?? 0,
      craterRadiusMin: level.craterRadiusMin ?? 1.2,
      craterRadiusMax: level.craterRadiusMax ?? 3.0,
      craterRim: level.craterRim ?? 0,
      terrainSeed: level.terrainSeed ?? 1,
      corridorHalfWidth: level.corridorHalfWidth ?? 4.5,
      corridorFlattenStrength: level.corridorFlattenStrength ?? 1,
      mountainCount: level.mountainCount ?? 0,
      mountainHeight: level.mountainHeight ?? 0,
      mountainIntrusion: level.mountainIntrusion ?? 0.4,
      mountainRadiusMin: level.mountainRadiusMin ?? 1.4,
      mountainRadiusMax: level.mountainRadiusMax ?? 3.1,
      centerSpireCount: level.centerSpireCount ?? 0,
      centerSpireHeight: level.centerSpireHeight ?? 0,
      centerSpireRadiusMin: level.centerSpireRadiusMin ?? 0.9,
      centerSpireRadiusMax: level.centerSpireRadiusMax ?? 1.8,
      chasmCount: level.chasmCount ?? 0,
      chasmDepth: level.chasmDepth ?? 0,
      chasmWidthX: level.chasmWidthX ?? 1.1,
      chasmWidthZ: level.chasmWidthZ ?? 4.4,
      tunnelGateCount: level.tunnelGateCount ?? 0,
      tunnelGapWidth: level.tunnelGapWidth ?? 3.2,
      tunnelGapHeight: level.tunnelGapHeight ?? 3.5,
      tunnelDepth: level.tunnelDepth ?? 1.1,
      tunnelFrameThickness: level.tunnelFrameThickness ?? 0.45,
      terrainMinClamp: level.terrainMinClamp ?? -2.8,
      terrainMaxClamp: level.terrainMaxClamp ?? 4.8
    };

    this._generateCraters(this._terrainProfile);
    this._generateHazards(this._terrainProfile);

    const pos = this.terrainGeom.attributes.position;
    let terrainPeakY = -Infinity;
    let routePeakY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this._terrainHeightAt(x, z);
      pos.setY(i, y);
      if (y > terrainPeakY) terrainPeakY = y;
      if (
        x >= this.launchPad.position.x - 2 &&
        x <= this.landingPad.position.x + 4 &&
        Math.abs(z) <= 11
      ) {
        routePeakY = Math.max(routePeakY, y);
      }
    }
    pos.needsUpdate = true;
    this.terrainGeom.computeVertexNormals();
    this._terrainPeakY = Number.isFinite(terrainPeakY) ? terrainPeakY : 0;
    this._routePeakY = Number.isFinite(routePeakY) ? routePeakY : this._terrainPeakY;

    const amp = this._terrainProfile.terrainAmp;
    const moonShade = Math.max(0, Math.min(1, amp / 2.8));
    this.terrainBase.material.color.setRGB(
      0.28 + moonShade * 0.08,
      0.29 + moonShade * 0.08,
      0.31 + moonShade * 0.09
    );
    this.terrainWire.material.opacity = 0.06 + moonShade * 0.1;
    if (this.canyonRockMat) {
      this.canyonRockMat.color.setRGB(
        0.22 + moonShade * 0.1,
        0.23 + moonShade * 0.1,
        0.26 + moonShade * 0.12
      );
    }
    if (this.canyonCapMat) {
      this.canyonCapMat.color.setRGB(
        0.34 + moonShade * 0.12,
        0.36 + moonShade * 0.12,
        0.40 + moonShade * 0.14
      );
    }
    if (this.canyonHaze) {
      this._canyonHazeBaseOpacity = 0.05 + moonShade * 0.06;
      this.canyonHaze.material.opacity = this._canyonHazeBaseOpacity;
    }

    this._rebuildRouteFeatures();
  }

  _disposeNode(node) {
    if (!node) return;
    if (node.geometry) node.geometry.dispose?.();
    if (Array.isArray(node.material)) {
      for (const m of node.material) m?.dispose?.();
    } else {
      node.material?.dispose?.();
    }
  }

  _clearRouteFeatures() {
    if (!this.routeFeatures) return;
    this.routeFeatures.traverse((node) => {
      if (node.isMesh) this._disposeNode(node);
    });
    this.routeFeatures.clear();
    this._tunnelCollisionBoxes = [];
    this._tunnelOpeningTopY = 0;
  }

  _pushTunnelCollisionBox(cx, cy, cz, sx, sy, sz) {
    this._tunnelCollisionBoxes.push({
      minX: cx - sx * 0.5,
      maxX: cx + sx * 0.5,
      minY: cy - sy * 0.5,
      maxY: cy + sy * 0.5,
      minZ: cz - sz * 0.5,
      maxZ: cz + sz * 0.5
    });
  }

  _rebuildRouteFeatures() {
    this._clearRouteFeatures();
    if (!this._tunnelGates.length) return;

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x62666f,
      emissive: 0x090b10,
      emissiveIntensity: 0.08,
      metalness: 0.02,
      roughness: 0.96
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x89f6ff,
      emissive: 0x083e48,
      emissiveIntensity: 0.4,
      metalness: 0.22,
      roughness: 0.35
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x79f2ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (const gate of this._tunnelGates) {
      const gateGroup = new THREE.Group();

      const baseY = this.groundHeightAt(gate.x, gate.z) - 0.02;
      const frameT = Math.max(0.3, gate.frameThickness);
      const depth = Math.max(1.3, gate.depth); // used as tunnel thickness baseline
      const openW = Math.max(3.8, gate.openW); // lateral opening width (z axis)
      const openH = Math.max(4.3, gate.openH);
      const tunnelLen = Math.max(6.5, depth * 6.8 + openW * 0.9 + frameT * 3.0); // route direction (x axis)
      const ribCount = Math.max(5, Math.min(14, Math.round(tunnelLen / 1.05)));
      const beamH = Math.max(0.34, frameT * 1.15);
      const openingFloorY = baseY + 0.2;
      const beamBottomY = openingFloorY + openH;
      this._tunnelOpeningTopY = Math.max(this._tunnelOpeningTopY, beamBottomY);
      const topBeamCenterY = beamBottomY + beamH * 0.5;
      const postHeight = Math.max(1.1, beamBottomY - baseY);
      const postCenterY = baseY + postHeight * 0.5;
      const postOffsetZ = openW * 0.5 + frameT * 0.5;
      const capWidthZ = openW + frameT * 2;
      const tunnelOuterZ = openW + frameT * 3.4;
      const xMin = gate.x - tunnelLen * 0.5;
      const xMax = gate.x + tunnelLen * 0.5;

      // Main tunnel shell that runs along the route direction (X).
      const leftPost = new THREE.Mesh(new THREE.BoxGeometry(tunnelLen, postHeight, frameT), rockMat);
      leftPost.position.set(gate.x, postCenterY, gate.z - postOffsetZ);
      leftPost.castShadow = true;
      leftPost.receiveShadow = true;
      gateGroup.add(leftPost);
      this._pushTunnelCollisionBox(leftPost.position.x, leftPost.position.y, leftPost.position.z, tunnelLen, postHeight, frameT);

      const rightPost = new THREE.Mesh(new THREE.BoxGeometry(tunnelLen, postHeight, frameT), rockMat);
      rightPost.position.set(gate.x, postCenterY, gate.z + postOffsetZ);
      rightPost.castShadow = true;
      rightPost.receiveShadow = true;
      gateGroup.add(rightPost);
      this._pushTunnelCollisionBox(rightPost.position.x, rightPost.position.y, rightPost.position.z, tunnelLen, postHeight, frameT);

      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(tunnelLen, beamH, capWidthZ), rockMat);
      topBeam.position.set(gate.x, topBeamCenterY, gate.z);
      topBeam.castShadow = true;
      topBeam.receiveShadow = true;
      gateGroup.add(topBeam);
      this._pushTunnelCollisionBox(topBeam.position.x, topBeam.position.y, topBeam.position.z, tunnelLen, beamH, capWidthZ);

      const shellRoofH = Math.max(0.34, frameT * 1.2);
      const shellRoofY = topBeamCenterY + beamH * 0.5 + shellRoofH * 0.45;
      const shellRoof = new THREE.Mesh(new THREE.BoxGeometry(tunnelLen, shellRoofH, tunnelOuterZ), rockMat);
      shellRoof.position.set(gate.x, shellRoofY, gate.z);
      shellRoof.castShadow = true;
      shellRoof.receiveShadow = true;
      gateGroup.add(shellRoof);
      this._pushTunnelCollisionBox(shellRoof.position.x, shellRoof.position.y, shellRoof.position.z, tunnelLen, shellRoofH, tunnelOuterZ);

      const shellSideH = Math.max(1.1, openH * 0.82);
      const shellSideY = openingFloorY + shellSideH * 0.5 + 0.05;
      const shellSideZ = openW * 0.5 + frameT * 1.35;
      for (const sign of [-1, 1]) {
        const sideShell = new THREE.Mesh(new THREE.BoxGeometry(tunnelLen, shellSideH, frameT * 1.25), rockMat);
        sideShell.position.set(gate.x, shellSideY, gate.z + shellSideZ * sign);
        sideShell.castShadow = true;
        sideShell.receiveShadow = true;
        gateGroup.add(sideShell);
        this._pushTunnelCollisionBox(sideShell.position.x, sideShell.position.y, sideShell.position.z, tunnelLen, shellSideH, frameT * 1.25);
      }

      // Thin illuminated trim around the opening makes the tunnel readable on fast approaches.
      const trimT = Math.max(0.04, frameT * 0.16);
      const trimFrameZ = Math.max(0.04, frameT * 0.55);
      const trimInsetX = tunnelLen * 0.5 - trimT * 0.5;
      for (const end of [-1, 1]) {
        const endX = gate.x + trimInsetX * end;

        const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(trimT, openH, trimFrameZ), trimMat);
        leftTrim.position.set(endX, openingFloorY + openH * 0.5, gate.z - openW * 0.5);
        leftTrim.castShadow = false;
        gateGroup.add(leftTrim);

        const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(trimT, openH, trimFrameZ), trimMat);
        rightTrim.position.set(endX, openingFloorY + openH * 0.5, gate.z + openW * 0.5);
        rightTrim.castShadow = false;
        gateGroup.add(rightTrim);

        const topTrim = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimT, openW), trimMat);
        topTrim.position.set(endX, openingFloorY + openH, gate.z);
        topTrim.castShadow = false;
        gateGroup.add(topTrim);

        const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(openW * 0.96, openH * 0.96), glowMat);
        glowPanel.position.set(gate.x + (tunnelLen * 0.5 + 0.02) * end, openingFloorY + openH * 0.5, gate.z);
        glowPanel.rotation.y = end > 0 ? -Math.PI / 2 : Math.PI / 2;
        glowPanel.castShadow = false;
        glowPanel.receiveShadow = false;
        gateGroup.add(glowPanel);
      }

      // Rib segments to make each obstacle read as a tunnel corridor.
      for (let i = 0; i < ribCount; i++) {
        const t = ribCount === 1 ? 0.5 : i / (ribCount - 1);
        const ribX = xMin + t * (xMax - xMin);
        const ribT = Math.max(0.06, frameT * 0.34);
        const ribMat = (i % 2 === 0) ? trimMat : rockMat;

        const ribLeft = new THREE.Mesh(new THREE.BoxGeometry(ribT, postHeight, frameT * 0.9), ribMat);
        ribLeft.position.set(ribX, postCenterY, gate.z - postOffsetZ);
        ribLeft.castShadow = false;
        gateGroup.add(ribLeft);

        const ribRight = new THREE.Mesh(new THREE.BoxGeometry(ribT, postHeight, frameT * 0.9), ribMat);
        ribRight.position.set(ribX, postCenterY, gate.z + postOffsetZ);
        ribRight.castShadow = false;
        gateGroup.add(ribRight);

        const ribTop = new THREE.Mesh(new THREE.BoxGeometry(ribT, beamH, capWidthZ * 0.98), ribMat);
        ribTop.position.set(ribX, topBeamCenterY, gate.z);
        ribTop.castShadow = false;
        gateGroup.add(ribTop);
      }

      // Exterior rock masses to make these read more like cave/tunnel cuts than sci-fi gates.
      const lumpCount = 4;
      for (let i = 0; i < lumpCount; i++) {
        const endSign = i < 2 ? -1 : 1;
        const sideSign = (i % 2 === 0) ? -1 : 1;
        const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockMat);
        lump.position.set(
          gate.x + endSign * (tunnelLen * 0.35 + Math.random() * 0.8),
          openingFloorY + openH * (0.65 + Math.random() * 0.35),
          gate.z + sideSign * (openW * 0.7 + Math.random() * 0.6)
        );
        lump.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        lump.scale.set(1.4 + Math.random() * 1.3, 1.1 + Math.random() * 1.6, 1.2 + Math.random() * 1.3);
        lump.castShadow = true;
        lump.receiveShadow = true;
        gateGroup.add(lump);
      }

      this.routeFeatures.add(gateGroup);
    }
  }

  _sphereHitsBox(pos, radius, box) {
    const dx = Math.max(box.minX - pos.x, 0, pos.x - box.maxX);
    const dy = Math.max(box.minY - pos.y, 0, pos.y - box.maxY);
    const dz = Math.max(box.minZ - pos.z, 0, pos.z - box.maxZ);
    return (dx * dx + dy * dy + dz * dz) <= radius * radius;
  }

  applyLevel(level) {
    const routeLength = Math.max(16, level.routeLength ?? 22);
    const routeMidX = 1.0;
    const launchX = routeMidX - routeLength * 0.5;
    const landingX = routeMidX + routeLength * 0.5;
    const launchZ = 0;
    const landingZ = 0;

    const launchSize = level.launchPadSize ?? level.padSize ?? 3.0;
    const landingSize = level.landingPadSize ?? level.padSize ?? 3.0;

    this.launchPad.position.set(launchX, 0.5, launchZ);
    this.landingPad.position.set(landingX, 0.5, landingZ);
    this.launchGlow.position.set(launchX, 2.8, launchZ);
    this.landingGlow.position.set(landingX, 2.8, landingZ);

    this.launchPad.scale.set(launchSize / 3, 1, launchSize / 3);
    this.landingPad.scale.set(landingSize / 3, 1, landingSize / 3);
    this.launchPadHalf = launchSize / 2;
    this.landingPadHalf = landingSize / 2;
    this.spawn.set(this.launchPad.position.x, this.launchPadTopY() + 0.6, this.launchPad.position.z);

    this.roof.visible = false;

    this._applyTerrainProfile(level);

    const ceilingMargin = level.ceilingMargin ?? 3;
    const minCeilingY = this.launchPadTopY() + 4.8;
    this._flightCeilingY = Math.max(
      minCeilingY,
      this._routePeakY + ceilingMargin,
      this._tunnelOpeningTopY + 1.0
    );
  }

  groundHeightAt(x, z) {
    return this._terrainHeightAt(x, z);
  }

  checkTunnelCollision(pos, radius = 0.38) {
    for (const box of this._tunnelCollisionBoxes) {
      if (this._sphereHitsBox(pos, radius, box)) return true;
    }
    return false;
  }

  flightCeilingY() {
    return this._flightCeilingY;
  }

  checkRoofCollision(pos) {
    if (!this.roof.visible) return false;
    const half = {
      x: 10 * this.roof.scale.x,
      y: 0.5 * this.roof.scale.y,
      z: 9 * this.roof.scale.z
    };
    const c = this.roof.position;
    return (
      Math.abs(pos.x - c.x) < half.x &&
      Math.abs(pos.y - c.y) < half.y &&
      Math.abs(pos.z - c.z) < half.z
    );
  }

  isOverLandingPad(pos) {
    const c = this.landingPad.position;
    return Math.abs(pos.x - c.x) <= this.landingPadHalf && Math.abs(pos.z - c.z) <= this.landingPadHalf;
  }

  isOverLaunchPad(pos) {
    const c = this.launchPad.position;
    return Math.abs(pos.x - c.x) <= this.launchPadHalf && Math.abs(pos.z - c.z) <= this.launchPadHalf;
  }

  landingPadTopY() {
    return this.landingPad.position.y + 0.5;
  }

  launchPadTopY() {
    return this.launchPad.position.y + 0.5;
  }

  landingPadAimPoint(target = new THREE.Vector3()) {
    return target.set(
      this.landingPad.position.x,
      this.landingPadTopY() + 0.25,
      this.landingPad.position.z
    );
  }

  update(dt, focus) {
    this._time += dt;

    if (focus) {
      this.skyDome.position.x = focus.x * 0.25;
      this.skyDome.position.z = focus.z * 0.25;
      this.skyDome.position.y = Math.max(18, focus.y * 0.3 + 12);
    }

    this.starField.rotation.y += dt * 0.012;
    this.starField.rotation.z = Math.sin(this._time * 0.09) * 0.06;

    this.horizonGlowA.material.opacity = 0.14 + Math.sin(this._time * 1.2) * 0.04;
    this.horizonGlowB.material.opacity = 0.08 + Math.sin(this._time * 0.85 + 1.3) * 0.03;

    this.launchGlow.intensity = 2.2 + Math.sin(this._time * 2.2) * 0.35;
    this.landingGlow.intensity = 1.9 + Math.sin(this._time * 1.7 + 0.9) * 0.3;

    if (this.canyonHaze) {
      const base = this._canyonHazeBaseOpacity ?? 0.08;
      this.canyonHaze.material.opacity = Math.max(0.02, base + Math.sin(this._time * 0.45) * 0.01);
      this.canyonHaze.rotation.z = Math.sin(this._time * 0.08) * 0.015;
    }
  }
}
