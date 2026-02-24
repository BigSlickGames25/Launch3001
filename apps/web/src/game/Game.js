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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

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
    this.sensitivityScale = 1.8;
    this.gravityScale = 1.0;
    this._ceilingWarnCooldown = 0;
    this.singleRunLevel = {
      ...LEVELS[0],
      // Single-course side scroller mode: no wind and a longer straight route.
      wind: 0,
      routeLength: 72,
      terrainAmp: 0,
      terrainRidge: 0,
      terrainDetail: 0,
      craterCount: 0,
      mountainCount: 0,
      chasmCount: 0,
      centerSpireCount: 0,
      tunnelGateCount: 0
    };

    this._bindUI();
    this.input.setSensitivityScale(this.sensitivityScale);
    this.ui.setSensitivityScale(this.sensitivityScale);
    this.ui.setGravityScale(this.gravityScale);
    this.ui.setLevelJumpBounds(1);
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this.loadLevel(0);
  }

  _bindUI() {
    this.ui.btnMenu.addEventListener("click", () => this.ui.toggleMenu());
    this.ui.btnMenuClose.addEventListener("click", () => this.ui.toggleMenu(false));

    this.ui.btnReset.addEventListener("click", () => {
      this.resetLevel();
      this.ui.toggleMenu(false);
    });
    this.ui.btnCam.addEventListener("click", () => {
      this.ui.setStatus("AUTO CAMERA", "ok");
      this.ui.toggleMenu(false);
    });

    this.ui.sensRange.addEventListener("input", (e) => {
      const nextScale = clamp(Number(e.target.value) / 100, 0.25, 2.6);
      this.sensitivityScale = nextScale;
      this.input.setSensitivityScale(nextScale);
      this.ui.setSensitivityScale(nextScale);
    });

    this.ui.gravRange.addEventListener("input", (e) => {
      const nextScale = clamp(Number(e.target.value) / 100, 0.4, 1.0);
      this.gravityScale = nextScale;
      this.physics.gravity = this.singleRunLevel.gravity * nextScale;
      this.ui.setGravityScale(nextScale);
    });

    const loadSelectedLevel = () => {
      const maxLevel = 1;
      const raw = Number(this.ui.levelJumpInput?.value ?? (this.levelIndex + 1));
      const levelNum = clamp(Math.round(Number.isFinite(raw) ? raw : 1), 1, maxLevel);
      this.score = 0;
      this.ui.setLevelJumpValue(levelNum);
      this.loadLevel(levelNum - 1);
      this.ui.toggleMenu(false);
    };

    this.ui.btnGoLevel?.addEventListener("click", loadSelectedLevel);
    this.ui.levelJumpInput?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      loadSelectedLevel();
    });
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
    this.levelIndex = 0;
    const level = this.singleRunLevel;

    this.physics.gravity = level.gravity * this.gravityScale;
    this.physics.wind = 0;

    this.world.applyLevel(level);
    this.resetLevel();
    this.ui.setLevelJumpValue(1);

    this.ui.setStatus("RUN START", "ok");
  }

  resetLevel() {
    this.state = "READY";
    this.camMode = "CHASE";
    this.rocket.reset(this.world.spawn);
    this.input.clearThrustState();
    this._ceilingWarnCooldown = 0;
  }

  nextLevel() {
    this.ui.setStatus("COURSE CLEAR", "ok");
    setTimeout(() => this.resetLevel(), 900);
  }

  update(dt) {
    this.input.update(dt);

    if (this.state === "READY" && (this.input.thrustHeld || Math.abs(this.input.tilt.x) > 0.05)) {
      this.state = "FLYING";
      this.ui.setStatus("GO!", "ok");
    }

    if (this.state === "FLYING") {
      this.physics.apply(this.rocket, this.input, dt);

      const tookOff =
        this.rocket.pos.y > this.world.launchPadTopY() + 1.05 ||
        this.rocket.pos.x > this.world.spawn.x + 1.4;
      if (tookOff && this.camMode !== "SIDE") {
        this.camMode = "SIDE";
      }

      const groundY = this.world.groundHeightAt(this.rocket.pos.x, this.rocket.pos.z);

      if (this.world.checkTunnelCollision(this.rocket.pos, 0.42)) {
        this.crash("TUNNEL HIT");
        return;
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
    this.camMode = "CHASE";
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
    setTimeout(() => {
      this.score = 0;
      this.loadLevel(0);
    }, 900);
  }

  render() {
    const p = this.rocket.pos;

    if (this.camMode !== "SIDE") {
      const climb = Math.max(0, p.y - (this.world.launchPadTopY() + 0.6));
      const routeSpan = Math.max(16, Math.abs(this.world.landingPad.position.x - this.world.spawn.x));
      const distToPad = Math.abs(this.world.landingPad.position.x - p.x);
      const padZoom = clamp(distToPad / routeSpan, 0, 1);
      const zoomOut = Math.max(clamp(climb / 12, 0, 1.0), padZoom * 0.5);

      const side = 6 + zoomOut * 3;
      const up = 4.5 + zoomOut * 7.5;
      const back = 10 + zoomOut * 15;

      this._camA.set(p.x - side, p.y + up, p.z + back);
      this.camera.position.lerp(this._camA, 0.12);

      // Keep the rocket centered in frame for start/end 3D views.
      this._camB.set(p.x, p.y + 0.95, p.z);
      this.camera.lookAt(this._camB.x, this._camB.y, this._camB.z);

      this.camera.fov = 62 + zoomOut * 12;
      this.camera.updateProjectionMatrix();
    } else {
      const routeSpan = Math.max(16, Math.abs(this.world.landingPad.position.x - this.world.spawn.x));
      const distToPad = Math.abs(this.world.landingPad.position.x - p.x);
      const padZoom = clamp(distToPad / routeSpan, 0, 1);
      const speed = this.rocket.vel.length();
      const speedZoom = clamp(speed / 10, 0, 1);
      const zoom = Math.max(padZoom * 0.7, speedZoom * 0.6);
      const camHeight = 1.9 + zoom * 2.6;
      const camDepth = 7.2 + zoom * 6.2;

      // Side-scroller framing: keep the rocket centered and zoom out with route distance.
      this._camA.set(p.x, p.y + camHeight, p.z + camDepth);
      this.camera.position.lerp(this._camA, 0.14);
      this._camB.set(p.x, p.y + 0.85, p.z);
      this.camera.lookAt(this._camB.x, this._camB.y, this._camB.z);
      this.camera.fov = 50 + zoom * 10;
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
