import { clamp } from "./utils.js";

export class Physics {
  constructor() {
    this.gravity = 9.8;
    this.wind = 0.0;
    this.maxSpeed = 28;

    // Side-scroller tuning: snappier horizontal response, lighter hidden-depth movement.
    this.steerTargetSpeed = 9.4;
    this.pitchTargetSpeed = 0.7;
    this.steerResponse = 11.0;
    this.pitchResponse = 8.0;
    this.freeDriftDamping = 0.75;
    this.thrustDriftDamping = 0.42;

    // Light auto-scroll keeps the run moving forward like a true side scroller.
    this.autoScrollBase = 2.0;
    this.autoScrollThrustBonus = 1.6;

    // Up/down input trims vertical motion directly for a more fluid side-scroller feel.
    this.verticalTrimAccel = 15.0;

    // landing tolerances
    this.maxVspd = 6.0;
    this.maxHspd = 6.4;
    this.maxAngleDeg = 18;
  }

  apply(rocket, input, dt) {
    const steer = input.tilt.x;
    const pitch = input.tilt.y;
    const steerMag = Math.abs(steer);
    const pitchMag = Math.abs(pitch);

    // Gravity
    rocket.vel.y -= this.gravity * dt;

    // Side-scroller forward drift with some braking when steering hard left.
    const brakeFactor = 1 - Math.max(0, -steer) * 0.45;
    const autoScrollX = (this.autoScrollBase + (input.thrustHeld ? this.autoScrollThrustBonus : 0)) * brakeFactor;
    const windTargetX = this.wind * 1.15 + autoScrollX;
    const targetVx = windTargetX + steer * this.steerTargetSpeed * (1 + steerMag * 0.18);

    // Hidden depth is de-emphasized; keep only a small trim for a bit of parallax.
    const targetVz = (-pitch) * this.pitchTargetSpeed;

    // Map up/down into visible vertical motion so controls feel like a side scroller.
    rocket.vel.y += pitch * this.verticalTrimAccel * dt;

    const steerResponse = this.steerResponse + steerMag * 2.2;
    const pitchResponse = this.pitchResponse + pitchMag * 1.5;
    const steerBlend = 1 - Math.exp(-steerResponse * dt);
    const pitchBlend = 1 - Math.exp(-pitchResponse * dt);

    rocket.vel.x += (targetVx - rocket.vel.x) * steerBlend;
    rocket.vel.z += (targetVz - rocket.vel.z) * pitchBlend;

    // Extra damping near center so the rocket settles instead of sliding forever.
    const nearCenter = Math.max(0, 1 - Math.max(steerMag, pitchMag) / 0.28);
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
