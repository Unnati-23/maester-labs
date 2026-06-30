import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import { classifyHand, HandSmoother } from './churchGestures.js';
import { ChurchLightsThree } from './visuals/churchLightsThree.js';

const videoEl   = document.getElementById('webcam');
const handCanvas = document.getElementById('handCanvas');
const handCtx    = handCanvas.getContext('2d');
const churchCanvas = document.getElementById('churchCanvas');

const loadingOverlay = document.getElementById('loadingOverlay');
const loaderText     = document.getElementById('loaderText');
const loaderRetry    = document.getElementById('loaderRetry');
const gRight = document.getElementById('gRight');
const gLeft  = document.getElementById('gLeft');
const recIndicator = document.getElementById('recIndicator');
const recordBtn     = document.getElementById('recordBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const lights = new ChurchLightsThree(churchCanvas, 'assets/church/church1.jpg');

// ── Per-hand smoothers ────────────────────────────────────────────────────────
const rightSmoother = new HandSmoother(5);
const leftSmoother  = new HandSmoother(5);

let rightPinching = false;
let leftPinching  = false;

// ── Recorder ──────────────────────────────────────────────────────────────────
const recorder = { instance: null, chunks: [], recording: false };

function startRecording() {
  recorder.chunks = [];
  const stream = churchCanvas.captureStream(30);
  recorder.instance = new MediaRecorder(stream, { mimeType: 'video/webm' });
  recorder.instance.ondataavailable = e => { if (e.data.size > 0) recorder.chunks.push(e.data); };
  recorder.instance.onstop = () => {
    const blob = new Blob(recorder.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `maester-labs-church-${Date.now()}.webm`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    recIndicator.classList.add('hidden');
    recordBtn.textContent = '⏺';
    recorder.recording = false;
  };
  recorder.instance.start();
  recorder.recording = true;
  recIndicator.classList.remove('hidden');
  recordBtn.textContent = '⏹';
}

function stopRecording() {
  if (recorder.instance && recorder.instance.state !== 'inactive') recorder.instance.stop();
}

recordBtn.addEventListener('click', () => recorder.recording ? stopRecording() : startRecording());
fullscreenBtn.addEventListener('click', () => {
  document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});

// ── Hand skeleton drawing (small webcam box) ──────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

function drawHandSkeleton(landmarks, color) {
  const W = handCanvas.width, H = handCanvas.height;
  const pts = landmarks.map(lm => ({ x: (1-lm.x)*W, y: lm.y*H }));
  handCtx.save();
  handCtx.strokeStyle = color;
  handCtx.lineWidth = 1.5;
  handCtx.shadowColor = color;
  handCtx.shadowBlur = 4;
  CONNECTIONS.forEach(([a,b]) => {
    handCtx.beginPath(); handCtx.moveTo(pts[a].x, pts[a].y);
    handCtx.lineTo(pts[b].x, pts[b].y); handCtx.stroke();
  });
  handCtx.fillStyle = color;
  pts.forEach(p => { handCtx.beginPath(); handCtx.arc(p.x, p.y, 2, 0, Math.PI*2); handCtx.fill(); });
  handCtx.restore();
}

// ── Gesture → light state mapping ─────────────────────────────────────────────
function applyRightHand(gesture, rollDeg) {
  rightPinching = gesture === 'pinch';
  lights.state.rightYellow = gesture === 'l_shape';

  if (gesture === 'open_palm') {
    lights.state.purpleActive = true;
    const tilted = Math.abs(rollDeg) > 22;
    lights.state.purpleColor = tilted ? 'pink' : 'purple';
  } else {
    lights.state.purpleActive = false;
  }

  gRight.querySelector('span').textContent = gesture.replace('_',' ') || '—';
  gRight.classList.toggle('active', gesture !== 'none');
}

function applyLeftHand(gesture) {
  leftPinching = gesture === 'pinch';
  lights.state.leftYellow = gesture === 'l_shape';
  lights.state.blueActive = gesture === 'open_palm';

  gLeft.querySelector('span').textContent = gesture.replace('_',' ') || '—';
  gLeft.classList.toggle('active', gesture !== 'none');
}

function updateFlicker() {
  lights.state.flicker = rightPinching && leftPinching;
  if (!lights.state.flicker) {
    lights.state.flickerOn = false;
    lights.state.flickerT = 0;
  }
}

// ── Main render loop ──────────────────────────────────────────────────────────
let handLandmarker = null;

function renderLoop() {
  if (videoEl.readyState < 2 || !handLandmarker) { requestAnimationFrame(renderLoop); return; }

  handCanvas.width = videoEl.videoWidth;
  handCanvas.height = videoEl.videoHeight;
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  const result = handLandmarker.detectForVideo(videoEl, performance.now());
  const hands = result.landmarks || [];
  const handedness = result.handedness || [];

  let sawRight = false, sawLeft = false;

  hands.forEach((lm, i) => {
    const label = handedness[i]?.[0]?.categoryName;
    const isUserRight = label === 'Left'; // mirrored display

    const { gesture, rollDeg } = classifyHand(lm);

    if (isUserRight) {
      sawRight = true;
      const confirmed = rightSmoother.update(gesture, rollDeg);
      applyRightHand(confirmed, rightSmoother.rollDeg);
      drawHandSkeleton(lm, '#b14aff');
    } else {
      sawLeft = true;
      const confirmed = leftSmoother.update(gesture, rollDeg);
      applyLeftHand(confirmed);
      drawHandSkeleton(lm, '#4ab8ff');
    }
  });

  if (!sawRight) { rightSmoother.reset(); applyRightHand('none', 0); }
  if (!sawLeft)  { leftSmoother.reset();  applyLeftHand('none'); }

  updateFlicker();

  lights.update();
  lights.render();

  requestAnimationFrame(renderLoop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    loaderText.textContent = 'starting camera…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await new Promise(r => { videoEl.onloadedmetadata = () => { videoEl.play(); r(); }; });

    loaderText.textContent = 'loading hand tracking model…';
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'video',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });

    loadingOverlay.classList.add('hidden');
    requestAnimationFrame(renderLoop);
  } catch (err) {
    loaderText.style.color = '#e0533d';
    loaderText.textContent = err.name === 'NotAllowedError'
      ? 'camera permission denied — enable and retry'
      : err.message || 'something went wrong';
    loaderRetry.classList.remove('hidden');
  }
}

loaderRetry.addEventListener('click', () => {
  loaderText.style.color = '';
  loaderRetry.classList.add('hidden');
  boot();
});

window.addEventListener('resize', () => {
  lights.resize();
});

boot();
