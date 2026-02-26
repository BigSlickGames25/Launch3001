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

    this._tmpV = new THREE.Vector3();
    this._tmpColor = new THREE.Color();

    this._setupSceneLighting();
    this._buildAtmosphere();
    this._buildStaticWorldScenery();
    this._buildDynamicContainers();
    this._buildPads();
  }

  _setupSceneLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xa8c9ee, 0x131920, 1.15);
    this.group.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xf2f7ff, 1.65);
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

    this.fillLight = new THREE.DirectionalLight(0x7fd9ff, 0.7);
    this.fillLight.position.set(-10, 8, 18);
    this.group.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0x54dfff, 0.5, 90, 2);
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

    // Lift the ceiling to make the cave feel taller and less like a slot.
    ceilingY += 0.85;

    // Smoothly flatten and widen around pads for reliable takeoff/landing.
    const flattenAroundPad = (padX, padHalf) => {
      const influence = padHalf + 2.2;
      const d = Math.abs(x - padX);
      if (d > influence) return;
      const t = 1 - d / influence;
      const s = smooth01(t);
      floorY = lerp(floorY, 0, s);
      halfWidth = Math.max(halfWidth, lerp(halfWidth, Math.max(padHalf + 1.2, c.baseHalfWidth || halfWidth), s));
      ceilingY = Math.max(ceilingY, floorY + Math.max(5.0, (c.baseHalfHeight || 4.6) * 1.9));
    };

    flattenAroundPad(this.launchPad.position.x, this.launchPadHalf);
    flattenAroundPad(this.landingPad.position.x, this.landingPadHalf);

    const minClear = 3.9;
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
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x242e38, roughness: 0.96, metalness: 0.05, emissive: 0x05090d, emissiveIntensity: 0.2 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e2730, roughness: 0.97, metalness: 0.04, emissive: 0x04070b, emissiveIntensity: 0.16 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f2b35, roughness: 0.94, metalness: 0.08, emissive: 0x061019, emissiveIntensity: 0.2 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x2d3b48, roughness: 0.88, metalness: 0.15, emissive: 0x0f1f2d, emissiveIntensity: 0.22 });
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x202b36, roughness: 0.93, metalness: 0.08, emissive: 0x08121a, emissiveIntensity: 0.2 });

    const xSeg = 240;
    const zSeg = 14;

    const floorMesh = this._makeSurfaceMesh(xSeg, zSeg, (u, v) => {
      const x = lerp(this.visualStartX, this.visualEndX, u);
      const p = this._sampleProfile(x);
      const zBack = -p.halfWidth;
      const zFront = p.halfWidth * 0.72;
      const z = lerp(zBack, zFront, v);
      const vn = (z - zBack) / Math.max(0.001, zFront - zBack);
      const edgeLift = Math.pow(Math.abs(vn - 0.5) * 2, 1.35) * 0.24;
      const noise = (Math.sin(x * 0.16 + z * 0.9) + Math.sin(x * 0.07 - z * 1.3)) * 0.035;
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
      const lipCurve = Math.pow(vn, 1.4) * 0.18;
      const noise = (Math.sin(x * 0.12 + z * 1.6) + Math.sin(x * 0.21)) * 0.028;
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
      const z = -p.halfWidth - 0.16 + Math.sin(y * 0.7 + x * 0.05) * 0.05;
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
      const y = p.ceilingY - 0.08 + t * 0.62 + Math.sin(x * 0.12 + z) * 0.03;
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
      const y = p.floorY - 0.18 + (1 - t) * 0.4 + Math.sin(x * 0.09 + z * 1.2) * 0.02;
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
      const y = p.ceilingY + 0.18 + t * 1.1 + Math.sin(x * 0.1 + z * 0.9) * 0.05;
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
      const y = p.floorY - 0.45 + (1 - t) * 0.9 + Math.sin(x * 0.08 + z * 1.1) * 0.04;
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
      const z = p.halfWidth * (0.94 + bulge * 0.26) + Math.sin(x * 0.09 + y * 0.5) * 0.03;
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
      const z = p.halfWidth * (0.96 + bulge * 0.24) + Math.sin(x * 0.1 + y * 0.7) * 0.03;
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
  }

  _buildLevelScenery() {
    const routeLen = Math.max(24, this.routeEndX - this.routeStartX);
    const xMin = this.visualStartX;
    const xMax = this.visualEndX;
    const count = Math.max(16, Math.round(routeLen / 5));

    const sideMatFar = new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.96, metalness: 0.04, emissive: 0x05070a, emissiveIntensity: 0.06 });

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const x = lerp(xMin, xMax, t);
      const p = this._sampleProfile(x);
      const h = 3.2 + hash1(x * 0.13) * 5.0;
      const w = 1.8 + hash1(x * 0.09 + 5) * 2.8;

      const leftRim = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.0 + hash1(x * 0.17) * 3.5), sideMatFar);
      leftRim.position.set(x, p.floorY + h * 0.5, -p.halfWidth - 3.8 - hash1(x) * 2.8);
      leftRim.castShadow = true;
      leftRim.receiveShadow = true;
      this.fxGroup.add(leftRim);

      // Keep the camera-side view clear; tunnel shell geometry handles foreground shape now.
    }

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
    this.hazePlane.material.opacity = 0.16 + Math.sin(this._time * 0.32) * 0.02;

    for (const p of this._lightsPulse) {
      p.light.intensity = p.base + Math.sin(this._time * p.speed) * p.amp;
    }
  }
}
