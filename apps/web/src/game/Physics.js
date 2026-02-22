import { clamp } from "./utils.js";

export class Physics {
  constructor() {
    this.gravity = 9.8;
    this.wind = 0.0;
    this.maxSpeed = 25;

    // landing tolerances
    this.maxVspd = 6.0;
    this.maxHspd = 5.5;
    this.maxAngleDeg = 18;
  }

  apply(rocket, input, dt) {
    // Gravity
    rocket.vel.y -= this.gravity * dt;

    // Wind drift
    rocket.vel.x += (this.wind * 0.35) * dt;

    // Steering from tilt
    const steer = input.tilt.x;
    rocket.vel.x += steer * rocket.steerAccel * dt;

    // Optional pitch affects z
    const pitch = input.tilt.y;
    rocket.vel.z += (-pitch) * rocket.steerAccel * 0.35 * dt;

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
