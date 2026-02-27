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
    this.renderer.toneMappingExposure = 1.95;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x25313d, 92, 420);

    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
    this._camA = new THREE.Vector3();
    this._camB = new THREE.Vector3();
    this._camC = new THREE.Vector3();
    this._camD = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this._camLookAt = new THREE.Vector3();

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
    this.sensitivityScale = 1.2;
    this.gravityScale = 1.0;

    this._finishCamBlend = 0;
    this._camLookAheadSm = 9;
    this._camSideDepthSm = 12;
    this._camSideHeightSm = 4;
    this._camFovSm = 60;
    this._camSideZSm = 0;
    this._camTargetZSm = 0;
    this._frameDt = 1 / 60;
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
    this._camLookAheadSm = 9;
    this._camSideZSm = 0;
    this._camTargetZSm = 0;
    this._camLookAt.set(this.rocket.pos.x + 8, this.rocket.pos.y + 0.8, 0);
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
    this._frameDt = dt;
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

        // Keep depth tightly centered so motion reads as a side scroller.
        const forwardNorm = clamp(Math.max(0, this.rocket.vel.x) / 12, 0, 1);
        const zVelDrag = Math.exp(-(10.5 + forwardNorm * 7.5) * dt);
        const zPosDrag = Math.exp(-(5.8 + forwardNorm * 6.5) * dt);
        this.rocket.vel.z *= zVelDrag;
        this.rocket.pos.z *= zPosDrag;
        this.rocket.pos.z = clamp(this.rocket.pos.z, -2.6, 2.0);

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
      this._finishCamBlend = smooth(this._finishCamBlend, finishTarget, 4.4, dt);
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
    const camDt = clamp(this._frameDt || (1 / 60), 1 / 240, 1 / 20);
    const p = this.rocket.pos;
    const level = LEVELS[this.levelIndex] || LEVELS[0];
    const camCfg = level?.camera || {};

    const forwardSpeed = Math.max(0, this.rocket.vel.x);
    const speedZoom = clamp(forwardSpeed / 12, 0, 1);
    const cruiseZoom = clamp(forwardSpeed / 15, 0, 1);
    const openZoom = this.world.openSpaceFactorAt ? this.world.openSpaceFactorAt(p.x) : 0;
    const zoomTarget = clamp(Math.max(speedZoom * 0.9, cruiseZoom * 0.75, openZoom * 0.5), 0, 1);
    const lookAheadTarget = clamp(8 + forwardSpeed * 0.9 + zoomTarget * 5.0, 8, 20);
    const sideDepthTarget = (camCfg.gameplayDepth ?? 7.2) + 5.6 + zoomTarget * 6.2 + cruiseZoom * 2.0;
    const sideHeightTarget = (camCfg.gameplayHeight ?? 2.1) + 1.6 + zoomTarget * 2.2;
    const sideFovTarget = lerp((camCfg.minFov ?? 48) + 8, (camCfg.maxFov ?? 60) + 8, zoomTarget);
    const sideZTarget = p.z * 0.12;
    const targetZTarget = p.z * 0.05;

    // Smooth the gameplay camera tuning to avoid speed/FOV pumping nausea.
    this._camLookAheadSm = smooth(this._camLookAheadSm, lookAheadTarget, 5.4, camDt);
    this._camSideDepthSm = smooth(this._camSideDepthSm, sideDepthTarget, 4.8, camDt);
    this._camSideHeightSm = smooth(this._camSideHeightSm, sideHeightTarget, 5.2, camDt);
    this._camFovSm = smooth(this._camFovSm, sideFovTarget, 5.6, camDt);
    this._camSideZSm = smooth(this._camSideZSm, sideZTarget, 8.5, camDt);
    this._camTargetZSm = smooth(this._camTargetZSm, targetZTarget, 9.2, camDt);

    this._camA.set(
      p.x - this._camLookAheadSm * 0.26,
      p.y + this._camSideHeightSm,
      this._camSideZSm + this._camSideDepthSm
    );
    this._camB.set(p.x + this._camLookAheadSm * 0.88, p.y + 0.8, this._camTargetZSm);

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

    const camPosRate = lerp(5.2, 8.2, this._finishCamBlend);
    const lookRate = lerp(7.0, 10.0, this._finishCamBlend);
    this.camera.position.set(
      smooth(this.camera.position.x, this._camPos.x, camPosRate, camDt),
      smooth(this.camera.position.y, this._camPos.y, camPosRate, camDt),
      smooth(this.camera.position.z, this._camPos.z, camPosRate, camDt)
    );
    this._camLookAt.set(
      smooth(this._camLookAt.x, this._camTarget.x, lookRate, camDt),
      smooth(this._camLookAt.y, this._camTarget.y, lookRate, camDt),
      smooth(this._camLookAt.z, this._camTarget.z, lookRate, camDt)
    );
    this.camera.lookAt(this._camLookAt.x, this._camLookAt.y, this._camLookAt.z);
    this.camera.fov = smooth(this.camera.fov, lerp(this._camFovSm, finishFov, this._finishCamBlend), 6.4, camDt);
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
