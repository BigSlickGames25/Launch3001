import { clamp } from "./utils.js";

export class Physics {
  constructor() {
    this.gravity = 9.8;
    this.wind = 0.0;
    this.maxSpeed = 28;

    // Smooth side-scroller tuning (no forced auto-scroll).
    this.steerTargetSpeed = 7.4;
    this.pitchTargetSpeed = 0.05;
    this.steerResponse = 8.4;
    this.pitchResponse = 7.2;
    this.freeDriftDamping = 1.0;
    this.thrustDriftDamping = 0.65;

    // Up/down input is a soft vertical trim, not a hard shove.
    this.verticalTrimAccel = 6.2;
    this.verticalTrimThrustBonus = 0.9;
    this.verticalCenterDamping = 0.9;
    this.verticalAssistLimit = 0.7;

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

    const steerInput = clamp(steer, -1.2, 1.2);
    const pitchInput = clamp(pitch, -1.0, 1.0);

    // No auto-forward movement: only user input + wind drives horizontal speed.
    const windTargetX = this.wind * 1.15;
    const targetVx = windTargetX + steerInput * this.steerTargetSpeed * (1 + steerMag * 0.12);

    // Hidden depth is de-emphasized; keep only a small trim for a bit of parallax.
    const targetVz = (-pitchInput) * this.pitchTargetSpeed;

    // Map up/down into visible vertical motion so controls feel like a side scroller.
    const verticalTrim = this.verticalTrimAccel + (input.thrustHeld ? this.verticalTrimThrustBonus : 0);
    const verticalAssist = clamp(pitchInput, -this.verticalAssistLimit, this.verticalAssistLimit);
    rocket.vel.y += verticalAssist * verticalTrim * dt;

    const steerResponse = this.steerResponse + steerMag * 2.2;
    const pitchResponse = this.pitchResponse + pitchMag * 1.5;
    const steerBlend = 1 - Math.exp(-steerResponse * dt);
    const pitchBlend = 1 - Math.exp(-pitchResponse * dt);

    rocket.vel.x += (targetVx - rocket.vel.x) * steerBlend;
    rocket.vel.z += (targetVz - rocket.vel.z) * pitchBlend;

    // Keep hidden-depth drift from accumulating; this is primarily a 2D lane.
    rocket.vel.z *= Math.exp(-5.8 * dt);

    // Gentle vertical damping helps up/down trim feel silky instead of springy/violent.
    const verticalCenter = clamp(1 - pitchMag / 0.9, 0, 1);
    const verticalDamp = this.verticalCenterDamping * verticalCenter + (input.thrustHeld ? 0.12 : 0.22);
    rocket.vel.y *= Math.exp(-verticalDamp * dt);

    // Extra damping near center so the rocket settles instead of sliding forever.
    const nearCenter = Math.max(0, 1 - Math.max(steerMag, pitchMag) / 0.45);
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
