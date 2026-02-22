import { clamp } from "./utils.js";

export class Physics {
  constructor() {
    this.gravity = 9.8;
    this.wind = 0.0;
    this.maxSpeed = 25;
    this.steerTargetSpeed = 7.2;
    this.pitchTargetSpeed = 3.2;
    this.steerResponse = 6.5;
    this.pitchResponse = 5.8;
    this.freeDriftDamping = 1.35;
    this.thrustDriftDamping = 0.75;

    // landing tolerances
    this.maxVspd = 6.0;
    this.maxHspd = 5.5;
    this.maxAngleDeg = 18;
  }

  apply(rocket, input, dt) {
    const steer = input.tilt.x;
    const pitch = input.tilt.y;
    const steerMag = Math.abs(steer);
    const pitchMag = Math.abs(pitch);

    // Gravity
    rocket.vel.y -= this.gravity * dt;

    // Wind acts like a baseline sideways drift the player trims against.
    const windTargetX = this.wind * 1.15;
    const targetVx = windTargetX + steer * this.steerTargetSpeed;
    const targetVz = (-pitch) * this.pitchTargetSpeed;

    const steerResponse = this.steerResponse + steerMag * 2.2;
    const pitchResponse = this.pitchResponse + pitchMag * 1.5;
    const steerBlend = 1 - Math.exp(-steerResponse * dt);
    const pitchBlend = 1 - Math.exp(-pitchResponse * dt);

    rocket.vel.x += (targetVx - rocket.vel.x) * steerBlend;
    rocket.vel.z += (targetVz - rocket.vel.z) * pitchBlend;

    // Extra damping near center so the rocket settles instead of sliding forever.
    const nearCenter = Math.max(0, 1 - Math.max(steerMag, pitchMag) / 0.18);
    const damping = (input.thrustHeld ? this.thrustDriftDamping : this.freeDriftDamping) * nearCenter;
    if (damping > 0) {
      const drag = Math.exp(-damping * dt);
      rocket.vel.x *= drag;
      rocket.vel.z *= drag;
    }

    // Thrust
    if (input.thrustHeld) {
      rocket.vel.y += rocket.thrustPower * dt;
      rocket.fuel = Math.max(0, rocket.fuel - rocket.fuelBurn * dt);
    }

    // Clamp
    rocket.vel.x = clamp(rocket.vel.x, -this.maxSpeed, this.maxSpeed);
    rocket.vel.y = clamp(rocket.vel.y, -this.maxSpeed, this.maxSpeed);
    rocket.vel.z = clamp(rocket.vel.z, -this.maxSpeed, this.maxSpeed);

    // Integrate
    rocket.pos.x += rocket.vel.x * dt;
    rocket.pos.y += rocket.vel.y * dt;
    rocket.pos.z += rocket.vel.z * dt;
  }
}
