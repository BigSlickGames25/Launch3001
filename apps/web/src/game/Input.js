import { clamp, smooth } from "./utils.js";

export class Input {
  constructor({ canvas, ui }) {
    this.canvas = canvas;
    this.ui = ui;

    this.thrustHeld = false;
    this.touchThrust = false;
    this.keyboardThrust = false;
    this._boostPointers = new Set();

    // Tilt state
    this.motionEnabled = false;
    this.bias = { x: 0, y: 0 };
    this.raw = { x: 0, y: 0 };
    this.joy = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 }; // smoothed
    this.tiltRate = 18;
    this.sensitivityScale = 1.8;
    this.keyboardAxisStrength = 1.0;
    this.deadzone = { x: 0.06, y: 0.045 };
    this.responseExpo = { x: 1.4, y: 1.18 };
    this._hasMotionSample = false;
    this._joyPointerId = null;
    this.scoreOnlyUI = !!document.getElementById("app")?.classList.contains("side-scroll-ui")
      || !!document.getElementById("app")?.classList.contains("score-only-ui");
    const storedSteerMode = localStorage.getItem("launcher_steer_mode");
    this.steerMode = this.scoreOnlyUI
      ? "JOYSTICK"
      : (
        storedSteerMode === "TABLETOP" || storedSteerMode === "JOYSTICK"
          ? storedSteerMode
          : "UPRIGHT"
      );
    this.swapControlSides = localStorage.getItem("launcher_swap_control_sides") === "1";
    this.invertLR = localStorage.getItem("launcher_invert_lr") === "1";
    this.invertFB = localStorage.getItem("launcher_invert_fb") === "1";
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
    this.ui.setSteerMode(this.steerMode);
    if (this.scoreOnlyUI) localStorage.setItem("launcher_steer_mode", "JOYSTICK");
    this.ui.setControlSidesSwapped(this.swapControlSides);
    this.ui.setInvertLR(this.invertLR);
    this.ui.setInvertFB(this.invertFB);
  }

  _bindTouch() {
    const boostBtn = this.ui.btnBoost;
    if (boostBtn) {
      const boostDown = (e) => {
        if (typeof e.button === "number" && e.button !== 0) return;
        e.preventDefault();
        try { boostBtn.setPointerCapture(e.pointerId); } catch {}
        this._boostPointers.add(e.pointerId);
        this.touchThrust = this._boostPointers.size > 0;
        this._syncThrust();
      };
      const boostUp = (e) => {
        if (!this._boostPointers.has(e.pointerId)) return;
        this._boostPointers.delete(e.pointerId);
        this.touchThrust = this._boostPointers.size > 0;
        this._syncThrust();
      };
      boostBtn.addEventListener("pointerdown", boostDown);
      boostBtn.addEventListener("pointerup", boostUp);
      boostBtn.addEventListener("pointercancel", boostUp);
      boostBtn.addEventListener("lostpointercapture", boostUp);
    }

    const joyPad = this.ui.joystickPad;
    if (joyPad) {
      const setJoyFromPointer = (e) => {
        const rect = joyPad.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        let nx = (e.clientX - cx) / (rect.width * 0.5);
        let ny = (e.clientY - cy) / (rect.height * 0.5);
        const mag = Math.hypot(nx, ny);
        if (mag > 1) {
          nx /= mag;
          ny /= mag;
        }
        this.joy.x = clamp(nx * 1.15, -1.25, 1.25);
        this.joy.y = clamp(ny * 1.15, -1.25, 1.25);
        this.ui.setJoystickStick(this.joy.x, this.joy.y);
      };

      const releaseJoy = () => {
        this._joyPointerId = null;
        this.joy.x = 0;
        this.joy.y = 0;
        this.ui.setJoystickStick(0, 0);
      };

      joyPad.addEventListener("pointerdown", (e) => {
        if (typeof e.button === "number" && e.button !== 0) return;
        if (this._joyPointerId !== null) return;
        e.preventDefault();
        this._joyPointerId = e.pointerId;
        try { joyPad.setPointerCapture(e.pointerId); } catch {}
        setJoyFromPointer(e);
      });

      const onJoyMove = (e) => {
        if (e.pointerId !== this._joyPointerId) return;
        e.preventDefault();
        setJoyFromPointer(e);
      };
      const onJoyUp = (e) => {
        if (e.pointerId !== this._joyPointerId) return;
        releaseJoy();
      };

      joyPad.addEventListener("pointermove", onJoyMove);
      joyPad.addEventListener("pointerup", onJoyUp);
      joyPad.addEventListener("pointercancel", onJoyUp);
      joyPad.addEventListener("lostpointercapture", onJoyUp);
      window.addEventListener("pointermove", onJoyMove, { passive: false });
      window.addEventListener("pointerup", onJoyUp);
      window.addEventListener("pointercancel", onJoyUp);

      this._releaseJoystick = releaseJoy;
    }
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
      this._boostPointers.clear();
      this.touchThrust = false;
      if (this._releaseJoystick) this._releaseJoystick();
      this._syncThrust();
    });
  }

  _syncThrust() {
    this.thrustHeld = this.touchThrust || this.keyboardThrust;
    this.ui.setBoostActive(this.thrustHeld);
  }

  clearThrustState() {
    this._boostPointers.clear();
    this.touchThrust = false;
    this.keyboardThrust = false;
    if (this._releaseJoystick) this._releaseJoystick();
    this._syncThrust();
  }

  setSensitivityScale(scale) {
    this.sensitivityScale = clamp(scale, 0.25, 2.6);
  }

  _shapeAxis(v, deadzone, expo, maxMag = 1.2) {
    const sign = v < 0 ? -1 : 1;
    const mag = Math.min(Math.abs(v), maxMag);
    if (mag <= deadzone) return 0;

    const norm = (mag - deadzone) / (maxMag - deadzone);
    const shaped = Math.pow(norm, expo) * maxMag;
    return shaped * sign;
  }

  _bindButtons() {
    const onClick = (el, fn) => {
      if (!el) return;
      el.addEventListener("click", fn);
    };

    onClick(this.ui.btnMotion, async () => {
      await this.enableMotion();
      this.ui.toggleMenu(false);
    });
    onClick(this.ui.btnCal, () => {
      this.calibrate();
      this.ui.toggleMenu(false);
    });
    onClick(this.ui.btnSteer, () => {
      const modes = ["UPRIGHT", "TABLETOP", "JOYSTICK"];
      const nextIdx = (modes.indexOf(this.steerMode) + 1) % modes.length;
      this.steerMode = modes[nextIdx];
      localStorage.setItem("launcher_steer_mode", this.steerMode);
      if (this._releaseJoystick) this._releaseJoystick();
      this.ui.setSteerMode(this.steerMode);
      if (this.steerMode === "JOYSTICK") {
        // No gyro calibration required for the virtual joystick.
      } else {
        this.calibrate();
      }
      this.ui.setStatus(`STEER ${this.steerMode}`, "ok");
      this.ui.toggleMenu(false);
    });
    onClick(this.ui.btnSwapSides, () => {
      this.swapControlSides = !this.swapControlSides;
      localStorage.setItem("launcher_swap_control_sides", this.swapControlSides ? "1" : "0");
      this.ui.setControlSidesSwapped(this.swapControlSides);
      this.ui.setStatus(`CTRL SIDES ${this.swapControlSides ? "SWAP" : "DEFAULT"}`, "ok");
    });
    onClick(this.ui.btnInvertLR, () => {
      this.invertLR = !this.invertLR;
      localStorage.setItem("launcher_invert_lr", this.invertLR ? "1" : "0");
      this.ui.setInvertLR(this.invertLR);
      this.ui.setStatus(`INV L/R ${this.invertLR ? "ON" : "OFF"}`, "ok");
    });
    onClick(this.ui.btnInvertFB, () => {
      this.invertFB = !this.invertFB;
      localStorage.setItem("launcher_invert_fb", this.invertFB ? "1" : "0");
      this.ui.setInvertFB(this.invertFB);
      this.ui.setStatus(`INV F/B ${this.invertFB ? "ON" : "OFF"}`, "ok");
    });
  }

  _bindMotion() {
    const onOrientation = (e) => {
      if (!this.motionEnabled || this.steerMode !== "UPRIGHT") return;
      const gamma = e.gamma;
      const beta = e.beta;
      if (typeof gamma !== "number" || typeof beta !== "number") return;
      this.raw.x = gamma / 30;
      this.raw.y = beta / 45;
      this._hasMotionSample = true;
    };

    const onMotion = (e) => {
      if (!this.motionEnabled || this.steerMode !== "TABLETOP") return;
      const src = e.accelerationIncludingGravity ?? e.acceleration;
      if (!src) return;

      const ax = typeof src.x === "number" ? src.x : 0;
      const ay = typeof src.y === "number" ? src.y : 0;
      const angle =
        typeof screen.orientation?.angle === "number"
          ? screen.orientation.angle
          : (typeof window.orientation === "number" ? window.orientation : 0);

      let rx = ax;
      let ry = ay;
      if (angle === 90) {
        rx = -ay;
        ry = ax;
      } else if (angle === -90 || angle === 270) {
        rx = ay;
        ry = -ax;
      } else if (Math.abs(angle) === 180) {
        rx = -ax;
        ry = -ay;
      }

      this.raw.x = clamp(rx / 4.5, -1.5, 1.5);
      this.raw.y = clamp(-ry / 4.5, -1.5, 1.5);
      this._hasMotionSample = true;
    };

    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("devicemotion", onMotion);
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
    if (this.steerMode === "JOYSTICK") {
      this.ui.setStatus("JOYSTICK READY", "ok");
      return;
    }
    this.bias.x = this.raw.x;
    this.bias.y = this.raw.y;
    this.ui.setStatus("CALIBRATED", "ok");
  }

  update(dt) {
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const ky = (this.keys.up ? 1 : 0) - (this.keys.down ? 1 : 0);
    const steerSourceX = this.steerMode === "JOYSTICK" ? this.joy.x : (this.raw.x - this.bias.x);
    const steerSourceY = this.steerMode === "JOYSTICK" ? this.joy.y : (this.raw.y - this.bias.y);
    const xAxisBase = steerSourceX + kx * this.keyboardAxisStrength;
    const yAxisBase = steerSourceY + ky * this.keyboardAxisStrength;
    const xAxis = (this.invertLR ? -1 : 1) * xAxisBase;
    const yAxis = (this.invertFB ? -1 : 1) * yAxisBase;

    const shapedX = this._shapeAxis(xAxis, this.deadzone.x, this.responseExpo.x);
    const shapedY = this._shapeAxis(yAxis, this.deadzone.y, this.responseExpo.y);

    // 100% now maps to a stronger, more responsive feel than the previous tuning pass.
    const sensGain = 0.18 + this.sensitivityScale * 1.85;
    const tx = clamp(shapedX * sensGain, -2.4, 2.4);
    const ty = clamp(shapedY * sensGain, -2.4, 2.4);

    const activeRate = this.steerMode === "JOYSTICK" ? 22 : this.steerMode === "TABLETOP" ? 14 : this.tiltRate;
    const centerRate = this.steerMode === "JOYSTICK" ? 26 : this.steerMode === "TABLETOP" ? 18 : 22;
    const xRate = Math.abs(tx) < 0.03 ? centerRate : activeRate;
    const yRate = Math.abs(ty) < 0.03 ? centerRate : activeRate;

    this.tilt.x = smooth(this.tilt.x, tx, xRate, dt);
    this.tilt.y = smooth(this.tilt.y, ty, yRate, dt);
  }
}
