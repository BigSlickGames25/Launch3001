export class UI {
  constructor() {
    this.lvl = document.getElementById("lvl");
    this.score = document.getElementById("score");
    this.best = document.getElementById("best");

    this.alt = document.getElementById("alt");
    this.vspd = document.getElementById("vspd");
    this.hspd = document.getElementById("hspd");
    this.ang = document.getElementById("ang");

    this.status = document.getElementById("status");

    this.settingsMenu = document.getElementById("settingsMenu");
    this.btnMenu = document.getElementById("btnMenu");
    this.btnMenuClose = document.getElementById("btnMenuClose");
    this.btnMotion = document.getElementById("btnMotion");
    this.btnCal = document.getElementById("btnCal");
    this.btnSens = document.getElementById("btnSens");
    this.btnGrav = document.getElementById("btnGrav");
    this.btnCam = document.getElementById("btnCam");
    this.btnReset = document.getElementById("btnReset");

    this._statusTimer = 0;
    this._statusBase = "READY";
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
    this.btnSens.textContent = `Sensitivity: ${Math.round(scale * 100)}%`;
  }

  setGravityScale(scale) {
    this.btnGrav.textContent = `Gravity: ${Math.round(scale * 100)}%`;
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

    this.alt.textContent = data.alt.toFixed(1);
    this.vspd.textContent = data.vspd.toFixed(1);
    this.hspd.textContent = data.hspd.toFixed(1);
    this.ang.textContent = String(Math.round(data.ang));
  }
}
