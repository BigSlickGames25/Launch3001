import { clamp, smooth } from "./utils.js";

export class Input {
  constructor({ canvas, ui }) {
    this.canvas = canvas;
    this.ui = ui;

    this.thrustHeld = false;

    // Tilt state
    this.motionEnabled = false;
    this.bias = { x: 0, y: 0 };
    this.raw = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 }; // smoothed
    this.tiltRate = 14;
    this._hasMotionSample = false;

    this._bindTouch();
    this._bindButtons();
    this._bindMotion();
  }

  _bindTouch() {
    const down = () => { this.thrustHeld = true; };
    const up = () => { this.thrustHeld = false; };

    this.canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _bindButtons() {
    this.ui.btnMotion.addEventListener("click", async () => {
      await this.enableMotion();
    });
    this.ui.btnCal.addEventListener("click", () => this.calibrate());
  }

  _bindMotion() {
    const onOrientation = (e) => {
      if (!this.motionEnabled) return;
      const gamma = e.gamma;
      const beta = e.beta;
      if (typeof gamma !== "number" || typeof beta !== "number") return;
      this.raw.x = gamma / 30;
      this.raw.y = beta / 45;
      this._hasMotionSample = true;
    };

    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("deviceorientationabsolute", onOrientation);
  }

  async enableMotion() {
    const host = window.location.hostname;
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
    if (!window.isSecureContext && !isLocalHost) {
      this.ui.setStatus("MOTION NEEDS HTTPS", "warn");
      return;
    }

    const orientation = window.DeviceOrientationEvent;
    const motion = window.DeviceMotionEvent;
    const permissionCalls = [];

    if (orientation && typeof orientation.requestPermission === "function") {
      permissionCalls.push(() => orientation.requestPermission());
    }
    if (
      motion &&
      typeof motion.requestPermission === "function" &&
      motion !== orientation
    ) {
      permissionCalls.push(() => motion.requestPermission());
    }

    if (permissionCalls.length) {
      const results = await Promise.allSettled(permissionCalls.map((fn) => fn()));
      const granted = results.some(
        (r) => r.status === "fulfilled" && r.value === "granted"
      );
      if (!granted) {
        this.ui.setStatus("MOTION DENIED", "warn");
        return;
      }
    }

    this._hasMotionSample = false;
    this.motionEnabled = true;
    this.ui.setStatus("TILT ON", "ok");
    window.setTimeout(() => {
      if (this.motionEnabled && !this._hasMotionSample) {
        this.ui.setStatus("NO SENSOR DATA", "warn");
      }
    }, 1500);
  }

  calibrate() {
    this.bias.x = this.raw.x;
    this.bias.y = this.raw.y;
    this.ui.setStatus("CALIBRATED", "ok");
  }

  update(dt) {
    const tx = clamp(this.raw.x - this.bias.x, -1.2, 1.2);
    const ty = clamp(this.raw.y - this.bias.y, -1.2, 1.2);

    this.tilt.x = smooth(this.tilt.x, tx, this.tiltRate, dt);
    this.tilt.y = smooth(this.tilt.y, ty, this.tiltRate, dt);
  }
}
