import * as THREE from "three";
import { Rocket } from "./Rocket.js";
import { World } from "./World.js";
import { Physics } from "./Physics.js";
import { Input } from "./Input.js";
import { UI } from "./UI.js";
import { LEVELS } from "./Levels.js";
import { clamp } from "./utils.js";

export class Game {
  constructor({ canvas }) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x05060a, 12, 90);

    this.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    this.camMode = "CHASE";
    this._camA = new THREE.Vector3();
    this._camB = new THREE.Vector3();

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
    this.state = "READY";
    this.sensitivityScale = 1.0;
    this.gravityScale = 1.0;

    this._bindUI();
    this.input.setSensitivityScale(this.sensitivityScale);
    this.ui.setSensitivityScale(this.sensitivityScale);
    this.ui.setGravityScale(this.gravityScale);
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this.loadLevel(0);
  }

  _bindUI() {
    this.ui.btnReset.addEventListener("click", () => this.resetLevel());
    this.ui.btnCam.addEventListener("click", () => {
      this.camMode = (this.camMode === "CHASE") ? "COCKPIT" : "CHASE";
      this.ui.btnCam.textContent = `Cam: ${this.camMode === "CHASE" ? "Chase" : "Cockpit"}`;
      this.ui.setStatus(`CAM ${this.camMode}`, "ok");
    });
    this.ui.btnSens.addEventListener("click", () => this._cycleSensitivityDown());
    this.ui.btnGrav.addEventListener("click", () => this._cycleGravityDown());
  }

  _nextStepDown(current) {
    const steps = [1.0, 0.85, 0.7, 0.55, 0.4];
    const idx = steps.findIndex((v) => Math.abs(v - current) < 0.001);
    if (idx < 0) return steps[1];
    return steps[(idx + 1) % steps.length];
  }

  _cycleSensitivityDown() {
    this.sensitivityScale = this._nextStepDown(this.sensitivityScale);
    this.input.setSensitivityScale(this.sensitivityScale);
    this.ui.setSensitivityScale(this.sensitivityScale);
    this.ui.setStatus(`SENS ${Math.round(this.sensitivityScale * 100)}%`, "ok");
  }

  _cycleGravityDown() {
    this.gravityScale = this._nextStepDown(this.gravityScale);
    this.physics.gravity = LEVELS[this.levelIndex].gravity * this.gravityScale;
    this.ui.setGravityScale(this.gravityScale);
    this.ui.setStatus(`GRAV ${Math.round(this.gravityScale * 100)}%`, "ok");
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
    this.levelIndex = clamp(idx, 0, LEVELS.length - 1);
    const level = LEVELS[this.levelIndex];

    this.physics.gravity = level.gravity * this.gravityScale;
    this.physics.wind = level.wind;

    this.world.applyLevel(level);
    this.resetLevel();

    this.ui.setStatus(`LEVEL ${this.levelIndex + 1}`, "ok");
  }

  resetLevel() {
    this.state = "READY";
    this.rocket.reset(this.world.spawn);
    this.input.clearThrustState();
  }

  nextLevel() {
    const next = this.levelIndex + 1;
    if (next >= LEVELS.length) {
      this.ui.setStatus("YOU BEAT THE DEMO 😈", "ok");
      return;
    }
    this.loadLevel(next);
  }

  update(dt) {
    this.input.update(dt);

    if (this.state === "READY" && (this.input.thrustHeld || Math.abs(this.input.tilt.x) > 0.05)) {
      this.state = "FLYING";
      this.ui.setStatus("GO!", "ok");
    }

    if (this.state === "FLYING") {
      this.physics.apply(this.rocket, this.input, dt);

      const groundY = this.world.groundHeightAt(this.rocket.pos.x, this.rocket.pos.z);

      if (this.world.checkRoofCollision(this.rocket.pos)) {
        this.crash("ROOF HIT");
      }

      const launchPadTop = this.world.launchPadTopY();
      const onLaunchArea = this.world.isOverLaunchPad(this.rocket.pos) && (this.rocket.pos.y <= launchPadTop + 0.7);
      if (onLaunchArea && this.rocket.pos.y <= launchPadTop + 0.6) {
        this.rocket.pos.y = launchPadTop + 0.6;
        this.rocket.vel.y = Math.max(0, this.rocket.vel.y);
        this.rocket.vel.x *= 0.9;
        this.rocket.vel.z *= 0.9;
      }

      const padTop = this.world.landingPadTopY();
      const onLandingArea = this.world.isOverLandingPad(this.rocket.pos) && (this.rocket.pos.y <= padTop + 0.7);

      if (!onLandingArea && !onLaunchArea && this.rocket.pos.y <= groundY + 0.65) {
        this.crash("TERRAIN HIT");
      }

      if (onLandingArea && this.rocket.pos.y <= padTop + 0.6) {
        this.tryLand();
      }
    }

    this.world.update(dt, this.rocket.pos);
    this.rocket.updateVisuals(this.input, dt);

    const { vspd, hspd, ang } = this.rocket.getMetrics();
    const groundY = this.world.groundHeightAt(this.rocket.pos.x, this.rocket.pos.z);
    const alt = Math.max(0, this.rocket.pos.y - groundY);

    this.ui.update(dt, {
      level: this.levelIndex + 1,
      score: this.score,
      best: this.best,
      alt,
      vspd,
      hspd,
      ang
    });
  }

  tryLand() {
    const { vspd, hspd, ang } = this.rocket.getMetrics();

    const okV = Math.abs(vspd) <= this.physics.maxVspd;
    const okH = hspd <= this.physics.maxHspd;
    const okA = ang <= this.physics.maxAngleDeg;

    if (!okV || !okH || !okA) {
      const reason = !okV ? `TOO FAST VSPD ${vspd.toFixed(1)}` :
                     !okH ? `TOO FAST HSPD ${hspd.toFixed(1)}` :
                     `BAD ANGLE ${Math.round(ang)}°`;
      this.crash(`CRASH: ${reason}`);
      return;
    }

    this.state = "LANDED";
    this.rocket.vel.set(0, 0, 0);
    this.rocket.pos.y = this.world.landingPadTopY() + 0.6;

    const bonus = Math.max(0, Math.round(100 - (hspd * 8 + Math.abs(vspd) * 6 + ang * 2)));
    this.score += 100 + bonus;

    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem("launcher_best", String(this.best));
    }

    this.ui.setStatus(`LANDED +${100 + bonus}`, "ok");
    setTimeout(() => this.nextLevel(), 900);
  }

  crash(msg) {
    if (this.state !== "FLYING") return;
    this.state = "CRASHED";
    this.ui.setStatus(msg, "warn");
    setTimeout(() => this.resetLevel(), 900);
  }

  render() {
    const p = this.rocket.pos;

    if (this.camMode === "CHASE") {
      const climb = Math.max(0, p.y - (this.world.launchPadTopY() + 0.6));
      const zoomOut = clamp(climb / 12, 0, 1.4);

      const side = 6 + zoomOut * 3;
      const up = 4.5 + zoomOut * 7.5;
      const back = 10 + zoomOut * 15;

      this._camA.set(p.x - side, p.y + up, p.z + back);
      this.camera.position.lerp(this._camA, 0.12);

      const padFocus = this.world.landingPadAimPoint(this._camA);
      this._camB.set(p.x + 2, p.y + 1.2, p.z);
      this._camB.lerp(padFocus, clamp(zoomOut * 0.62, 0, 0.62));
      this.camera.lookAt(this._camB.x, this._camB.y, this._camB.z);

      this.camera.fov = 65 + zoomOut * 17;
      this.camera.updateProjectionMatrix();
    } else {
      this._camA.set(p.x, p.y + 1.2, p.z + 1.8);
      this.camera.position.lerp(this._camA, 0.18);
      this.camera.lookAt(p.x + 3.5, p.y + 1.0, p.z);
      this.camera.fov = 80;
      this.camera.updateProjectionMatrix();
    }

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
