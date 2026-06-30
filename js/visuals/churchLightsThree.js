import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Real positions as fraction of image (measured from church1.jpg)
const PILLARS_LEFT  = [0.06, 0.23];
const PILLARS_RIGHT = [0.94, 0.77];
const WINDOW_ZONE = { x0: 0.38, x1: 0.64, y0: 0.30, y1: 0.66 };

const COLORS = {
  yellow: '#ffcc66',
  purple: '#a64aff',
  pink:   '#ff4fa8',
  blue:   '#3fb8ff',
};

function makeRadialTexture(colorHex, soft = true) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, colorHex + 'ff');
  grad.addColorStop(soft ? 0.35 : 0.6, colorHex + 'aa');
  grad.addColorStop(1, colorHex + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBeamTexture(colorHex) {
  const w = 64, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, colorHex + 'ff');
  grad.addColorStop(0.7, colorHex + '88');
  grad.addColorStop(1, colorHex + '00');
  const hgrad = ctx.createLinearGradient(0, 0, w, 0);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // horizontal falloff for cylinder look
  ctx.globalCompositeOperation = 'destination-in';
  const hg = ctx.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.5, 'rgba(0,0,0,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class ChurchLightsThree {
  constructor(canvas, imageSrc) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // orthographic camera — pixel-accurate, no perspective distortion
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.camera.position.z = 10;

    this.planeW = 2; // world units, matches ortho frustum width baseline
    this.planeH = 2;

    // ── background photo plane ──────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();
    this.imgLoaded = false;
    this.bgTexture = loader.load(imageSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.imgAspect = tex.image.width / tex.image.height;
      this.imgLoaded = true;
      this.resize();
    });
    // moderate darken only — keep the photo readable as a dark church, not crushed black
    this.bgMat = new THREE.MeshBasicMaterial({ map: this.bgTexture, color: new THREE.Color(0.32, 0.32, 0.32) });
    this.bgGeo = new THREE.PlaneGeometry(1, 1);
    this.bgPlane = new THREE.Mesh(this.bgGeo, this.bgMat);
    this.bgPlane.position.z = 0;
    this.scene.add(this.bgPlane);

    // light group sits slightly in front of the photo
    this.lightGroup = new THREE.Group();
    this.lightGroup.position.z = 0.5;
    this.scene.add(this.lightGroup);

    // ── window glow sprite ──────────────────────────────────────────────────────
    this.windowTex = makeRadialTexture(COLORS.blue);
    this.windowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.windowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.lightGroup.add(this.windowSprite);

    // ── yellow window-beam sprites (left/right) ──────────────────────────────────
    this.yellowTexBeam = makeBeamTexture(COLORS.yellow);
    this.yellowLeft = this._makeBeamSprite(this.yellowTexBeam);
    this.yellowRight = this._makeBeamSprite(this.yellowTexBeam);
    this.lightGroup.add(this.yellowLeft, this.yellowRight);

    // ── pillar climbing light beams ───────────────────────────────────────────────
    this.purpleTex = makeBeamTexture(COLORS.purple);
    this.pinkTex = makeBeamTexture(COLORS.pink);
    this.pillars = { left: [], right: [] };
    PILLARS_LEFT.forEach((frac, i) => this.pillars.left.push(this._makePillarSprite(frac, i)));
    PILLARS_RIGHT.forEach((frac, i) => this.pillars.right.push(this._makePillarSprite(frac, i)));

    // floor pool glow sprites for pillars
    this.pillarPools = { left: [], right: [] };
    PILLARS_LEFT.forEach(() => this.pillarPools.left.push(this._makePoolSprite(COLORS.purple)));
    PILLARS_RIGHT.forEach(() => this.pillarPools.right.push(this._makePoolSprite(COLORS.purple)));

    // ── post-processing: real bloom ─────────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.1, 0.55, 0.15);
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

  _makeBeamSprite(tex) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    return sprite;
  }

  _makePillarSprite(frac, index) {
    const tex = COLORS.purple; // placeholder, texture assigned in update based on color
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.purpleTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sprite.userData = { frac, delay: index * 0.18, isNear: index === 0 };
    this.lightGroup.add(sprite);
    return sprite;
  }

  _makePoolSprite(colorHex) {
    const tex = makeRadialTexture(colorHex, false);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.lightGroup.add(sprite);
    return sprite;
  }

  // convert image-fraction coords to world space, accounting for cover-fit
  _fracToWorld(fx, fy) {
    // world space: bgPlane spans [-coverW/2, coverW/2] x [-coverH/2, coverH/2]
    const x = (fx - 0.5) * this.coverW;
    const y = (0.5 - fy) * this.coverH;
    return { x, y };
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);

    const aspect = w / h;
    this.camera.left = -aspect; this.camera.right = aspect;
    this.camera.top = 1; this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();

    // cover-fit the bg plane to the ortho frustum (width 2*aspect, height 2)
    const frustumW = aspect * 2, frustumH = 2;
    const imgAspect = this.imgAspect || 1;
    if (imgAspect > aspect) {
      this.coverH = frustumH;
      this.coverW = frustumH * imgAspect;
    } else {
      this.coverW = frustumW;
      this.coverH = frustumW / imgAspect;
    }
    this.bgPlane.scale.set(this.coverW, this.coverH, 1);

    // reposition all light elements based on new cover size
    this._layoutLights();
  }

  _layoutLights() {
    // window glow
    const wc = this._fracToWorld((WINDOW_ZONE.x0+WINDOW_ZONE.x1)/2, (WINDOW_ZONE.y0+WINDOW_ZONE.y1)/2);
    const ww = (WINDOW_ZONE.x1 - WINDOW_ZONE.x0) * this.coverW;
    this.windowSprite.position.set(wc.x, wc.y, 0);
    this.windowSprite.scale.set(ww*2.4, ww*2.4, 1);

    // yellow beams — positioned over the window, biased left/right
    const beamW = this.coverW * 0.12;
    const beamH = this.coverH * 0.65;
    const leftPos = this._fracToWorld(WINDOW_ZONE.x0 - 0.02, (WINDOW_ZONE.y0+WINDOW_ZONE.y1)/2);
    const rightPos = this._fracToWorld(WINDOW_ZONE.x1 + 0.02, (WINDOW_ZONE.y0+WINDOW_ZONE.y1)/2);
    this.yellowLeft.position.set(leftPos.x, leftPos.y - this.coverH*0.05, 0);
    this.yellowLeft.scale.set(beamW, beamH, 1);
    this.yellowRight.position.set(rightPos.x, rightPos.y - this.coverH*0.05, 0);
    this.yellowRight.scale.set(beamW, beamH, 1);

    // pillars
    ['left','right'].forEach(side => {
      this.pillars[side].forEach((sprite, i) => {
        const frac = sprite.userData.frac;
        const pos = this._fracToWorld(frac, 0.5);
        const w = this.coverW * (sprite.userData.isNear ? 0.05 : 0.03);
        sprite.userData.baseX = pos.x;
        sprite.userData.width = w;
        sprite.position.x = pos.x;

        const pool = this.pillarPools[side][i];
        pool.position.set(pos.x, -this.coverH*0.42, 0.1);
        pool.scale.set(w*6, w*4, 1);
      });
    });
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

    const flicker = 0.85 + Math.sin(this.t*10)*0.12;
    this.yellowRight.material.opacity += ((yellowRightOn ? 0.95*flicker : 0) - this.yellowRight.material.opacity) * 0.25;
    this.yellowLeft.material.opacity  += ((yellowLeftOn  ? 0.95*flicker : 0) - this.yellowLeft.material.opacity) * 0.25;

    // pillar climb
    ['left','right'].forEach(side => {
      this.pillars[side].forEach((sprite, i) => {
        const tex = this.state.purpleColor === 'pink' ? this.pinkTex : this.purpleTex;
        if (sprite.material.map !== tex) sprite.material.map = tex;

        const localT = Math.max(0, Math.min(1, ((this.climbT - sprite.userData.delay) % 1) * 1.4));
        const target = this.state.purpleActive ? 1 : 0;
        const targetOpacity = this.state.purpleActive ? 0.95 : 0;
        sprite.material.opacity += (targetOpacity - sprite.material.opacity) * 0.18;

        const climbHeight = this.coverH * (0.08 + localT * 0.85);
        const w = sprite.userData.width;
        sprite.scale.set(w, climbHeight, 1);
        sprite.position.y = -this.coverH/2 + climbHeight/2;

        const pool = this.pillarPools[side][i];
        const poolTex = this.state.purpleColor === 'pink' ? COLORS.pink : COLORS.purple;
        pool.material.opacity += (targetOpacity*0.7 - pool.material.opacity) * 0.18;
      });
    });

    this.windowSprite.material.opacity += ((this.state.blueActive ? 0.85 : 0) - this.windowSprite.material.opacity) * 0.18;
    const sc = 1 + Math.sin(this.t*1.5)*0.04;
    this.windowSprite.scale.set(
      this.windowSprite.userData?.baseW || this.windowSprite.scale.x,
      this.windowSprite.userData?.baseH || this.windowSprite.scale.y, 1
    );
  }

  render() {
    this.composer.render();
  }
}
