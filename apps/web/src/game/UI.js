export class UI {
  constructor() {
    this.lvl = document.getElementById("lvl");
    this.score = document.getElementById("score");
    this.best = document.getElementById("best");

    this.status = document.getElementById("status");
    this.gyroPad = document.getElementById("gyroPad");
    this.gyroBall = document.getElementById("gyroBall");
    this.mobileControls = document.getElementById("mobileControls");
    this.joystickWrap = document.getElementById("joystickWrap");
    this.joystickPad = document.getElementById("joystickPad");
    this.joystickStick = document.getElementById("joystickStick");
    this.btnBoost = document.getElementById("btnBoost");

    this.settingsMenu = document.getElementById("settingsMenu");
    this.btnMenu = document.getElementById("btnMenu");
    this.btnMenuClose = document.getElementById("btnMenuClose");
    this.btnMotion = document.getElementById("btnMotion");
    this.btnCal = document.getElementById("btnCal");
    this.btnSteer = document.getElementById("btnSteer");
    this.btnSwapSides = document.getElementById("btnSwapSides");
    this.btnInvertLR = document.getElementById("btnInvertLR");
    this.btnInvertFB = document.getElementById("btnInvertFB");
    this.sensRange = document.getElementById("sensRange");
    this.gravRange = document.getElementById("gravRange");
    this.sensValue = document.getElementById("sensValue");
    this.gravValue = document.getElementById("gravValue");
    this.levelJumpInput = document.getElementById("levelJumpInput");
    this.levelJumpMax = document.getElementById("levelJumpMax");
    this.btnGoLevel = document.getElementById("btnGoLevel");
    this.btnCam = document.getElementById("btnCam");
    this.btnReset = document.getElementById("btnReset");

    this._statusTimer = 0;
    this._statusBase = "READY";
    this.setJoystickVisible(false);
    this.setBoostActive(false);
  }

  setStatus(text, mode = "info") {
    this._statusBase = text;
    this.status.textContent = text;
    this.status.style.color =
      mode === "warn" ? "rgba(255,90,90,0.95)" :
      mode === "ok" ? "rgba(80,255,160,0.95)" :
      "rgba(0,255,255,0.9)";
    this._statusTimer = 1.2;
  }

  setSensitivityScale(scale) {
    const pct = Math.round(scale * 100);
    this.sensValue.textContent = `${pct}%`;
    this.sensRange.value = String(pct);
  }

  setGravityScale(scale) {
    const pct = Math.round(scale * 100);
    this.gravValue.textContent = `${pct}%`;
    this.gravRange.value = String(pct);
  }

  setLevelJumpBounds(maxLevel) {
    const max = Math.max(1, maxLevel | 0);
    if (this.levelJumpInput) {
      this.levelJumpInput.min = "1";
      this.levelJumpInput.max = String(max);
    }
    if (this.levelJumpMax) {
      this.levelJumpMax.textContent = `Max ${max}`;
    }
  }

  setLevelJumpValue(level) {
    if (!this.levelJumpInput) return;
    this.levelJumpInput.value = String(Math.max(1, level | 0));
  }

  setSteerMode(mode) {
    const label =
      mode === "TABLETOP" ? "Tabletop" :
      mode === "JOYSTICK" ? "Joystick" :
      "Upright";
    this.btnSteer.textContent = `Steering: ${label}`;
    this.setJoystickVisible(mode === "JOYSTICK");
  }

  setInvertLR(enabled) {
    this.btnInvertLR.textContent = `Invert L/R: ${enabled ? "On" : "Off"}`;
  }

  setControlSidesSwapped(enabled) {
    if (this.btnSwapSides) {
      this.btnSwapSides.textContent = `Control Sides: ${enabled ? "Swapped" : "Default"}`;
    }
    if (this.mobileControls) {
      this.mobileControls.classList.toggle("swap-sides", !!enabled);
    }
  }

  setInvertFB(enabled) {
    this.btnInvertFB.textContent = `Invert F/B: ${enabled ? "On" : "Off"}`;
  }

  setGyroPreview(x, y) {
    if (!this.gyroPad || !this.gyroBall) return;

    const cx = Math.max(-1, Math.min(1, x || 0));
    const cy = Math.max(-1, Math.min(1, y || 0));
    const radius = Math.max(10, (Math.min(this.gyroPad.clientWidth, this.gyroPad.clientHeight) * 0.5) - 14);
    const dx = cx * radius;
    const dy = -cy * radius;
    const mag = Math.min(1, Math.hypot(cx, cy));

    this.gyroBall.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
    this.gyroBall.style.boxShadow = `0 0 ${10 + Math.round(mag * 14)}px rgba(0,255,255,0.9)`;
  }

  setJoystickVisible(visible) {
    if (!this.joystickWrap) return;
    this.joystickWrap.classList.toggle("hidden", !visible);
  }

  setJoystickStick(x, y) {
    if (!this.joystickPad || !this.joystickStick) return;

    const cx = Math.max(-1, Math.min(1, x || 0));
    const cy = Math.max(-1, Math.min(1, y || 0));
    const radius = Math.max(14, (Math.min(this.joystickPad.clientWidth, this.joystickPad.clientHeight) * 0.5) - 26);
    const dx = cx * radius;
    const dy = cy * radius;
    const mag = Math.min(1, Math.hypot(cx, cy));

    this.joystickStick.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
    this.joystickPad.classList.toggle("active", mag > 0.03);
  }

  setBoostActive(active) {
    if (!this.btnBoost) return;
    this.btnBoost.classList.toggle("active", !!active);
    this.btnBoost.setAttribute("aria-pressed", active ? "true" : "false");
  }

  toggleMenu(force) {
    const shouldShow =
      typeof force === "boolean"
        ? force
        : this.settingsMenu.classList.contains("hidden");
    this.settingsMenu.classList.toggle("hidden", !shouldShow);
  }

  update(dt, data) {
    if (this._statusTimer > 0) {
      this._statusTimer -= dt;
      if (this._statusTimer <= 0) this.status.textContent = this._statusBase;
    }

    if (!data) return;
    this.lvl.textContent = data.level;
    this.score.textContent = data.score;
    this.best.textContent = data.best;
    this.setGyroPreview(data.tiltX, data.tiltY);
  }
}
