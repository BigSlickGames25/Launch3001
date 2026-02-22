import * as THREE from "three";
import { clamp, deg, smooth } from "./utils.js";

export class Rocket {
  constructor() {
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x001a1a, metalness: 0.6, roughness: 0.2 })
    );
    body.position.y = 0.6;
    this.group.add(body);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.06, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x220022, metalness: 0.4, roughness: 0.3 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    this.group.add(ring);

    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 12),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x332200 })
    );
    this.flame.position.y = -0.15;
    this.flame.rotation.x = Math.PI;
    this.flame.visible = false;
    this.group.add(this.flame);

    this.pos = new THREE.Vector3(0, 2.0, 0);
    this.vel = new THREE.Vector3(0, 0, 0);

    this.thrustPower = 18.5;
    this.steerAccel = 10.0;

    this.fuel = 9999;
    this.fuelBurn = 0;

    this.visualTilt = { x: 0, z: 0 };
  }

  reset(spawn) {
    this.pos.copy(spawn);
    this.vel.set(0, 0, 0);
  }

  updateVisuals(input, dt) {
    this.flame.visible = input.thrustHeld;

    const targetZ = clamp(-input.tilt.x * 0.6, -0.6, 0.6);
    const targetX = clamp(input.tilt.y * 0.25, -0.25, 0.25);

    this.visualTilt.z = smooth(this.visualTilt.z, targetZ, 10, dt);
    this.visualTilt.x = smooth(this.visualTilt.x, targetX, 10, dt);

    this.group.rotation.z = this.visualTilt.z;
    this.group.rotation.x = this.visualTilt.x;
    this.group.position.copy(this.pos);
  }

  getMetrics() {
    const vspd = this.vel.y;
    const hspd = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    const ang = Math.max(Math.abs(deg(this.group.rotation.z)), Math.abs(deg(this.group.rotation.x)));
    return { vspd, hspd, ang };
  }
}
