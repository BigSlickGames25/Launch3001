import * as THREE from "three";

export class World {
  constructor() {
    this.group = new THREE.Group();
    this._time = 0;

    const hemi = new THREE.HemisphereLight(0x88ffff, 0x110022, 0.9);
    this.group.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 16, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 60;
    dir.shadow.camera.left = -24;
    dir.shadow.camera.right = 24;
    dir.shadow.camera.top = 24;
    dir.shadow.camera.bottom = -24;
    dir.shadow.bias = -0.00025;
    this.group.add(dir);

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

    this.spawn = new THREE.Vector3(-10, this.launchPadTopY() + 0.6, 0);
    this.padHalf = 1.5;
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
    const geom = new THREE.PlaneGeometry(80, 40, 80, 40);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.18) * 0.5 + Math.cos(z * 0.22) * 0.35;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();

    const base = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({
        color: 0x05070c,
        emissive: 0x00080f,
        emissiveIntensity: 0.35,
        metalness: 0.1,
        roughness: 0.95
      })
    );
    base.receiveShadow = true;
    base.position.y = -0.01;

    const wire = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({
        color: 0x0d1530,
        emissive: 0x08243a,
        emissiveIntensity: 0.55,
        metalness: 0.2,
        roughness: 0.8,
        wireframe: true,
        transparent: true,
        opacity: 0.95
      })
    );
    wire.receiveShadow = false;

    const terrainGroup = new THREE.Group();
    terrainGroup.add(base);
    terrainGroup.add(wire);
    return terrainGroup;
  }

  _createPad(color) {
    const g = new THREE.BoxGeometry(3, 1, 3);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.2 });
    return new THREE.Mesh(g, m);
  }

  _createRoof() {
    const g = new THREE.BoxGeometry(20, 1, 18);
    const m = new THREE.MeshStandardMaterial({ color: 0x9900ff, emissive: 0x220022, emissiveIntensity: 0.2, transparent: true, opacity: 0.35 });
    const roof = new THREE.Mesh(g, m);
    roof.position.set(2, 7.0, 0);
    return roof;
  }

  applyLevel(level) {
    const size = level.padSize ?? 3.0;
    this.launchPad.scale.set(size / 3, 1, size / 3);
    this.landingPad.scale.set(size / 3, 1, size / 3);
    this.padHalf = (size / 2);
    this.roof.visible = !!level.roof;
  }

  groundHeightAt(x, z) {
    return Math.sin(x * 0.18) * 0.5 + Math.cos(z * 0.22) * 0.35;
  }

  checkRoofCollision(pos) {
    if (!this.roof.visible) return false;
    const half = { x: 10, y: 0.5, z: 9 };
    const c = this.roof.position;
    return (
      Math.abs(pos.x - c.x) < half.x &&
      Math.abs(pos.y - c.y) < half.y &&
      Math.abs(pos.z - c.z) < half.z
    );
  }

  isOverLandingPad(pos) {
    const c = this.landingPad.position;
    return Math.abs(pos.x - c.x) <= this.padHalf && Math.abs(pos.z - c.z) <= this.padHalf;
  }

  isOverLaunchPad(pos) {
    const c = this.launchPad.position;
    return Math.abs(pos.x - c.x) <= this.padHalf && Math.abs(pos.z - c.z) <= this.padHalf;
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
