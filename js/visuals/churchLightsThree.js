import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js';

// Real pillar x-positions as fraction of plane width (measured from church1.jpg)
const PILLARS_LEFT  = [0.06, 0.23];
const PILLARS_RIGHT = [0.94, 0.77];
const WINDOW_X = 0.51;
const WINDOW_Y = 0.46;

const COLORS = {
  yellow: 0xffcc66,
  purple: 0xa64aff,
  pink:   0xff4fa8,
  blue:   0x3fb8ff,
};

export class ChurchLightsThree {
  constructor(canvas, imageSrc) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 6);

    // ── background photo plane (darkened church) ──────────────────────────────
    const loader = new THREE.TextureLoader();
    this.bgTexture = loader.load(imageSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this._fitBackgroundPlane();
    });
    this.bgMat = new THREE.MeshBasicMaterial({ map: this.bgTexture, color: 0x1a1a1a }); // darken via tint
    this.bgGeo = new THREE.PlaneGeometry(10, 10);
    this.bgPlane = new THREE.Mesh(this.bgGeo, this.bgMat);
    this.bgPlane.position.z = -2;
    this.scene.add(this.bgPlane);

    // ── ambient fill so the dark church isn't pure black ──────────────────────
    this.scene.add(new THREE.AmbientLight(0x0a0a0c, 0.6));

    // ── volumetric-style fog for depth ─────────────────────────────────────────
    this.scene.fog = new THREE.FogExp2(0x000000, 0.04);

    // ── emissive pillar light columns ──────────────────────────────────────────
    this.pillars = {};
    this._buildPillars('left', PILLARS_LEFT);
    this._buildPillars('right', PILLARS_RIGHT);

    // ── window / center glow ────────────────────────────────────────────────────
    this._buildWindowGlow();

    // ── point lights for real GI-ish bounce onto the bg plane ─────────────────
    this.pointLights = {
      left: new THREE.PointLight(COLORS.yellow, 0, 8, 2),
      right: new THREE.PointLight(COLORS.yellow, 0, 8, 2),
      purple: new THREE.PointLight(COLORS.purple, 0, 10, 2),
      blue: new THREE.PointLight(COLORS.blue, 0, 10, 2),
    };
    this.pointLights.left.position.set(-3.2, -1, 1);
    this.pointLights.right.position.set(3.2, -1, 1);
    this.pointLights.purple.position.set(0, -1.5, 2);
    this.pointLights.blue.position.set(0, 0.5, 1.5);
    Object.values(this.pointLights).forEach(l => this.scene.add(l));

    // ── post-processing: bloom ──────────────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.4, 0.6, 0.1);
    this.composer.addPass(this.bloomPass);

    this.state = {
      rightYellow: false,
      leftYellow: false,
      flicker: false,
      flickerOn: false,
      flickerT: 0,
      purpleActive: false,
      purpleColor: 'purple',
      blueActive: false,
    };

    this.t = 0;
    this.climbT = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _buildPillars(side, fracs) {
    this.pillars[side] = fracs.map((frac, i) => {
      const x = (frac - 0.5) * 9.5; // map fraction across plane width
      const height = 5;
      const radius = i === 0 ? 0.09 : 0.05;
      const geo = new THREE.CylinderGeometry(radius, radius, height, 16, 1, true);
      const mat = new THREE.MeshStandardMaterial({
        emissive: 0x000000,
        emissiveIntensity: 0,
        color: 0x050505,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, -0.2, i === 0 ? 1.2 : 0.2);
      mesh.scale.y = 0.001; // start invisible (climbing animation)
      mesh.userData = { baseX: x, baseZ: mesh.position.z, maxHeight: height, delay: i * 0.18 };
      this.scene.add(mesh);
      return mesh;
    });
  }

  _buildWindowGlow() {
    const x = (WINDOW_X - 0.5) * 9.5;
    const y = (0.5 - WINDOW_Y) * 6;
    const geo = new THREE.PlaneGeometry(2.4, 3.2);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.blue,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.windowMesh = new THREE.Mesh(geo, mat);
    this.windowMesh.position.set(x, y, -0.5);
    this.scene.add(this.windowMesh);
  }

  _fitBackgroundPlane() {
    const tex = this.bgTexture;
    if (!tex.image) return;
    const imgRatio = tex.image.width / tex.image.height;
    this.bgPlane.scale.set(imgRatio > 1 ? 10 * imgRatio / 10 * 10 / 10 : 10, 10, 1);
    // simple cover-fit approximation
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1;
    if (imgRatio > aspect) {
      this.bgPlane.scale.set(10 * (imgRatio / aspect), 10, 1);
    } else {
      this.bgPlane.scale.set(10, 10 * (aspect / imgRatio), 1);
    }
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fitBackgroundPlane();
  }

  update() {
    this.t += 0.016;
    this.climbT = (this.climbT + 0.012) % 1;

    if (this.state.flicker) {
      this.state.flickerT += 0.016;
      if (this.state.flickerT > 0.13) {
        this.state.flickerT = 0;
        this.state.flickerOn = !this.state.flickerOn;
      }
    }

    const yellowRightOn = this.state.rightYellow || (this.state.flicker && this.state.flickerOn);
    const yellowLeftOn  = this.state.leftYellow  || (this.state.flicker && this.state.flickerOn);

    this.pointLights.right.intensity = yellowRightOn ? 6 + Math.sin(this.t*8)*0.6 : THREE.MathUtils.lerp(this.pointLights.right.intensity, 0, 0.2);
    this.pointLights.left.intensity  = yellowLeftOn  ? 6 + Math.sin(this.t*8)*0.6 : THREE.MathUtils.lerp(this.pointLights.left.intensity, 0, 0.2);

    // pillar climb animation + emissive intensity
    ['left','right'].forEach(side => {
      this.pillars[side].forEach((mesh) => {
        const target = this.state.purpleActive ? 1 : 0;
        const localT = Math.max(0, Math.min(1, ((this.climbT - mesh.userData.delay) % 1) * 1.4));
        const targetScale = this.state.purpleActive ? (0.15 + localT * 0.85) : 0.001;
        mesh.scale.y += (targetScale - mesh.scale.y) * 0.15;
        mesh.position.y = -0.2 + (mesh.scale.y * mesh.userData.maxHeight)/2 - mesh.userData.maxHeight/2 * 0.001;

        const colorHex = this.state.purpleColor === 'pink' ? COLORS.pink : COLORS.purple;
        mesh.material.emissive.setHex(colorHex);
        mesh.material.emissiveIntensity += ((this.state.purpleActive ? 3.5 : 0) - mesh.material.emissiveIntensity) * 0.2;
        mesh.material.color.setHex(colorHex);
      });
    });

    const purpleColorHex = this.state.purpleColor === 'pink' ? COLORS.pink : COLORS.purple;
    this.pointLights.purple.color.setHex(purpleColorHex);
    this.pointLights.purple.intensity += ((this.state.purpleActive ? 4 : 0) - this.pointLights.purple.intensity) * 0.15;

    this.pointLights.blue.intensity += ((this.state.blueActive ? 4.5 : 0) - this.pointLights.blue.intensity) * 0.15;
    this.windowMesh.material.opacity += ((this.state.blueActive ? 0.55 : 0) - this.windowMesh.material.opacity) * 0.15;

    // subtle bg darken tint pulsing slightly for atmosphere
    this.bgMat.color.setRGB(0.08,0.08,0.08);
  }

  render() {
    this.composer.render();
  }
}
