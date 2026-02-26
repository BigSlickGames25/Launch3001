import * as THREE from "three";
import { clamp, deg, smooth } from "./utils.js";

export class Rocket {
  constructor() {
    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);

    this._time = 0;
    this._thrustVisual = 0;
    this.visualTilt = { x: 0, z: 0 };
    this.navBeacons = [];

    this._buildRocket();
    this._buildFlames();
    this._buildGroundReference();

    this.pos = new THREE.Vector3(0, 2.0, 0);
    this.vel = new THREE.Vector3(0, 0, 0);

    this.thrustPower = 18.5;
    this.steerAccel = 10.0;

    this.fuel = 9999;
    this.fuelBurn = 0;
  }

  _matStandard(params) {
    return new THREE.MeshStandardMaterial(params);
  }

  _addMesh(parent, geometry, material, position = null, rotation = null, scale = null) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.copy(position);
    if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    if (scale) mesh.scale.copy(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }

  _buildRocket() {
    this.navBeacons.length = 0;

    const hullMat = this._matStandard({
      color: 0xeef6ff,
      emissive: 0x071521,
      emissiveIntensity: 0.22,
      metalness: 0.68,
      roughness: 0.18
    });
    const panelMat = this._matStandard({
      color: 0xc7d6e6,
      emissive: 0x091520,
      emissiveIntensity: 0.12,
      metalness: 0.55,
      roughness: 0.28
    });
    const carbonMat = this._matStandard({
      color: 0x121821,
      emissive: 0x05080c,
      emissiveIntensity: 0.08,
      metalness: 0.72,
      roughness: 0.42
    });
    const glowMat = this._matStandard({
      color: 0x6be9ff,
      emissive: 0x1aa3d4,
      emissiveIntensity: 0.95,
      metalness: 0.2,
      roughness: 0.18
    });
    const accentMat = this._matStandard({
      color: 0x8cb7ff,
      emissive: 0x173777,
      emissiveIntensity: 0.5,
      metalness: 0.28,
      roughness: 0.24
    });
    const glass = this._matStandard({
      color: 0xaef6ff,
      emissive: 0x0f5a78,
      emissiveIntensity: 0.75,
      metalness: 0.08,
      roughness: 0.06,
      transparent: true,
      opacity: 0.92
    });
    const warmMetal = this._matStandard({
      color: 0xffc46c,
      emissive: 0x5e3307,
      emissiveIntensity: 0.35,
      metalness: 0.24,
      roughness: 0.36
    });
    const beaconWarm = new THREE.MeshBasicMaterial({ color: 0xff9440, transparent: true, opacity: 0.42 });
    const beaconCool = new THREE.MeshBasicMaterial({ color: 0x76f2ff, transparent: true, opacity: 0.38 });

    // Main fuselage
    this._addMesh(this.visual, new THREE.CylinderGeometry(0.32, 0.36, 1.12, 30), hullMat, new THREE.Vector3(0, 0.52, 0));
    this._addMesh(this.visual, new THREE.CylinderGeometry(0.26, 0.31, 0.88, 30), panelMat, new THREE.Vector3(0, 1.42, 0));
    this._addMesh(this.visual, new THREE.ConeGeometry(0.23, 0.68, 30), hullMat, new THREE.Vector3(0, 2.22, 0));
    this._addMesh(this.visual, new THREE.CylinderGeometry(0.22, 0.14, 0.34, 24, 1, true), carbonMat, new THREE.Vector3(0, -0.25, 0));

    const collar = this._addMesh(
      this.visual,
      new THREE.TorusGeometry(0.315, 0.022, 12, 48),
      glowMat,
      new THREE.Vector3(0, 1.0, 0),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    collar.castShadow = false;
    const shoulderBand = this._addMesh(
      this.visual,
      new THREE.TorusGeometry(0.28, 0.016, 12, 42),
      accentMat,
      new THREE.Vector3(0, 1.7, 0),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    shoulderBand.castShadow = false;

    // Sleek cockpit canopy + dorsal spine
    this._addMesh(
      this.visual,
      new THREE.SphereGeometry(0.19, 20, 14),
      glass,
      new THREE.Vector3(0, 1.78, 0.17),
      null,
      new THREE.Vector3(1.05, 0.82, 0.42)
    );
    this._addMesh(this.visual, new THREE.BoxGeometry(0.1, 0.22, 0.16), carbonMat, new THREE.Vector3(0, 1.58, -0.17));
    this._addMesh(this.visual, new THREE.BoxGeometry(0.16, 0.035, 0.06), glowMat, new THREE.Vector3(0, 1.64, 0.26));

    // Side nacelles / thruster pods
    for (const side of [-1, 1]) {
      const sx = side * 0.42;
      this._addMesh(this.visual, new THREE.CylinderGeometry(0.075, 0.095, 0.94, 16), carbonMat, new THREE.Vector3(sx, 0.98, 0));
      this._addMesh(this.visual, new THREE.ConeGeometry(0.075, 0.2, 16), panelMat, new THREE.Vector3(sx, 1.55, 0));
      this._addMesh(this.visual, new THREE.CylinderGeometry(0.052, 0.036, 0.14, 14), warmMetal, new THREE.Vector3(sx, 0.33, 0));
      this._addMesh(this.visual, new THREE.BoxGeometry(0.17, 0.05, 0.08), glowMat, new THREE.Vector3(side * 0.29, 1.16, 0.14));

      for (const by of [0.7, 1.1]) {
        const brace = this._addMesh(
          this.visual,
          new THREE.CylinderGeometry(0.01, 0.01, 0.34, 8),
          panelMat,
          new THREE.Vector3(side * 0.23, by, 0)
        );
        brace.rotation.z = side * 0.95;
      }
    }

    // Swept winglets/fins for a cleaner futuristic silhouette (side-view readable).
    for (const side of [-1, 1]) {
      const wing = this._addMesh(
        this.visual,
        new THREE.BoxGeometry(0.12, 0.38, 0.22),
        side < 0 ? glowMat : accentMat,
        new THREE.Vector3(side * 0.22, 0.25, 0)
      );
      wing.rotation.z = side * 0.35;
      wing.rotation.x = 0.06 * side;
    }

    const dorsalFin = this._addMesh(
      this.visual,
      new THREE.BoxGeometry(0.08, 0.34, 0.2),
      carbonMat,
      new THREE.Vector3(0, 0.92, -0.22)
    );
    dorsalFin.rotation.x = -0.2;
    const ventralFin = this._addMesh(
      this.visual,
      new THREE.BoxGeometry(0.06, 0.28, 0.16),
      carbonMat,
      new THREE.Vector3(0, 0.12, -0.18)
    );
    ventralFin.rotation.x = 0.2;

    // Landing skids (clear ground read in side view)
    for (const side of [-1, 1]) {
      const leg = this._addMesh(
        this.visual,
        new THREE.CylinderGeometry(0.011, 0.014, 0.54, 8),
        carbonMat,
        new THREE.Vector3(side * 0.14, -0.18, 0.1 * side)
      );
      leg.rotation.z = side * 0.35;
      leg.rotation.x = side * 0.12;

      const skid = this._addMesh(
        this.visual,
        new THREE.CylinderGeometry(0.02, 0.02, 0.34, 10),
        warmMetal,
        new THREE.Vector3(side * 0.32, -0.44, 0.14 * side),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      skid.receiveShadow = true;
    }

    // Engine cluster
    this._addMesh(this.visual, new THREE.CylinderGeometry(0.1, 0.13, 0.08, 18), warmMetal, new THREE.Vector3(0, -0.36, 0));
    for (const x of [-0.08, 0, 0.08]) {
      const bell = this._addMesh(
        this.visual,
        new THREE.CylinderGeometry(0.026, 0.04, 0.11, 12),
        carbonMat,
        new THREE.Vector3(x, -0.4, 0)
      );
      bell.receiveShadow = false;
    }

    // Nose sensors / modern greebles (minimal)
    this._addMesh(this.visual, new THREE.BoxGeometry(0.14, 0.045, 0.05), carbonMat, new THREE.Vector3(0, 1.9, 0.2));
    this._addMesh(this.visual, new THREE.BoxGeometry(0.11, 0.03, 0.04), glowMat, new THREE.Vector3(0, 1.9, 0.24));
    this._addMesh(this.visual, new THREE.CylinderGeometry(0.007, 0.007, 0.24, 6), carbonMat, new THREE.Vector3(0, 2.48, -0.02));

    // Navigation beacons
    const beaconTop = this._addMesh(this.visual, new THREE.SphereGeometry(0.03, 10, 8), beaconWarm, new THREE.Vector3(0, 2.62, 0));
    const beaconLeft = this._addMesh(this.visual, new THREE.SphereGeometry(0.024, 10, 8), beaconCool, new THREE.Vector3(-0.34, 1.04, 0.16));
    const beaconRight = this._addMesh(this.visual, new THREE.SphereGeometry(0.024, 10, 8), beaconCool, new THREE.Vector3(0.34, 1.04, 0.16));
    beaconTop.castShadow = false;
    beaconLeft.castShadow = false;
    beaconRight.castShadow = false;
    this.navBeacons.push(
      { mesh: beaconTop, base: 0.35, amp: 0.65, speed: 7.4, phase: 0.0 },
      { mesh: beaconLeft, base: 0.2, amp: 0.42, speed: 4.8, phase: 1.0 },
      { mesh: beaconRight, base: 0.2, amp: 0.42, speed: 4.8, phase: 2.3 }
    );
  }

  _buildFlames() {
    this.flameGroup = new THREE.Group();
    this.flameGroup.position.y = -0.5;
    this.visual.add(this.flameGroup);

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff7a00,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const midMat = new THREE.MeshBasicMaterial({
      color: 0xffc247,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x8ef6ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.05, 20, 1, true), outerMat);
    this.flameOuter.rotation.x = Math.PI;
    this.flameOuter.position.y = -0.35;
    this.flameGroup.add(this.flameOuter);

    this.flameMid = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.82, 16, 1, true), midMat);
    this.flameMid.rotation.x = Math.PI;
    this.flameMid.position.y = -0.28;
    this.flameGroup.add(this.flameMid);

    this.flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.58, 14, 1, true), coreMat);
    this.flameCore.rotation.x = Math.PI;
    this.flameCore.position.y = -0.2;
    this.flameGroup.add(this.flameCore);

    this.engineGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 10),
      new THREE.MeshBasicMaterial({
        color: 0x7ff5ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.engineGlow.position.y = -0.05;
    this.flameGroup.add(this.engineGlow);

    this.exhaustLight = new THREE.PointLight(0xff8a33, 0, 10, 2);
    this.exhaustLight.position.y = -0.2;
    this.visual.add(this.exhaustLight);

    this.flameGroup.visible = false;
  }

  _buildGroundReference() {
    this.groundRef = new THREE.Group();
    this.group.add(this.groundRef);

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x05090f,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5cecff,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x7ff6ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 36), shadowMat);
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.renderOrder = 4;
    this.groundRef.add(this.shadowDisc);

    this.shadowRing = new THREE.Mesh(new THREE.RingGeometry(0.76, 0.98, 40), ringMat);
    this.shadowRing.rotation.x = -Math.PI / 2;
    this.shadowRing.renderOrder = 5;
    this.groundRef.add(this.shadowRing);

    this.shadowPulseRing = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.6, 36), ringMat.clone());
    this.shadowPulseRing.rotation.x = -Math.PI / 2;
    this.shadowPulseRing.position.y = 0.003;
    this.shadowPulseRing.renderOrder = 5;
    this.groundRef.add(this.shadowPulseRing);

    this.shadowCore = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), coreMat);
    this.shadowCore.rotation.x = -Math.PI / 2;
    this.shadowCore.position.y = 0.005;
    this.shadowCore.renderOrder = 5;
    this.groundRef.add(this.shadowCore);

    this.altBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.045, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x66eeff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.altBeam.renderOrder = 3;
    this.groundRef.add(this.altBeam);
  }

  reset(spawn) {
    this.pos.copy(spawn);
    this.vel.set(0, 0, 0);
    this._thrustVisual = 0;
    this.flameGroup.visible = false;
    this.exhaustLight.intensity = 0;
  }

  updateGroundReference(surfaceY) {
    const alt = Math.max(0.02, this.pos.y - surfaceY);
    const proximity = clamp(1 - alt / 16, 0, 1);
    const spread = clamp(0.86 + alt * 0.09, 0.86, 2.6);

    this.groundRef.position.set(0, surfaceY - this.pos.y + 0.03, 0);

    this.shadowDisc.scale.set(spread, spread, 1);
    this.shadowDisc.material.opacity = 0.16 + proximity * 0.36;

    this.shadowRing.scale.set(spread * 1.04, spread * 1.04, 1);
    this.shadowRing.material.opacity = 0.08 + proximity * 0.28;

    this.shadowPulseRing.scale.set(spread * 0.78, spread * 0.78, 1);
    this.shadowPulseRing.material.opacity = 0.05 + proximity * 0.24 + Math.sin(this._time * 5.5) * 0.03;

    this.shadowCore.material.opacity = 0.08 + proximity * 0.2;

    this.altBeam.visible = alt > 0.1;
    if (this.altBeam.visible) {
      this.altBeam.scale.set(1, alt, 1);
      this.altBeam.position.y = -alt * 0.5 + 0.03;
      this.altBeam.material.opacity = clamp(0.12 + alt * 0.012, 0.12, 0.34);
    }
  }

  updateVisuals(input, dt) {
    this._time += dt;

    const thrustTarget = input.thrustHeld ? 1 : 0;
    this._thrustVisual = smooth(this._thrustVisual, thrustTarget, input.thrustHeld ? 20 : 12, dt);

    const targetZ = clamp(-input.tilt.x * 0.6, -0.6, 0.6);
    const targetX = clamp(-input.tilt.y * 0.25, -0.25, 0.25);

    this.visualTilt.z = smooth(this.visualTilt.z, targetZ, 10, dt);
    this.visualTilt.x = smooth(this.visualTilt.x, targetX, 10, dt);

    this.visual.rotation.z = this.visualTilt.z;
    this.visual.rotation.x = this.visualTilt.x;
    this.group.position.copy(this.pos);

    const thrust = this._thrustVisual;
    const flicker = 0.88 + Math.sin(this._time * 65) * 0.08 + Math.sin(this._time * 43 + 1.7) * 0.06;
    const flameLen = (0.45 + thrust * 1.15) * flicker;
    const flameWidth = 0.7 + thrust * 0.35;

    this.flameGroup.visible = thrust > 0.02;
    this.flameGroup.rotation.y += dt * (4 + thrust * 10);
    this.flameGroup.position.y = -0.5 - thrust * 0.06;

    this.flameOuter.scale.set(flameWidth, flameLen, flameWidth);
    this.flameMid.scale.set(0.82 + thrust * 0.22, 0.65 + thrust * 0.85, 0.82 + thrust * 0.22);
    this.flameCore.scale.set(0.75 + thrust * 0.25, 0.55 + thrust * 0.65, 0.75 + thrust * 0.25);
    this.engineGlow.scale.setScalar(0.9 + thrust * 0.8);

    this.flameOuter.material.opacity = thrust * 0.42;
    this.flameMid.material.opacity = thrust * 0.62;
    this.flameCore.material.opacity = thrust * 0.78;
    this.engineGlow.material.opacity = thrust * 0.46;

    this.exhaustLight.intensity = thrust * (2.2 + Math.sin(this._time * 52) * 0.25);
    this.exhaustLight.distance = 8 + thrust * 10;

    for (const b of this.navBeacons) {
      const pulse = b.base + (0.5 + 0.5 * Math.sin(this._time * b.speed + b.phase)) * b.amp;
      b.mesh.material.opacity = pulse;
      b.mesh.scale.setScalar(0.9 + pulse * 0.18);
    }
  }

  getMetrics() {
    const vspd = this.vel.y;
    const hspd = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    const ang = Math.max(Math.abs(deg(this.visual.rotation.z)), Math.abs(deg(this.visual.rotation.x)));
    return { vspd, hspd, ang };
  }
}
