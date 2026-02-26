import * as THREE from "three";
import { clamp, lerp } from "./utils.js";

function smooth01(t) {
  const s = clamp(t, 0, 1);
  return s * s * (3 - 2 * s);
}

function bell01(t) {
  return Math.sin(smooth01(t) * Math.PI);
}

function fract(v) {
  return v - Math.floor(v);
}

function hash1(v) {
  return fract(Math.sin(v * 127.1 + 311.7) * 43758.5453123);
}

function hash2(x, y) {
  return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123);
}

export class World {
  constructor() {
    this.group = new THREE.Group();
    this._time = 0;
    this.level = null;

    this.routeStartX = -20;
    this.routeEndX = 20;
    this.visualStartX = -28;
    this.visualEndX = 28;
    this.finishApproachX = 12;

    this.launchPadHalf = 1.7;
    this.landingPadHalf = 3.0;
    this.spawn = new THREE.Vector3(-18, 1.6, 0);

    this._profileSamples = [];
    this._sampleCount = 260;
    this._obstacleColliders = [];
    this._obstacleMeshes = [];
    this._levelObjects = [];
    this._lightsPulse = [];
    this._rotatingWorkLights = [];
    this._teleportFX = [];
    this._slidingDoors = [];

    this._tmpV = new THREE.Vector3();
    this._tmpColor = new THREE.Color();

    this._setupSceneLighting();
    this._buildAtmosphere();
    this._buildStaticWorldScenery();
    this._buildDynamicContainers();
    this._buildPads();
  }

