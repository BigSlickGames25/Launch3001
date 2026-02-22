import * as THREE from "three";

export class World {
  constructor() {
    this.group = new THREE.Group();

    const hemi = new THREE.HemisphereLight(0x88ffff, 0x110022, 0.8);
    this.group.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 2);
    this.group.add(dir);

    this.terrain = this._createTerrain();
    this.group.add(this.terrain);

    this.launchPad = this._createPad(0x00ffff);
    this.launchPad.position.set(-10, 0.5, 0);
    this.group.add(this.launchPad);

    this.landingPad = this._createPad(0x00ff88);
    this.landingPad.position.set(12, 0.5, 0);
    this.group.add(this.landingPad);

    this.roof = this._createRoof();
    this.roof.visible = false;
    this.group.add(this.roof);

    this.spawn = new THREE.Vector3(-10, 2.0, 0);
    this.padHalf = 1.5;
  }

  _createTerrain() {
    const geom = new THREE.PlaneGeometry(80, 40, 80, 40);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.18) * 0.5 + Math.cos(z * 0.22) * 0.35;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x05060a,
      emissive: 0x001018,
      metalness: 0.2,
      roughness: 0.9,
      wireframe: true
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0;
    return mesh;
  }

  _createPad(color) {
    const g = new THREE.BoxGeometry(3, 1, 3);
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.2 });
    return new THREE.Mesh(g, m);
  }

  _createRoof() {
    const g = new THREE.BoxGeometry(20, 1, 18);
    const m = new THREE.MeshStandardMaterial({ color: 0x9900ff, emissive: 0x220022, emissiveIntensity: 0.2, transparent: true, opacity: 0.35 });
    const roof = new THREE.Mesh(g, m);
    roof.position.set(2, 7.0, 0);
    return roof;
  }

  applyLevel(level) {
    const size = level.padSize ?? 3.0;
    this.launchPad.scale.set(size / 3, 1, size / 3);
    this.landingPad.scale.set(size / 3, 1, size / 3);
    this.padHalf = (size / 2);
    this.roof.visible = !!level.roof;
  }

  groundHeightAt(x, z) {
    return Math.sin(x * 0.18) * 0.5 + Math.cos(z * 0.22) * 0.35;
  }

  checkRoofCollision(pos) {
    if (!this.roof.visible) return false;
    const half = { x: 10, y: 0.5, z: 9 };
    const c = this.roof.position;
    return (
      Math.abs(pos.x - c.x) < half.x &&
      Math.abs(pos.y - c.y) < half.y &&
      Math.abs(pos.z - c.z) < half.z
    );
  }

  isOverLandingPad(pos) {
    const c = this.landingPad.position;
    return Math.abs(pos.x - c.x) <= this.padHalf && Math.abs(pos.z - c.z) <= this.padHalf;
  }

  landingPadTopY() {
    return this.landingPad.position.y + 0.5;
  }
}
