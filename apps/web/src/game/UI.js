export class UI {
  constructor() {
    this.app = document.getElementById("app");

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

    this.menuScrim = document.getElementById("menuScrim");
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
    this._bannerMode = "info";
    this._menuOpen = false;

    if (this.menuScrim && this.settingsMenu) {
      this.menuScrim.addEventListener("click", () => this.toggleMenu(false));
    }

    this.setJoystickVisible(false);
    this.setBoostActive(false);
    this.setPauseState(false);
    this.setBanner("READY", "info", 0);
  }

  setBanner(text, mode = "info", ttl = 1.1) {
    this._statusBase = text;
    this._bannerMode = mode;
    if (!this.status) return;
    this.status.textContent = text;
    this.status.dataset.mode = mode;
    this.status.classList.remove("show");
    // Force restart animation.
    void this.status.offsetWidth;
    this.status.classList.add("show");
    this._statusTimer = ttl;
  }

  setStatus(text, mode = "info") {
    this.setBanner(text, mode, 1.1);
  }

  setSensitivityScale(scale) {
    if (!this.sensValue || !this.sensRange) return;
    const pct = Math.round(scale * 100);
    this.sensValue.textContent = `${pct}%`;
    this.sensRange.value = String(pct);
  }

  setGravityScale(scale) {
    if (!this.gravValue || !this.gravRange) return;
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
    if (!this.btnSteer) return;
    const label =
      mode === "TABLETOP" ? "Tabletop" :
      mode === "JOYSTICK" ? "Joystick" :
      "Upright";
    this.btnSteer.textContent = `Steering: ${label}`;
    this.setJoystickVisible(mode === "JOYSTICK");
  }

  setInvertLR(enabled) {
    if (this.btnInvertLR) this.btnInvertLR.textContent = `Invert L/R: ${enabled ? "On" : "Off"}`;
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
    if (this.btnInvertFB) this.btnInvertFB.textContent = `Invert F/B: ${enabled ? "On" : "Off"}`;
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
    this.gyroBall.style.boxShadow = `0 0 ${10 + Math.round(mag * 14)}px rgba(64,214,255,0.75)`;
  }

  setJoystickVisible(visible) {
    if (!this.joystickWrap) return;
    this.joystickWrap.classList.toggle("hidden", !visible);
  }

  setJoystickStick(x, y) {
    if (!this.joystickPad || !this.joystickStick) return;

    const cx = Math.max(-1, Math.min(1, x || 0));
    const cy = Math.max(-1, Math.min(1, y || 0));
    const radius = Math.max(14, (Math.min(this.joystickPad.clientWidth, this.joystickPad.clientHeight) * 0.5) - 24);
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

  showPauseDrawer(open) {
    this.toggleMenu(open);
  }

  setPauseState(paused) {
    if (this.app) this.app.classList.toggle("paused", !!paused);
    if (this.btnMenu) this.btnMenu.setAttribute("aria-pressed", paused ? "true" : "false");
  }

  isMenuOpen() {
    return !!this._menuOpen;
  }

  toggleMenu(force) {
    if (!this.settingsMenu) return false;

    const next = typeof force === "boolean"
      ? force
      : this.settingsMenu.classList.contains("hidden");

    this._menuOpen = !!next;
    this.settingsMenu.classList.toggle("hidden", !next);
    if (this.menuScrim) this.menuScrim.classList.toggle("hidden", !next);
    this.setPauseState(next);
    return next;
  }

  update(dt, data) {
    if (this._statusTimer > 0) {
      this._statusTimer -= dt;
      if (this._statusTimer <= 0 && this.status) {
        this.status.classList.remove("show");
      }
    }

    if (!data) return;
    if (this.lvl) this.lvl.textContent = data.level;
    if (this.score) this.score.textContent = data.score;
    if (this.best) this.best.textContent = data.best;
    this.setGyroPreview(data.tiltX, data.tiltY);
  }
}