  _setupSceneLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xb8d8f4, 0x1a222b, 1.35);
    this.group.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xf8fbff, 1.95);
    this.sunLight.position.set(16, 20, 14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1536, 1536);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -44;
    this.sunLight.shadow.camera.right = 44;
    this.sunLight.shadow.camera.top = 34;
    this.sunLight.shadow.camera.bottom = -34;
    this.sunLight.shadow.bias = -0.00015;
    this.sunLight.shadow.normalBias = 0.02;
    this.group.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x8fe2ff, 0.95);
    this.fillLight.position.set(-10, 8, 18);
    this.group.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0x54dfff, 0.9, 110, 2);
    this.rimLight.position.set(0, 9, 16);
    this.group.add(this.rimLight);
  }

  _buildAtmosphere() {
    const skyTex = this._makeGradientTexture([
      [0.0, "#0b111a"],
      [0.42, "#142131"],
      [1.0, "#233247"]
    ], 32, 512);
    skyTex.colorSpace = THREE.SRGBColorSpace;

    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 18), skyMat);
    this.skyDome.position.set(0, 25, 0);
    this.group.add(this.skyDome);

    this.starField = this._createStars();
    this.group.add(this.starField);

    const hazeMat = new THREE.MeshBasicMaterial({
      color: 0x2d4762,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false
    });
    this.hazePlane = new THREE.Mesh(new THREE.PlaneGeometry(220, 40), hazeMat);
    this.hazePlane.position.set(0, 12, -50);
    this.group.add(this.hazePlane);
  }

  _buildStaticWorldScenery() {
    this.backdropGroup = new THREE.Group();
    this.group.add(this.backdropGroup);

    const farPlaneTex = this._makeGradientTexture([
      [0.0, "#162331"],
      [0.35, "#1f3145"],
      [1.0, "#0f1721"]
    ], 4, 256);
    farPlaneTex.colorSpace = THREE.SRGBColorSpace;

    this.farBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 160),
      new THREE.MeshBasicMaterial({ map: farPlaneTex, fog: false })
    );
    this.farBackdrop.position.set(0, 26, -70);
    this.backdropGroup.add(this.farBackdrop);

    this.ridgeNear = this._createRidgeLayer({ z: -36, yBase: 1.8, height: 5.4, color: 0x1d2b38, opacity: 0.95, seed: 17 });
    this.ridgeFar = this._createRidgeLayer({ z: -50, yBase: 3.0, height: 7.0, color: 0x1a2634, opacity: 0.86, seed: 33 });
    this.backdropGroup.add(this.ridgeFar);
    this.backdropGroup.add(this.ridgeNear);

    const groundBase = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 180),
      new THREE.MeshStandardMaterial({ color: 0x18212a, roughness: 0.98, metalness: 0.02 })
    );
    groundBase.rotation.x = -Math.PI / 2;
    groundBase.position.set(0, -0.2, -10);
    groundBase.receiveShadow = true;
    this.backdropGroup.add(groundBase);
  }

  _buildDynamicContainers() {
    this.corridorGroup = new THREE.Group();
    this.group.add(this.corridorGroup);

    this.obstacleGroup = new THREE.Group();
    this.group.add(this.obstacleGroup);

    this.fxGroup = new THREE.Group();
    this.group.add(this.fxGroup);
  }

  _buildPads() {
    this.launchPad = this._createLaunchPad();
    this.group.add(this.launchPad);

    this.landingPad = this._createLandingPad();
    this.group.add(this.landingPad);

    this.launchGlow = new THREE.PointLight(0x4ce7ff, 1.6, 18, 2);
    this.group.add(this.launchGlow);
    this.landingGlow = new THREE.PointLight(0xffbf58, 1.8, 20, 2);
    this.group.add(this.landingGlow);
  }

  _makeGradientTexture(stops, width = 32, height = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, height);
    for (const [pos, color] of stops) g.addColorStop(pos, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return new THREE.CanvasTexture(canvas);
  }

  _createStars() {
    const count = 700;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 120;
      pos[i * 3 + 0] = Math.cos(a) * r;
      pos[i * 3 + 1] = 12 + Math.random() * 75;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0x9dd9ff, size: 0.6, sizeAttenuation: true, depthWrite: false, transparent: true, opacity: 0.7, fog: false })
    );
  }

  _createRidgeLayer({ z, yBase, height, color, opacity, seed }) {
    const width = 420;
    const xSeg = 160;
    const geom = new THREE.PlaneGeometry(width, height, xSeg, 1);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const top = y > 0;
      if (!top) continue;
      const n = hash2(x * 0.07 + seed, seed * 0.13);
      const n2 = hash2(x * 0.11 - seed, seed * 0.31);
      const h = (Math.sin(x * 0.045 + seed) * 0.5 + 0.5) * 0.55 + n * 0.25 + n2 * 0.2;
      pos.setY(i, y * (0.55 + h));
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, yBase + height * 0.5, z);
    return mesh;
  }

  _createLaunchPad() {
    const group = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x171f28, metalness: 0.35, roughness: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x6df4ff, emissive: 0x0b3642, emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: 0.6, roughness: 0.55 });

    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.85, 1.0, 8), deckMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.05, 8, 48), trimMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.54;
    group.add(ring);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), darkMat);
      pylon.position.set(Math.cos(a) * 1.35, 0.15, Math.sin(a) * 1.35);
      pylon.castShadow = true;
      pylon.receiveShadow = true;
      group.add(pylon);

      const light = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), trimMat);
      light.position.copy(pylon.position).add(new THREE.Vector3(0, 0.32, 0));
      group.add(light);
    }

    group.userData.deckTop = 0.5;
    return group;
  }

  _createLandingPad() {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a2f35, metalness: 0.3, roughness: 0.75 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffd04f, emissive: 0x4f3002, emissiveIntensity: 0.3, metalness: 0.18, roughness: 0.45 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.45, roughness: 0.5 });

    const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), baseMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.08, 2.78), yellowMat);
    topPlate.position.y = 0.54;
    topPlate.receiveShadow = true;
    group.add(topPlate);

    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.12), i % 2 === 0 ? blackMat : yellowMat);
      stripe.position.set(-1.05 + i * 0.3, 0.58, 1.28);
      group.add(stripe);
      const stripeBack = stripe.clone();
      stripeBack.position.z = -1.28;
      group.add(stripeBack);
    }
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.36), i % 2 === 0 ? blackMat : yellowMat);
      stripe.position.set(1.28, 0.58, -1.05 + i * 0.3);
      group.add(stripe);
      const stripeLeft = stripe.clone();
      stripeLeft.position.x = -1.28;
      group.add(stripeLeft);
    }

    group.userData.deckTop = 0.5;
    return group;
  }

  _clearDynamic() {
    const groups = [this.corridorGroup, this.obstacleGroup, this.fxGroup];
    for (const group of groups) {
      while (group.children.length) {
        const child = group.children.pop();
        this._disposeObject(child);
      }
    }
    this._obstacleColliders = [];
    this._obstacleMeshes = [];
    this._levelObjects = [];
    this._lightsPulse = [];
    this._rotatingWorkLights = [];
    this._teleportFX = [];
    this._slidingDoors = [];
  }

  _disposeObject(obj) {
    obj.traverse?.((node) => {
      if (node.geometry) node.geometry.dispose?.();
      if (Array.isArray(node.material)) {
        for (const m of node.material) m?.dispose?.();
      } else {
        node.material?.dispose?.();
      }
    });
  }

  applyLevel(level) {
    this.level = level;
    this._time = 0;
    this._clearDynamic();

    this.routeStartX = level.spawn?.x ?? (-level.routeLength * 0.5);
    this.routeEndX = level.finishPad?.x ?? (level.routeLength * 0.5);
    this.visualStartX = this.routeStartX - 12;
    this.visualEndX = this.routeEndX + 12;

    this.launchPadHalf = Math.max(1.2, (level.launchPad?.size ?? 3.4) * 0.5);
    this.landingPadHalf = Math.max(1.4, (level.finishPad?.size ?? 6.0) * 0.5);

    this.launchPad.position.set(level.launchPad?.x ?? this.routeStartX, level.launchPad?.y ?? 0.5, level.launchPad?.z ?? 0);
    this.landingPad.position.set(level.finishPad?.x ?? this.routeEndX, level.finishPad?.y ?? 0.5, level.finishPad?.z ?? 0);

    this.launchPad.scale.set((level.launchPad?.size ?? 3.4) / 3.4, 1, (level.launchPad?.size ?? 3.4) / 3.4);
    this.landingPad.scale.set((level.finishPad?.size ?? 6.0) / 3.0, 1, (level.finishPad?.size ?? 6.0) / 3.0);

    this.launchGlow.position.set(this.launchPad.position.x, this.launchPadTopY() + 1.6, this.launchPad.position.z);
    this.landingGlow.position.set(this.landingPad.position.x, this.landingPadTopY() + 1.8, this.landingPad.position.z);
    this.launchGlow.intensity = 1.6;
    this.landingGlow.intensity = 1.8;
    this._lightsPulse.push({ light: this.launchGlow, base: 1.6, speed: 2.8, amp: 0.16 });
    this._lightsPulse.push({ light: this.landingGlow, base: 1.8, speed: 3.4, amp: 0.2 });

    this.spawn.set(this.launchPad.position.x, this.launchPadTopY() + 0.6, this.launchPad.position.z);

    const finishSeg = (level.segments || []).find((s) => s.type === "finishApproach");
    this.finishApproachX = finishSeg?.x0 ?? (this.routeEndX - Math.min(12, level.routeLength * 0.22));

    this._buildProfileSamples();
    this._buildCorridorGeometry();
    this._buildInteriorObstacles();
    this._buildLevelScenery();
    this._buildWarehouseSetPieces();

    const span = Math.max(60, level.routeLength + 36);
    this.farBackdrop.scale.x = span / 420;
    this.farBackdrop.position.x = (this.routeStartX + this.routeEndX) * 0.5;
    this.ridgeNear.position.x = this.farBackdrop.position.x;
    this.ridgeFar.position.x = this.farBackdrop.position.x;
  }

  _buildProfileSamples() {
    this._profileSamples = [];
    const count = this._sampleCount;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = lerp(this.visualStartX, this.visualEndX, t);
      this._profileSamples.push(this._profileAt(x));
    }
  }

  _profileAt(x) {
    const c = this.level?.corridor || { baseHalfHeight: 4.6, baseHalfWidth: 4.6 };
    let floorY = 0;
    let ceilingY = (c.baseHalfHeight || 4.6) * 2;
    let halfWidth = c.baseHalfWidth || 4.6;

    const segments = this.level?.segments || [];
    for (const seg of segments) {
      if (typeof seg.x0 !== "number" || typeof seg.x1 !== "number") continue;
      if (x < seg.x0 || x > seg.x1) continue;
      const len = Math.max(0.001, seg.x1 - seg.x0);
      const t = (x - seg.x0) / len;
      const s = smooth01(t);
      const b = bell01(t);

      switch (seg.type) {
        case "curve": {
          const from = Number(seg.from || 0);
          const to = Number(seg.to || 0);
          const off = lerp(from, to, s);
          floorY += off;
          ceilingY += off;
          break;
        }
        case "arch": {
          ceilingY -= Math.max(0, Number(seg.drop || 0)) * b;
          break;
        }
        case "dip": {
          floorY -= Math.max(0, Number(seg.depth || 0)) * b;
          break;
        }
        case "mound": {
          floorY += Math.max(0, Number(seg.height || 0)) * b;
          break;
        }
        case "walls": {
          const targetW = Math.max(1.7, Number(seg.halfWidth || halfWidth));
          halfWidth = Math.min(halfWidth, lerp(c.baseHalfWidth || halfWidth, targetW, b));
          break;
        }
        default:
          break;
      }
    }

    // Raise the roof significantly so the route reads like a larger hangar/cave tunnel volume.
    ceilingY += 1.65;

    // Smoothly flatten and widen around pads for reliable takeoff/landing.
    const flattenAroundPad = (padX, padHalf) => {
      const influence = padHalf + 2.2;
      const d = Math.abs(x - padX);
      if (d > influence) return;
      const t = 1 - d / influence;
      const s = smooth01(t);
      floorY = lerp(floorY, 0, s);
      halfWidth = Math.max(halfWidth, lerp(halfWidth, Math.max(padHalf + 1.2, c.baseHalfWidth || halfWidth), s));
      ceilingY = Math.max(ceilingY, floorY + Math.max(5.8, (c.baseHalfHeight || 4.6) * 2.05));
    };

    flattenAroundPad(this.launchPad.position.x, this.launchPadHalf);
    flattenAroundPad(this.landingPad.position.x, this.landingPadHalf);

    const minClear = 4.8;
    if (ceilingY < floorY + minClear) ceilingY = floorY + minClear;

    return { x, floorY, ceilingY, halfWidth };
  }

  _sampleProfile(x) {
    if (!this._profileSamples.length) return { x, floorY: 0, ceilingY: 8, halfWidth: 4.5 };

    if (x <= this._profileSamples[0].x) return this._profileSamples[0];
    const last = this._profileSamples[this._profileSamples.length - 1];
    if (x >= last.x) return last;

    const t = (x - this.visualStartX) / Math.max(0.001, this.visualEndX - this.visualStartX);
    const idxf = clamp(t, 0, 1) * (this._profileSamples.length - 1);
    const i0 = Math.floor(idxf);
    const i1 = Math.min(this._profileSamples.length - 1, i0 + 1);
    const f = idxf - i0;
    const a = this._profileSamples[i0];
    const b = this._profileSamples[i1];

    return {
      x,
      floorY: lerp(a.floorY, b.floorY, f),
      ceilingY: lerp(a.ceilingY, b.ceilingY, f),
      halfWidth: lerp(a.halfWidth, b.halfWidth, f)
    };
  }

  openSpaceFactorAt(x) {
    const p = this._sampleProfile(x);
    const h = p.ceilingY - p.floorY;
    const w = p.halfWidth * 2;
    return clamp(((h - 3.2) / 3.8) * 0.55 + ((w - 5.5) / 4.5) * 0.45, 0, 1);
  }

  _buildCorridorGeometry() {
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x303942, roughness: 0.88, metalness: 0.14, emissive: 0x0a1017, emissiveIntensity: 0.22 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x36414d, roughness: 0.84, metalness: 0.16, emissive: 0x0e141c, emissiveIntensity: 0.2 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x29333d, roughness: 0.86, metalness: 0.16, emissive: 0x0b1219, emissiveIntensity: 0.22 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x4a5663, roughness: 0.74, metalness: 0.22, emissive: 0x131d28, emissiveIntensity: 0.24 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x2e3842, roughness: 0.82, metalness: 0.14, emissive: 0x0b141d, emissiveIntensity: 0.22 });

    const xSeg = 240;
    const zSeg = 14;

    const floorMesh = this._makeSurfaceMesh(xSeg, zSeg, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const zBack = -p.halfWidth;
      const zFront = p.halfWidth * 0.72;
      const z = lerp(zBack, zFront, v);
      const vn = (z - zBack) / Math.max(0.001, zFront - zBack);
      const edgeLift = Math.pow(Math.abs(vn - 0.5) * 2, 1.25) * 0.12;
      const noise = (Math.sin(x * 0.12 + z * 0.7) + Math.sin(x * 0.05 - z * 1.05)) * 0.012;
      return [x, p.floorY + edgeLift + noise, z];
    }, floorMat);
    floorMesh.receiveShadow = true;
    this.corridorGroup.add(floorMesh);
    this._levelObjects.push(floorMesh);

    const roofMesh = this._makeSurfaceMesh(xSeg, 9, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const zBack = -p.halfWidth;
      const zFront = p.halfWidth * 0.24; // cutaway: leave camera-side opening but keep more roof mass
      const z = lerp(zBack, zFront, v);
      const vn = (z - zBack) / Math.max(0.001, zFront - zBack);
      const lipCurve = Math.pow(vn, 1.3) * 0.08;
      const noise = (Math.sin(x * 0.1 + z * 1.0) + Math.sin(x * 0.14)) * 0.01;
      return [x, p.ceilingY + lipCurve + noise, z];
    }, roofMat);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    this.corridorGroup.add(roofMesh);
    this._levelObjects.push(roofMesh);

    const backWall = this._makeSurfaceMesh(xSeg, 12, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const y = lerp(p.floorY - 0.12, p.ceilingY + 0.18, v);
      const z = -p.halfWidth - 0.16 + Math.sin(y * 0.45 + x * 0.035) * 0.015;
      return [x, y, z];
    }, wallMat);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.corridorGroup.add(backWall);
    this._levelObjects.push(backWall);

    // Top and bottom cutaway lips on the camera side, to make the cave opening read clearly.
    const topLip = this._makeSurfaceMesh(xSeg, 4, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const z0 = p.halfWidth * 0.20;
      const z1 = p.halfWidth * 0.72;
      const z = lerp(z0, z1, v);
      const t = (z - z0) / Math.max(0.001, z1 - z0);
      const y = p.ceilingY - 0.06 + t * 0.42 + Math.sin(x * 0.08 + z * 0.6) * 0.012;
      return [x, y, z];
    }, lipMat);
    topLip.castShadow = true;
    topLip.receiveShadow = true;
    this.corridorGroup.add(topLip);
    this._levelObjects.push(topLip);

    const bottomLip = this._makeSurfaceMesh(xSeg, 4, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const z0 = p.halfWidth * 0.24;
      const z1 = p.halfWidth * 0.78;
      const z = lerp(z0, z1, v);
      const t = (z - z0) / Math.max(0.001, z1 - z0);
      const y = p.floorY - 0.14 + (1 - t) * 0.28 + Math.sin(x * 0.08 + z * 0.9) * 0.01;
      return [x, y, z];
    }, lipMat);
    bottomLip.castShadow = true;
    bottomLip.receiveShadow = true;
    this.corridorGroup.add(bottomLip);
    this._levelObjects.push(bottomLip);

    // Build out the camera-side cave shell so the opening reads like a tunnel mouth, not a thin lane.
    const upperShell = this._makeSurfaceMesh(xSeg, 6, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const z0 = p.halfWidth * 0.62;
      const z1 = p.halfWidth * 1.16;
      const z = lerp(z0, z1, v);
      const t = (z - z0) / Math.max(0.001, z1 - z0);
      const y = p.ceilingY + 0.28 + t * 1.28 + Math.sin(x * 0.07 + z * 0.55) * 0.02;
      return [x, y, z];
    }, shellMat);
    upperShell.castShadow = true;
    upperShell.receiveShadow = true;
    this.corridorGroup.add(upperShell);
    this._levelObjects.push(upperShell);

    const lowerShell = this._makeSurfaceMesh(xSeg, 6, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const z0 = p.halfWidth * 0.66;
      const z1 = p.halfWidth * 1.2;
      const z = lerp(z0, z1, v);
      const t = (z - z0) / Math.max(0.001, z1 - z0);
      const y = p.floorY - 0.5 + (1 - t) * 0.95 + Math.sin(x * 0.07 + z * 0.7) * 0.018;
      return [x, y, z];
    }, shellMat);
    lowerShell.castShadow = true;
    lowerShell.receiveShadow = true;
    this.corridorGroup.add(lowerShell);
    this._levelObjects.push(lowerShell);

    const upperOuterFace = this._makeSurfaceMesh(xSeg, 6, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const y0 = p.ceilingY + 0.05;
      const y1 = p.ceilingY + 1.25;
      const y = lerp(y0, y1, v);
      const bulge = Math.pow(v, 1.2);
      const z = p.halfWidth * (0.94 + bulge * 0.24) + Math.sin(x * 0.06 + y * 0.35) * 0.014;
      return [x, y, z];
    }, shellMat);
    upperOuterFace.castShadow = true;
    upperOuterFace.receiveShadow = true;
    this.corridorGroup.add(upperOuterFace);
    this._levelObjects.push(upperOuterFace);

    const lowerOuterFace = this._makeSurfaceMesh(xSeg, 6, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const y0 = p.floorY - 0.55;
      const y1 = p.floorY + 0.25;
      const y = lerp(y0, y1, v);
      const bulge = 1 - Math.pow(1 - v, 1.25);
      const z = p.halfWidth * (0.97 + bulge * 0.22) + Math.sin(x * 0.07 + y * 0.4) * 0.014;
      return [x, y, z];
    }, shellMat);
    lowerOuterFace.castShadow = true;
    lowerOuterFace.receiveShadow = true;
    this.corridorGroup.add(lowerOuterFace);
    this._levelObjects.push(lowerOuterFace);
  }

  _makeSurfaceMesh(xSeg, ySeg, pointFn, material) {
    const verts = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= xSeg; i++) {
      const u = i / xSeg;
      for (let j = 0; j <= ySeg; j++) {
        const v = j / ySeg;
        const p = pointFn(u, v);
        verts.push(p[0], p[1], p[2]);
        uvs.push(u, v);
      }
    }

    const row = ySeg + 1;
    for (let i = 0; i < xSeg; i++) {
      for (let j = 0; j < ySeg; j++) {
        const a = i * row + j;
        const b = (i + 1) * row + j;
        const c = (i + 1) * row + (j + 1);
        const d = i * row + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, material);
    return mesh;
  }

  _buildInteriorObstacles() {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x303843,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x090d12,
      emissiveIntensity: 0.15
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x506879,
      roughness: 0.7,
      metalness: 0.25,
      emissive: 0x0b1824,
      emissiveIntensity: 0.15
    });

    const segments = this.level?.segments || [];
    for (const seg of segments) {
      if (seg.type !== "rocks" || !Array.isArray(seg.items)) continue;
      for (let i = 0; i < seg.items.length; i++) {
        const item = seg.items[i];
        const p = this._sampleProfile(item.x);
        const r = Math.max(0.35, Number(item.r || 0.8));
        const minY = p.floorY + r + 0.18;
        const maxY = p.ceilingY - r - 0.18;
        const maxNegZ = -0.45;
        const minZ = -p.halfWidth + r + 0.18;
        const maxZ = Math.min(maxNegZ, p.halfWidth * 0.18 - r);
        const y = clamp(Number(item.y ?? (minY + maxY) * 0.5), minY, Math.max(minY, maxY));
        const z = clamp(Number(item.z ?? -1), minZ, Math.max(minZ, maxZ));

        const mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(r, 1),
          i % 2 === 0 ? rockMat : accentMat
        );
        mesh.position.set(item.x, y, z);
        mesh.scale.set(item.sx || 1, item.sy || 1, item.sz || 1);
        mesh.rotation.set(hash1(item.x + i) * Math.PI, hash1(item.x + i + 2) * Math.PI, hash1(item.x + i + 4) * Math.PI);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.obstacleGroup.add(mesh);
        this._obstacleMeshes.push(mesh);

        const maxScale = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);
        this._obstacleColliders.push({
          center: mesh.position.clone(),
          radius: r * maxScale * 0.92
        });
      }
    }

    this._buildWarehouseGrateObstacles();
  }

  _buildWarehouseGrateObstacles() {
    const routeLen = Math.max(24, this.routeEndX - this.routeStartX);
    const count = Math.max(2, Math.min(6, Math.round(routeLen / 26)));
    if (count <= 0) return;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x303a45,
      roughness: 0.72,
      metalness: 0.48,
      emissive: 0x0a1018,
      emissiveIntensity: 0.16
    });
    const grateMat = new THREE.MeshStandardMaterial({
      color: 0x5f6f7f,
      roughness: 0.55,
      metalness: 0.62,
      emissive: 0x0b1722,
      emissiveIntensity: 0.12
    });
    const warningMat = new THREE.MeshStandardMaterial({
      color: 0xffa93f,
      roughness: 0.42,
      metalness: 0.34,
      emissive: 0x572a04,
      emissiveIntensity: 0.4
    });

    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      let x = lerp(this.routeStartX + 8, this.routeEndX - 10, t);
      x += (hash1(i * 9.3 + routeLen * 0.07) - 0.5) * 3.8;
      if (x < this.routeStartX + 7) x = this.routeStartX + 7;
      if (x > this.routeEndX - 7) x = this.routeEndX - 7;

      const p = this._sampleProfile(x);
      const fromCeiling = (i % 2) === 0;
      const zCenter = clamp((hash1(x * 0.11 + i) - 0.5) * 0.45, -0.28, 0.28);
      const zHalf = Math.min(1.15, Math.max(0.7, p.halfWidth * 0.26));
      const xThickness = 0.16;

      const floorY = p.floorY;
      const ceilY = p.ceilingY;
      const safeGap = clamp(2.2 + hash1(x * 0.21 + 3.1) * 0.6, 2.2, 2.8);
      const edgeMargin = 0.8;

      let y0;
      let y1;
      if (fromCeiling) {
        y1 = ceilY - 0.22;
        y0 = Math.min(y1 - 0.7, floorY + safeGap + hash1(x * 0.41 + 1.7) * 0.55);
        y0 = clamp(y0, floorY + 1.65, ceilY - 1.15);
      } else {
        y0 = floorY + 0.2;
        y1 = Math.max(y0 + 0.7, ceilY - (safeGap + hash1(x * 0.37 + 5.2) * 0.55));
        y1 = clamp(y1, floorY + 1.2, ceilY - edgeMargin);
      }

      const barSpan = Math.max(0.7, y1 - y0);
      const group = new THREE.Group();
      group.position.set(x, 0, zCenter);

      // Frame rails
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(xThickness, 0.09, zHalf * 2 + 0.18), frameMat);
      topRail.position.set(0, y1, 0);
      topRail.castShadow = true;
      topRail.receiveShadow = true;
      group.add(topRail);

      const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(xThickness, 0.09, zHalf * 2 + 0.18), frameMat);
      bottomRail.position.set(0, y0, 0);
      bottomRail.castShadow = true;
      bottomRail.receiveShadow = true;
      group.add(bottomRail);

      const sidePostGeom = new THREE.BoxGeometry(xThickness, barSpan + 0.16, 0.08);
      for (const zSide of [-zHalf, zHalf]) {
        const post = new THREE.Mesh(sidePostGeom, frameMat);
        post.position.set(0, (y0 + y1) * 0.5, zSide);
        post.castShadow = true;
        post.receiveShadow = true;
        group.add(post);

        const warn = new THREE.Mesh(new THREE.BoxGeometry(xThickness + 0.01, 0.03, 0.1), warningMat);
        warn.position.set(0, y1 - 0.08, zSide);
        warn.castShadow = false;
        group.add(warn);
      }

      // Grate bars across the opening.
      const bars = 6;
      for (let b = 0; b < bars; b++) {
        const f = b / (bars - 1);
        const z = lerp(-zHalf * 0.92, zHalf * 0.92, f);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.055, barSpan, 0.03), grateMat);
        bar.position.set(0, (y0 + y1) * 0.5, z);
        bar.castShadow = true;
        bar.receiveShadow = true;
        group.add(bar);

        // Collision samples along each bar.
        const samples = 4;
        for (let s = 0; s < samples; s++) {
          const yf = (s + 0.5) / samples;
          this._obstacleColliders.push({
            center: new THREE.Vector3(x, lerp(y0, y1, yf), zCenter + z),
            radius: 0.15
          });
        }
      }

      // Horizontal slats to make it read like a grate/gate.
      const slats = 3;
      for (let s = 0; s < slats; s++) {
        const yf = (s + 1) / (slats + 1);
        const y = lerp(y0, y1, yf);
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, zHalf * 2 - 0.12), grateMat);
        slat.position.set(0, y, 0);
        slat.castShadow = true;
        slat.receiveShadow = true;
        group.add(slat);
      }

      this.obstacleGroup.add(group);
      this._obstacleMeshes.push(group);
    }
  }

  _buildLevelScenery() {
    const routeLen = Math.max(24, this.routeEndX - this.routeStartX);
    // Intentionally no rim "block" scenery here; cave shell geometry provides the tunnel silhouette.

    // Subtle sci-fi guide lights along the back wall.
    const guideMat = new THREE.MeshBasicMaterial({ color: 0x2bd7ff, transparent: true, opacity: 0.18 });
    const guideGeom = new THREE.BoxGeometry(0.4, 0.05, 0.05);
    for (let i = 0; i < Math.floor(routeLen / 4); i++) {
      const x = this.routeStartX + 2 + i * 4;
      if (x >= this.routeEndX - 4) break;
      const p = this._sampleProfile(x);
      const y = p.floorY + 0.55 + (i % 2) * 0.15;
      const z = -p.halfWidth - 0.08;
      const strip = new THREE.Mesh(guideGeom, guideMat);
      strip.position.set(x, y, z);
      this.fxGroup.add(strip);
    }
  }

  _buildWarehouseSetPieces() {
    // Hide the exterior mountain/star look and replace it with an indoor warehouse vibe.
    if (this.starField) this.starField.visible = false;
    if (this.ridgeNear) this.ridgeNear.visible = false;
    if (this.ridgeFar) this.ridgeFar.visible = false;
    if (this.hazePlane?.material) this.hazePlane.material.opacity = 0.08;

    const routeLen = Math.max(24, this.routeEndX - this.routeStartX);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x36414d,
      roughness: 0.68,
      metalness: 0.46,
      emissive: 0x0f141b,
      emissiveIntensity: 0.18
    });
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x4d5966,
      roughness: 0.62,
      metalness: 0.5,
      emissive: 0x141a22,
      emissiveIntensity: 0.16
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x222a33,
      roughness: 0.76,
      metalness: 0.28,
      emissive: 0x0b1017,
      emissiveIntensity: 0.14
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xffa531,
      roughness: 0.42,
      metalness: 0.34,
      emissive: 0x612f07,
      emissiveIntensity: 0.42
    });
    const teleMat = new THREE.MeshStandardMaterial({
      color: 0x6deaff,
      roughness: 0.16,
      metalness: 0.25,
      emissive: 0x1aa8d7,
      emissiveIntensity: 1.0
    });

    // Warehouse wall panels behind the route to sell the indoor hangar.
    const wallSpan = routeLen + 18;
    const wallCenterX = (this.routeStartX + this.routeEndX) * 0.5;
    const wallHeight = 24;
    const wallZ = -10.5;
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(wallSpan, wallHeight, Math.max(6, Math.round(routeLen / 8)), 3),
      panelMat
    );
    backWall.position.set(wallCenterX, wallHeight * 0.5 - 1.2, wallZ);
    backWall.receiveShadow = true;
    this.fxGroup.add(backWall);

    // Structural ribs / trusses along the route.
    const ribStep = 7.5;
    for (let x = this.routeStartX + 2; x <= this.routeEndX - 1; x += ribStep) {
      const p = this._sampleProfile(x);
      const yTop = p.ceilingY + 0.2;
      const yBottom = p.floorY - 0.35;
      const zBack = -p.halfWidth - 0.25;
      const zFront = p.halfWidth * 0.95;
      const zSpan = Math.max(1.2, zFront - zBack);

      const rib = new THREE.Group();
      rib.position.set(x, 0, 0);

      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, zSpan + 0.4), beamMat);
      topBeam.position.set(0, yTop, (zBack + zFront) * 0.5);
      topBeam.castShadow = true;
      topBeam.receiveShadow = true;
      rib.add(topBeam);

      const backPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, yTop - yBottom + 0.24, 0.16), ribMat);
      backPost.position.set(0, (yTop + yBottom) * 0.5, zBack);
      backPost.castShadow = true;
      backPost.receiveShadow = true;
      rib.add(backPost);

      const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, Math.max(1.1, (yTop - yBottom) * 0.58), 0.14), ribMat);
      frontPost.position.set(0, yBottom + (yTop - yBottom) * 0.29, zFront);
      frontPost.castShadow = true;
      frontPost.receiveShadow = true;
      rib.add(frontPost);

      const floorRail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, zSpan * 0.82), beamMat);
      floorRail.position.set(0, yBottom + 0.18, lerp(zBack, zFront, 0.45));
      floorRail.castShadow = true;
      floorRail.receiveShadow = true;
      rib.add(floorRail);

      // Ceiling lamps on alternating ribs.
      if (Math.round((x - this.routeStartX) / ribStep) % 2 === 0) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.7), teleMat);
        lamp.position.set(0, yTop - 0.18, lerp(zBack, zFront, 0.42));
        lamp.castShadow = false;
        rib.add(lamp);
      }

      this.fxGroup.add(rib);
    }

    // Rotating orange work lights.
    const workLightCount = Math.max(3, Math.min(7, Math.round(routeLen / 20)));
    for (let i = 0; i < workLightCount; i++) {
      const t = (i + 0.5) / workLightCount;
      const x = lerp(this.routeStartX + 4, this.routeEndX - 6, t);
      const p = this._sampleProfile(x);
      const rig = new THREE.Group();
      rig.position.set(x, p.ceilingY - 0.35, p.halfWidth * 0.78);

      const pivot = new THREE.Group();
      rig.add(pivot);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), ribMat);
      arm.position.set(0, 0, 0.34);
      arm.castShadow = true;
      arm.receiveShadow = true;
      rig.add(arm);

      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 12), beamMat);
      head.rotation.z = Math.PI / 2;
      head.position.set(0.22, 0, 0);
      head.castShadow = true;
      head.receiveShadow = true;
      pivot.add(head);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), hazardMat);
      lens.rotation.y = -Math.PI / 2;
      lens.position.set(0.35, 0, 0);
      lens.castShadow = false;
      pivot.add(lens);

      const beamCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 2.6, 18, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffa23c,
          transparent: true,
          opacity: 0.11,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        })
      );
      beamCone.rotation.z = -Math.PI / 2;
      beamCone.position.set(1.55, 0, 0);
      pivot.add(beamCone);

      const target = new THREE.Object3D();
      target.position.set(6, -2.4, -1.8);
      pivot.add(target);

      const spot = new THREE.SpotLight(0xff9b31, 2.8, 26, Math.PI / 7, 0.5, 1.1);
      spot.position.set(0.35, 0, 0);
      spot.castShadow = false;
      spot.target = target;
      pivot.add(spot);
      pivot.add(spot.target);

      this.fxGroup.add(rig);
      this._rotatingWorkLights.push({
        rig,
        pivot,
        beamCone,
        spot,
        phase: hash1(i * 2.13 + routeLen * 0.1) * Math.PI * 2,
        yawBase: -1.7 + hash1(i * 4.1) * 0.35,
        sweep: 0.55 + hash1(i * 5.7) * 0.3,
        speed: 0.85 + hash1(i * 8.1) * 0.65
      });
    }

    // Teleport pads at start and finish.
    const makeTeleport = (x, y, z, hue = "cyan") => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const colorMain = hue === "orange" ? 0xffa53d : 0x72f0ff;
      const colorAccent = hue === "orange" ? 0xffd06a : 0x90a7ff;

      const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.05, 12, 42),
        new THREE.MeshStandardMaterial({
          color: colorMain,
          emissive: colorMain,
          emissiveIntensity: 0.5,
          roughness: 0.25,
          metalness: 0.35
        })
      );
      baseRing.rotation.x = Math.PI / 2;
      group.add(baseRing);

      const spinRingA = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.028, 10, 36),
        new THREE.MeshBasicMaterial({ color: colorAccent, transparent: true, opacity: 0.55 })
      );
      spinRingA.rotation.set(Math.PI / 2, 0, 0);
      group.add(spinRingA);

      const spinRingB = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.02, 10, 36),
        new THREE.MeshBasicMaterial({ color: colorMain, transparent: true, opacity: 0.36 })
      );
      spinRingB.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      group.add(spinRingB);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.4, 2.8, 18, 1, true),
        new THREE.MeshBasicMaterial({
          color: colorMain,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      beam.position.y = 1.4;
      group.add(beam);

      const glow = new THREE.PointLight(colorMain, 1.3, 12, 2);
      glow.position.y = 0.6;
      group.add(glow);

      this.fxGroup.add(group);
      this._teleportFX.push({
        group,
        spinRingA,
        spinRingB,
        beam,
        glow,
        phase: hash1(x * 0.17 + z * 0.21) * Math.PI * 2
      });
    };

    makeTeleport(this.launchPad.position.x - 1.25, this.launchPadTopY() + 0.04, this.launchPad.position.z + 1.45, "cyan");
    makeTeleport(this.landingPad.position.x + 1.45, this.landingPadTopY() + 0.04, this.landingPad.position.z + 1.65, "orange");

    // Animated sliding hangar door near the landing chamber (decorative but highly visible).
    {
      const doorX = this.routeEndX - Math.min(5.4, routeLen * 0.1);
      const p = this._sampleProfile(doorX);
      const zBack = -p.halfWidth - 0.2;
      const yBottom = p.floorY + 0.15;
      const yTop = p.ceilingY - 0.35;
      const height = Math.max(3.8, yTop - yBottom);
      const width = Math.max(5.8, Math.min(8.5, routeLen * 0.12));
      const frameDepth = 0.18;

      const frame = new THREE.Group();
      frame.position.set(doorX, 0, zBack);

      const jambMat = beamMat;
      const doorPanelMat = new THREE.MeshStandardMaterial({
        color: 0x3c4652,
        roughness: 0.58,
        metalness: 0.52,
        emissive: 0x121923,
        emissiveIntensity: 0.16
      });

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.2, frameDepth), jambMat);
      lintel.position.set(0, yBottom + height + 0.1, 0);
      lintel.castShadow = true;
      lintel.receiveShadow = true;
      frame.add(lintel);

      for (const sx of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.22, height + 0.2, frameDepth), jambMat);
        jamb.position.set(sx * (width * 0.5 + 0.05), yBottom + height * 0.5, 0);
        jamb.castShadow = true;
        jamb.receiveShadow = true;
        frame.add(jamb);
      }

      const backPlate = new THREE.Mesh(new THREE.PlaneGeometry(width, height), panelMat);
      backPlate.position.set(0, yBottom + height * 0.5, -0.03);
      frame.add(backPlate);

      const panelW = width * 0.5 - 0.08;
      const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, height - 0.08, 0.12), doorPanelMat);
      const rightPanel = leftPanel.clone();
      leftPanel.position.set(-panelW * 0.5, yBottom + height * 0.5, 0.01);
      rightPanel.position.set(panelW * 0.5, yBottom + height * 0.5, 0.01);
      leftPanel.castShadow = true;
      leftPanel.receiveShadow = true;
      rightPanel.castShadow = true;
      rightPanel.receiveShadow = true;
      frame.add(leftPanel);
      frame.add(rightPanel);

      const stripGeom = new THREE.BoxGeometry(panelW * 0.82, 0.035, 0.03);
      for (const panel of [leftPanel, rightPanel]) {
        for (let s = 0; s < 4; s++) {
          const strip = new THREE.Mesh(stripGeom, hazardMat);
          strip.position.set(0, -height * 0.28 + s * (height * 0.18), 0.08);
          panel.add(strip);
        }
      }

      this.fxGroup.add(frame);
      this._slidingDoors.push({
        x: doorX,
        leftPanel,
        rightPanel,
        leftClosedX: leftPanel.position.x,
        rightClosedX: rightPanel.position.x,
        travel: width * 0.28,
        phase: hash1(routeLen * 0.5) * Math.PI * 2
      });
    }
  }

  groundHeightAt(x, z) {
    void z;
    return this._sampleProfile(x).floorY;
  }

  checkTunnelCollision(pos, radius = 0.38) {
    const xMin = this.routeStartX - 0.6;
    const xMax = this.routeEndX + 0.6;
    if (pos.x < xMin || pos.x > xMax) return false;

    const p = this._sampleProfile(pos.x);
    const floor = p.floorY;
    const ceil = p.ceilingY;
    const backWall = -p.halfWidth;

    if (pos.y + radius > ceil) return true;
    if (pos.z - radius < backWall) return true;

    // No collision on the camera-side cutaway wall; rely on recentering and obstacle/floor/ceiling constraints.
    for (const c of this._obstacleColliders) {
      const dx = pos.x - c.center.x;
      const dy = pos.y - c.center.y;
      const dz = pos.z - c.center.z;
      const rr = radius + c.radius;
      if (dx * dx + dy * dy + dz * dz <= rr * rr) return true;
    }

    // Leave floor collision to Game terrain/pad logic for consistent landing handling.
    return false;
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
    return this.landingPad.position.y + (this.landingPad.userData.deckTop ?? 0.5);
  }

  launchPadTopY() {
    return this.launchPad.position.y + (this.launchPad.userData.deckTop ?? 0.5);
  }

  landingPadAimPoint(target = new THREE.Vector3()) {
    return target.set(this.landingPad.position.x, this.landingPadTopY() + 0.35, this.landingPad.position.z);
  }

  update(dt, focus) {
    this._time += dt;

    if (focus) {
      const centerX = focus.x * 0.06;
      this.backdropGroup.position.x = centerX;
      this.skyDome.position.x = focus.x * 0.02;
      this.hazePlane.position.x = focus.x * 0.05;
    }

    this.starField.rotation.y += dt * 0.01;
    const hazeBase = this.starField.visible ? 0.16 : 0.08;
    this.hazePlane.material.opacity = hazeBase + Math.sin(this._time * 0.32) * (this.starField.visible ? 0.02 : 0.01);

    for (const p of this._lightsPulse) {
      p.light.intensity = p.base + Math.sin(this._time * p.speed) * p.amp;
    }

    for (const fx of this._teleportFX) {
      const pulse = 0.65 + 0.35 * Math.sin(this._time * 2.6 + fx.phase);
      fx.group.rotation.y += dt * 0.4;
      fx.spinRingA.rotation.z += dt * (1.8 + pulse * 0.8);
      fx.spinRingB.rotation.z -= dt * (1.1 + pulse * 0.5);
      fx.beam.scale.y = 0.9 + pulse * 0.25;
      fx.beam.position.y = 1.25 + pulse * 0.2;
      fx.beam.material.opacity = 0.1 + pulse * 0.16;
      fx.glow.intensity = 0.9 + pulse * 0.9;
    }

    for (const rig of this._rotatingWorkLights) {
      const sweep = Math.sin(this._time * rig.speed + rig.phase);
      rig.pivot.rotation.y = rig.yawBase + sweep * rig.sweep;
      rig.pivot.rotation.z = -0.04 + Math.sin(this._time * rig.speed * 0.8 + rig.phase * 0.7) * 0.07;
      rig.spot.intensity = 2.1 + (0.5 + 0.5 * Math.sin(this._time * 2.8 + rig.phase)) * 1.1;
      rig.beamCone.material.opacity = 0.07 + (0.5 + 0.5 * Math.sin(this._time * 3.2 + rig.phase)) * 0.08;
    }

    for (const door of this._slidingDoors) {
      const near = focus ? clamp(1 - Math.abs(focus.x - door.x) / 10, 0, 1) : 0;
      const idlePulse = 0.08 + (0.5 + 0.5 * Math.sin(this._time * 0.55 + door.phase)) * 0.06;
      const openAmt = clamp(Math.max(idlePulse, near), 0, 1);
      door.leftPanel.position.x = door.leftClosedX - openAmt * door.travel;
      door.rightPanel.position.x = door.rightClosedX + openAmt * door.travel;
    }
  }
}
