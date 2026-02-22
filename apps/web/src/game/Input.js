import { clamp, smooth } from "./utils.js";

export class Input {
  constructor({ canvas, ui }) {
    this.canvas = canvas;
    this.ui = ui;

    this.thrustHeld = false;
    this.touchThrust = false;
    this.keyboardThrust = false;

    // Tilt state
    this.motionEnabled = false;
    this.bias = { x: 0, y: 0 };
    this.raw = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 }; // smoothed
    this.tiltRate = 14;
    this.sensitivityScale = 1.0;
    this.keyboardAxisStrength = 0.9;
    this._hasMotionSample = false;
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    this._bindTouch();
    this._bindKeyboard();
    this._bindButtons();
    this._bindMotion();
  }

  _bindTouch() {
    const down = () => {
      this.touchThrust = true;
      this._syncThrust();
    };
    const up = () => {
      this.touchThrust = false;
      this._syncThrust();
    };

    this.canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  _bindKeyboard() {
    const setKey = (code, isDown) => {
      if (code === "ArrowLeft" || code === "KeyA") this.keys.left = isDown;
      if (code === "ArrowRight" || code === "KeyD") this.keys.right = isDown;
      if (code === "ArrowUp" || code === "KeyW") this.keys.up = isDown;
      if (code === "ArrowDown" || code === "KeyS") this.keys.down = isDown;
      if (code === "Space") this.keyboardThrust = isDown;
      this._syncThrust();
    };

    window.addEventListener("keydown", (e) => {
      if (
        e.code === "Space" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown"
      ) {
        e.preventDefault();
      }
      setKey(e.code, true);
    });

    window.addEventListener("keyup", (e) => {
      if (
        e.code === "Space" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown"
      ) {
        e.preventDefault();
      }
      setKey(e.code, false);
    });

    window.addEventListener("blur", () => {
      this.keys.left = false;
      this.keys.right = false;
      this.keys.up = false;
      this.keys.down = false;
      this.keyboardThrust = false;
      this._syncThrust();
    });
  }

  _syncThrust() {
    this.thrustHeld = this.touchThrust || this.keyboardThrust;
  }

  clearThrustState() {
    this.touchThrust = false;
    this.keyboardThrust = false;
    this._syncThrust();
  }

  setSensitivityScale(scale) {
    this.sensitivityScale = clamp(scale, 0.35, 1.4);
  }

  _bindButtons() {
    this.ui.btnMotion.addEventListener("click", async () => {
      await this.enableMotion();
      this.ui.toggleMenu(false);
    });
    this.ui.btnCal.addEventListener("click", () => {
      this.calibrate();
      this.ui.toggleMenu(false);
    });
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
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const ky = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);
    const xAxis = this.raw.x - this.bias.x + kx * this.keyboardAxisStrength;
    const yAxis = this.raw.y - this.bias.y + ky * this.keyboardAxisStrength;

    const tx = clamp(
      xAxis * this.sensitivityScale,
      -1.2,
      1.2
    );
    const ty = clamp(
      yAxis * this.sensitivityScale,
      -1.2,
      1.2
    );

    this.tilt.x = smooth(this.tilt.x, tx, this.tiltRate, dt);
    this.tilt.y = smooth(this.tilt.y, ty, this.tiltRate, dt);
  }
}
