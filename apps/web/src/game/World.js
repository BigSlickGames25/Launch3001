import * as THREE from "three";

export class World {
  constructor() {
    this.group = new THREE.Group();
    this._time = 0;
    this._terrainProfile = null;
    this._craters = [];

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

    this.launchPad = this._createPad(0x00ffff);
    this.launchPad.position.set(-10, 0.5, 0);
    this.launchPad.castShadow = true;
    this.launchPad.receiveShadow = true;
    this.group.add(this.launchPad);

    this.landingPad = this._createPad(0x00ff88);
    this.landingPad.position.set(12, 0.5, 0);
    this.landingPad.castShadow = true;
    this.landingPad.receiveShadow = true;
    this.group.add(this.landingPad);

    this.launchGlow = new THREE.PointLight(0x00ffff, 2.3, 26, 2);
    this.launchGlow.position.set(this.launchPad.position.x, 2.8, this.launchPad.position.z);
    this.group.add(this.launchGlow);

    this.landingGlow = new THREE.PointLight(0x00ff88, 2.0, 24, 2);
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
      corridorHalfWidth: 6
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
    this.terrainGeom = new THREE.PlaneGeometry(80, 40, 120, 60);
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

  _createPad(color) {
    const g = new THREE.BoxGeometry(3, 1, 3);
    const m = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.5,
      roughness: 0.2
    });
    return new THREE.Mesh(g, m);
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
    for (let i = 0; i < profile.craterCount; i++) {
      const x = -34 + rand() * 68;
      const z = -16 + rand() * 32;
      const radius = profile.craterRadiusMin + rand() * (profile.craterRadiusMax - profile.craterRadiusMin);
      const depth = profile.craterDepth * (0.55 + rand() * 0.85);
      const rim = profile.craterRim * (0.7 + rand() * 0.8);
      this._craters.push({ x, z, radius, depth, rim });
    }
  }

  _terrainHeightRaw(x, z) {
    const p = this._terrainProfile;
    if (!p) return 0;
    if (p.terrainAmp <= 0 && p.craterCount <= 0) return 0;

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
        y *= t;
      }
    }

    return Math.max(-2.8, Math.min(4.8, y));
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
      corridorHalfWidth: level.corridorHalfWidth ?? 4.5
    };

    this._generateCraters(this._terrainProfile);

    const pos = this.terrainGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this._terrainHeightAt(x, z));
    }
    pos.needsUpdate = true;
    this.terrainGeom.computeVertexNormals();

    const amp = this._terrainProfile.terrainAmp;
    const moonShade = Math.max(0, Math.min(1, amp / 2.8));
    this.terrainBase.material.color.setRGB(
      0.28 + moonShade * 0.08,
      0.29 + moonShade * 0.08,
      0.31 + moonShade * 0.09
    );
    this.terrainWire.material.opacity = 0.06 + moonShade * 0.1;
  }

  applyLevel(level) {
    const launchSize = level.launchPadSize ?? level.padSize ?? 3.0;
    const landingSize = level.landingPadSize ?? level.padSize ?? 3.0;

    this.launchPad.scale.set(launchSize / 3, 1, launchSize / 3);
    this.landingPad.scale.set(landingSize / 3, 1, landingSize / 3);
    this.launchPadHalf = launchSize / 2;
    this.landingPadHalf = landingSize / 2;

    this.roof.visible = !!level.roof;
    this.roof.position.y = level.roofHeight ?? 7.0;
    this.roof.scale.set(level.roofScaleX ?? 1, 1, level.roofScaleZ ?? 1);

    this._applyTerrainProfile(level);
  }

  groundHeightAt(x, z) {
    return this._terrainHeightAt(x, z);
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
  }
}
