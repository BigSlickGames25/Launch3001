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
    const hullMat = this._matStandard({
      color: 0xe8f6ff,
      emissive: 0x02101c,
      metalness: 0.58,
      roughness: 0.26
    });
    const accentCyan = this._matStandard({
      color: 0x5fffff,
      emissive: 0x033345,
      emissiveIntensity: 0.75,
      metalness: 0.45,
      roughness: 0.25
    });
    const accentMagenta = this._matStandard({
      color: 0xff4bd8,
      emissive: 0x3d0834,
      emissiveIntensity: 0.8,
      metalness: 0.4,
      roughness: 0.3
    });
    const darkMetal = this._matStandard({
      color: 0x161b24,
      emissive: 0x090b12,
      metalness: 0.75,
      roughness: 0.35
    });
    const glass = this._matStandard({
      color: 0x86f2ff,
      emissive: 0x0a3f58,
      emissiveIntensity: 0.55,
      metalness: 0.15,
      roughness: 0.08,
      transparent: true,
      opacity: 0.9
    });

    this._addMesh(
      this.visual,
      new THREE.CylinderGeometry(0.34, 0.42, 1.2, 28, 1, false),
      hullMat,
      new THREE.Vector3(0, 0.55, 0)
    );

    this._addMesh(
      this.visual,
      new THREE.CylinderGeometry(0.28, 0.34, 0.72, 28, 1, false),
      hullMat,
      new THREE.Vector3(0, 1.48, 0)
    );

    this._addMesh(
      this.visual,
      new THREE.ConeGeometry(0.28, 0.6, 28),
      hullMat,
      new THREE.Vector3(0, 2.14, 0)
    );

    this._addMesh(
      this.visual,
      new THREE.SphereGeometry(0.18, 18, 12),
      glass,
      new THREE.Vector3(0, 1.78, 0.16),
      null,
      new THREE.Vector3(1, 0.8, 0.4)
    );

    const band1 = this._addMesh(
      this.visual,
      new THREE.TorusGeometry(0.33, 0.03, 10, 32),
      accentCyan,
      new THREE.Vector3(0, 1.15, 0),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    band1.castShadow = false;

    const band2 = this._addMesh(
      this.visual,
      new THREE.TorusGeometry(0.29, 0.022, 10, 32),
      accentMagenta,
      new THREE.Vector3(0, 1.78, 0),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    band2.castShadow = false;

    this._addMesh(
      this.visual,
      new THREE.CylinderGeometry(0.23, 0.12, 0.38, 24, 1, true),
      darkMetal,
      new THREE.Vector3(0, -0.24, 0)
    );

    this._addMesh(
      this.visual,
      new THREE.TorusGeometry(0.24, 0.016, 8, 24),
      accentCyan,
      new THREE.Vector3(0, -0.03, 0),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );

    const finGeom = new THREE.BoxGeometry(0.06, 0.34, 0.34);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = 0.34;
      const fin = this._addMesh(
        this.visual,
        finGeom,
        i % 2 === 0 ? accentMagenta : accentCyan,
        new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r)
      );
      fin.lookAt(Math.cos(a) * 2, 0.05, Math.sin(a) * 2);
      fin.rotation.x += Math.PI / 2;
      fin.rotation.y += Math.PI / 2;
      fin.rotation.z += (i % 2 === 0 ? -0.1 : 0.1);
    }

    const strutGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 0.18;
      const z = Math.sin(a) * 0.18;
      const strut = this._addMesh(
        this.visual,
        strutGeom,
        darkMetal,
        new THREE.Vector3(x, -0.02, z)
      );
      strut.rotation.z = 0.28 * Math.cos(a);
      strut.rotation.x = 0.28 * Math.sin(a);
    }
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
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x7ff6ff,
      transparent: true,
      opacity: 0.08,
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

    this.shadowCore = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), coreMat);
    this.shadowCore.rotation.x = -Math.PI / 2;
    this.shadowCore.position.y = 0.005;
    this.shadowCore.renderOrder = 5;
    this.groundRef.add(this.shadowCore);

    this.altBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.03, 1, 10, 1, true),
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
    const spread = clamp(0.8 + alt * 0.085, 0.8, 2.3);

    this.groundRef.position.set(0, surfaceY - this.pos.y + 0.03, 0);

    this.shadowDisc.scale.set(spread, spread, 1);
    this.shadowDisc.material.opacity = 0.08 + proximity * 0.34;

    this.shadowRing.scale.set(spread * 1.04, spread * 1.04, 1);
    this.shadowRing.material.opacity = 0.05 + proximity * 0.22;

    this.shadowCore.material.opacity = 0.04 + proximity * 0.15;

    this.altBeam.visible = alt > 0.1;
    if (this.altBeam.visible) {
      this.altBeam.scale.set(1, alt, 1);
      this.altBeam.position.y = -alt * 0.5 + 0.03;
      this.altBeam.material.opacity = clamp(0.06 + alt * 0.012, 0.06, 0.24);
    }
  }

  updateVisuals(input, dt) {
    this._time += dt;

    const thrustTarget = input.thrustHeld ? 1 : 0;
    this._thrustVisual = smooth(this._thrustVisual, thrustTarget, input.thrustHeld ? 20 : 12, dt);

    const targetZ = clamp(-input.tilt.x * 0.6, -0.6, 0.6);
    const targetX = clamp(input.tilt.y * 0.25, -0.25, 0.25);

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
  }

  getMetrics() {
    const vspd = this.vel.y;
    const hspd = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    const ang = Math.max(Math.abs(deg(this.visual.rotation.z)), Math.abs(deg(this.visual.rotation.x)));
    return { vspd, hspd, ang };
  }
}
