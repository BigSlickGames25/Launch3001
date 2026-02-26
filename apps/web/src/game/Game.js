import * as THREE from "three";
import { Rocket } from "./Rocket.js";
import { World } from "./World.js";
import { Physics } from "./Physics.js";
import { Input } from "./Input.js";
import { UI } from "./UI.js";
import { LEVELS } from "./Levels.js";
import { clamp, lerp, smooth } from "./utils.js";

const MAX_LEVELS = 10;

export class Game {
  constructor({ canvas }) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x05070a, 26, 180);

    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
    this._camA = new THREE.Vector3();
    this._camB = new THREE.Vector3();
    this._camC = new THREE.Vector3();
    this._camD = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();

    this.ui = new UI();
    this.input = new Input({ canvas, ui: this.ui });
    this.physics = new Physics();
    this.world = new World();
    this.rocket = new Rocket();

    this.scene.add(this.world.group);
    this.scene.add(this.rocket.group);

    this.levelIndex = 0;
    this.score = 0;
    this.best = Number(localStorage.getItem("launcher_best") || "0");

    this.state = "READY"; // READY | FLYING_SIDE | FINISH_3D | LANDED | CRASHED | LEVEL_TRANSITION
    this.sensitivityScale = 1.8;
    this.gravityScale = 1.0;

    this._finishCamBlend = 0;
    this._queuedTimer = 0;
    this._queuedAction = null;
    this._wasPaused = false;

    this._bindUI();
    this.input.setSensitivityScale(this.sensitivityScale);
    this.ui.setSensitivityScale(this.sensitivityScale);
    this.ui.setGravityScale(this.gravityScale);
    this.ui.setLevelJumpBounds(Math.min(MAX_LEVELS, LEVELS.length));

    this._resize();
    window.addEventListener("resize", () => this._resize());

    this.loadLevel(0);
  }

  _bindUI() {
    this.ui.btnMenu?.addEventListener("click", () => {
      this.ui.showPauseDrawer(!this.ui.isMenuOpen());
    });

    this.ui.btnMenuClose?.addEventListener("click", () => {
      this.ui.showPauseDrawer(false);
    });

    this.ui.btnReset?.addEventListener("click", () => {
      this.resetLevel();
      this.ui.showPauseDrawer(false);
      this._banner("READY", "info");
    });

    this.ui.btnCam?.addEventListener("click", () => {
      this._banner("AUTO CAMERA", "info");
      this.ui.showPauseDrawer(false);
    });

    this.ui.sensRange?.addEventListener("input", (e) => {
      const nextScale = clamp(Number(e.target.value) / 100, 0.25, 2.6);
      this.sensitivityScale = nextScale;
      this.input.setSensitivityScale(nextScale);
      this.ui.setSensitivityScale(nextScale);
    });

    this.ui.gravRange?.addEventListener("input", (e) => {
      const nextScale = clamp(Number(e.target.value) / 100, 0.4, 1.0);
      this.gravityScale = nextScale;
      const level = LEVELS[this.levelIndex];
      this.physics.gravity = (level?.gravity ?? 9.8) * nextScale;
      this.ui.setGravityScale(nextScale);
    });

    const loadSelectedLevel = () => {
      const maxLevel = Math.min(MAX_LEVELS, LEVELS.length);
      const raw = Number(this.ui.levelJumpInput?.value ?? (this.levelIndex + 1));
      const levelNum = clamp(Math.round(Number.isFinite(raw) ? raw : 1), 1, maxLevel);
      this.score = 0;
      this.ui.setLevelJumpValue(levelNum);
      this.loadLevel(levelNum - 1);
      this.ui.showPauseDrawer(false);
    };

    this.ui.btnGoLevel?.addEventListener("click", loadSelectedLevel);
    this.ui.levelJumpInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      loadSelectedLevel();
    });
  }

  _banner(text, mode = "info") {
    if (this.ui.setBanner) this.ui.setBanner(text, mode);
    else this.ui.setStatus(text, mode);
  }

  _queueAction(delaySeconds, fn) {
    this._queuedTimer = Math.max(0, delaySeconds || 0);
    this._queuedAction = fn || null;
  }

  _clearQueuedAction() {
    this._queuedTimer = 0;
    this._queuedAction = null;
  }

  start() {
    this._last = performance.now();
    const tick = (t) => {
      const dt = clamp((t - this._last) / 1000, 0, 0.033);
      this._last = t;
      this.update(dt);
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  loadLevel(idx) {
    const cap = Math.min(MAX_LEVELS, LEVELS.length);
    this.levelIndex = clamp(idx, 0, cap - 1);
    const level = LEVELS[this.levelIndex];

    this.physics.gravity = level.gravity * this.gravityScale;
    this.physics.wind = 0;

    this.world.applyLevel(level);
    this.resetLevel();
    this.ui.setLevelJumpValue(this.levelIndex + 1);

    this._banner(`LEVEL ${this.levelIndex + 1}`, "ok");
  }

  resetLevel() {
    this.state = "READY";
    this.rocket.reset(this.world.spawn);
    this.input.clearThrustState();
    this._finishCamBlend = 0;
    this._clearQueuedAction();
  }

  nextLevel() {
    const cap = Math.min(MAX_LEVELS, LEVELS.length);
    const next = this.levelIndex + 1;
    if (next >= cap) {
      this.state = "LEVEL_TRANSITION";
      this._banner("RUN CLEAR", "ok");
      this._queueAction(1.15, () => {
        this.score = 0;
        this.loadLevel(0);
      });
      return;
    }

    this.state = "LEVEL_TRANSITION";
    this._banner("LEVEL CLEAR", "ok");
    this._queueAction(0.95, () => this.loadLevel(next));
  }

  _isFlyingState() {
    return this.state === "FLYING_SIDE" || this.state === "FINISH_3D";
  }

  _advanceQueued(dt) {
    if (!this._queuedAction) return;
    this._queuedTimer -= dt;
    if (this._queuedTimer > 0) return;
    const fn = this._queuedAction;
    this._queuedAction = null;
    this._queuedTimer = 0;
    fn();
  }

  update(dt) {
    this.input.update(dt);

    const paused = this.ui.isMenuOpen?.() ?? false;
    if (paused !== this._wasPaused) {
      this.ui.setPauseState?.(paused);
      this._wasPaused = paused;
    }

    if (!paused) {
      this._advanceQueued(dt);

      if (this.state === "READY" && (this.input.thrustHeld || Math.abs(this.input.tilt.x) > 0.05)) {
        this.state = "FLYING_SIDE";
        this._banner("GO", "ok");
      }

      if (this._isFlyingState()) {
        this.physics.apply(this.rocket, this.input, dt);

        // Side-scroller feel: softly recenter depth so the rocket stays readable in a side view.
        const zVelDrag = Math.exp(-7.0 * dt);
        const zPosDrag = Math.exp(-3.2 * dt);
        this.rocket.vel.z *= zVelDrag;
        this.rocket.pos.z *= zPosDrag;
        this.rocket.pos.z = clamp(this.rocket.pos.z, -6, 4);

        if (this.state === "FLYING_SIDE" && this.rocket.pos.x >= this.world.finishApproachX) {
          this.state = "FINISH_3D";
          this._banner("APPROACH", "info");
        }

        const groundY = this.world.groundHeightAt(this.rocket.pos.x, this.rocket.pos.z);

        if (this.world.checkTunnelCollision(this.rocket.pos, 0.42)) {
          this.crash("CAVE WALL");
          return;
        }

        const launchPadTop = this.world.launchPadTopY();
        const onLaunchArea = this.world.isOverLaunchPad(this.rocket.pos) && (this.rocket.pos.y <= launchPadTop + 0.8);
        if (onLaunchArea && this.rocket.pos.y <= launchPadTop + 0.6) {
          this.rocket.pos.y = launchPadTop + 0.6;
          this.rocket.vel.y = Math.max(0, this.rocket.vel.y);
          this.rocket.vel.x *= 0.9;
          this.rocket.vel.z *= 0.9;
        }

        const padTop = this.world.landingPadTopY();
        const onLandingArea = this.world.isOverLandingPad(this.rocket.pos) && (this.rocket.pos.y <= padTop + 0.8);

        if (!onLandingArea && !onLaunchArea && this.rocket.pos.y <= groundY + 0.65) {
          this.crash("GROUND");
          return;
        }

        if (onLandingArea && this.rocket.pos.y <= padTop + 0.6) {
          this.tryLand();
          return;
        }
      }

      const finishTarget = (this.state === "FINISH_3D" || this.state === "LANDED" || this.state === "LEVEL_TRANSITION") ? 1 : 0;
      this._finishCamBlend = smooth(this._finishCamBlend, finishTarget, 10.5, dt);
    }

    this.world.update(dt, this.rocket.pos);
    this.rocket.updateVisuals(this.input, dt);

    const { vspd, hspd, ang } = this.rocket.getMetrics();
    const groundY = this.world.groundHeightAt(this.rocket.pos.x, this.rocket.pos.z);
    const alt = Math.max(0, this.rocket.pos.y - groundY);
    const surfaceY = Math.max(
      groundY,
      this.world.isOverLaunchPad(this.rocket.pos) ? this.world.launchPadTopY() : -Infinity,
      this.world.isOverLandingPad(this.rocket.pos) ? this.world.landingPadTopY() : -Infinity
    );

    this.rocket.updateGroundReference(surfaceY);

    this.ui.update(dt, {
      level: this.levelIndex + 1,
      score: this.score,
      best: this.best,
      alt,
      vspd,
      hspd,
      ang,
      tiltX: this.input.tilt.x,
      tiltY: this.input.tilt.y
    });
  }

  tryLand() {
    if (!this._isFlyingState()) return;

    const { vspd, hspd, ang } = this.rocket.getMetrics();
    const okV = Math.abs(vspd) <= this.physics.maxVspd;
    const okH = hspd <= this.physics.maxHspd;
    const okA = ang <= this.physics.maxAngleDeg;

    if (!okV || !okH || !okA) {
      this.crash("CRASH");
      return;
    }

    this.state = "LANDED";
    this.rocket.vel.set(0, 0, 0);
    this.rocket.pos.y = this.world.landingPadTopY() + 0.6;
    this.rocket.pos.z = smooth(this.rocket.pos.z, this.world.landingPad.position.z, 8, 1 / 60);

    const bonus = Math.max(0, Math.round(100 - (hspd * 8 + Math.abs(vspd) * 6 + ang * 2)));
    this.score += 100 + bonus;

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem("launcher_best", String(this.best));
    }

    this.nextLevel();
  }

  crash(msg = "CRASH") {
    if (!this._isFlyingState()) return;
    this.state = "CRASHED";
    this._banner(msg, "warn");
    this._queueAction(0.95, () => {
      this.score = 0;
      this.loadLevel(0);
    });
  }

  render() {
    const p = this.rocket.pos;
    const level = LEVELS[this.levelIndex] || LEVELS[0];
    const camCfg = level?.camera || {};

    const routeSpan = Math.max(18, this.world.routeEndX - this.world.routeStartX);
    const distToFinish = Math.max(0, this.world.routeEndX - p.x);
    const finishDistNorm = clamp(distToFinish / routeSpan, 0, 1);
    const speedZoom = clamp(this.rocket.vel.length() / 10, 0, 1);
    const forwardSpeed = Math.max(0, this.rocket.vel.x);
    const openZoom = this.world.openSpaceFactorAt ? this.world.openSpaceFactorAt(p.x) : 0;
    const zoom = clamp(Math.max(speedZoom * 0.75, finishDistNorm * 0.55, openZoom * 0.45), 0, 1);
    const lookAhead = clamp(4.2 + forwardSpeed * 0.8 + zoom * 3.0, 4.2, 12.5);

    // Pull back the gameplay camera and bias the target forward so more route is visible.
    const sideDepth = (camCfg.gameplayDepth ?? 7.2) + 2.0 + zoom * 8.2;
    const sideHeight = (camCfg.gameplayHeight ?? 2.1) + 0.7 + zoom * 3.4;
    const sideFov = lerp((camCfg.minFov ?? 48) + 2, (camCfg.maxFov ?? 60) + 6, zoom);

    this._camA.set(p.x - lookAhead * 0.2, p.y + sideHeight, p.z + sideDepth);
    this._camB.set(p.x + lookAhead, p.y + 0.82, p.z);

    const padPos = this.world.landingPad.position;
    const padTop = this.world.landingPadTopY();
    const finishSide = camCfg.finishSide ?? 6.8;
    const finishDepth = camCfg.finishDepth ?? 10.5;
    const finishHeight = camCfg.finishHeight ?? 5.4;
    const finishFov = camCfg.finishFov ?? 58;

    this._camC.set(
      lerp(p.x, padPos.x - finishSide, 0.68),
      Math.max(p.y + 3.0, padTop + finishHeight),
      lerp(p.z + finishDepth, padPos.z + finishDepth * 0.85, 0.35)
    );
    this._camD.set(
      lerp(p.x, padPos.x, 0.58),
      lerp(p.y + 0.8, padTop + 0.75, 0.72),
      lerp(p.z, padPos.z, 0.62)
    );

    this._camPos.copy(this._camA).lerp(this._camC, this._finishCamBlend);
    this._camTarget.copy(this._camB).lerp(this._camD, this._finishCamBlend);

    this.camera.position.lerp(this._camPos, 0.18);
    this.camera.lookAt(this._camTarget.x, this._camTarget.y, this._camTarget.z);
    this.camera.fov = lerp(sideFov, finishFov, this._finishCamBlend);
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
