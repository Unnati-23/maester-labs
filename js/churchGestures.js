// Two-hand gesture detection for the church light show
const LM = {
  WRIST: 0, THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_TIP: 20,
};

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function isExtended(tip, mcp, wrist) {
  return dist(tip, wrist) > dist(mcp, wrist) * 1.05;
}

export function classifyHand(landmarks) {
  const wrist = landmarks[LM.WRIST];
  const thumbTip = landmarks[LM.THUMB_TIP];
  const indexTip = landmarks[LM.INDEX_TIP];
  const indexMcp = landmarks[LM.INDEX_MCP];
  const middleTip = landmarks[LM.MIDDLE_TIP];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  const ringTip = landmarks[LM.RING_TIP];
  const ringMcp = landmarks[LM.RING_MCP];
  const pinkyTip = landmarks[LM.PINKY_TIP];
  const pinkyMcp = landmarks[LM.PINKY_MCP];
  const thumbMcp = landmarks[LM.THUMB_MCP];

  const indexUp  = isExtended(indexTip, indexMcp, wrist);
  const middleUp = isExtended(middleTip, middleMcp, wrist);
  const ringUp   = isExtended(ringTip, ringMcp, wrist);
  const pinkyUp  = isExtended(pinkyTip, pinkyMcp, wrist);
  const thumbOut = dist(thumbTip, pinkyMcp) > dist(thumbMcp, pinkyMcp) * 1.1;

  const pinching = dist(thumbTip, indexTip) < 0.055;

  let gesture = 'none';
  if (pinching) {
    gesture = 'pinch';
  } else if (indexUp && thumbOut && !middleUp && !ringUp && !pinkyUp) {
    gesture = 'l_shape';
  } else if (indexUp && middleUp && ringUp && pinkyUp) {
    gesture = 'open_palm';
  }

  // roll/tilt angle — angle of the line across the knuckles (index_mcp to pinky_mcp)
  const dx = indexMcp.x - pinkyMcp.x;
  const dy = indexMcp.y - pinkyMcp.y;
  const rollDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  return { gesture, rollDeg, landmarks };
}

// Smooths gesture per-hand-slot (left/right) over a few frames
export class HandSmoother {
  constructor(holdFrames = 5) {
    this.holdFrames = holdFrames;
    this.candidate = 'none';
    this.count = 0;
    this.confirmed = 'none';
    this.rollDeg = 0;
  }
  update(raw, rollDeg) {
    if (raw === this.candidate) {
      this.count++;
      if (this.count >= this.holdFrames) this.confirmed = this.candidate;
    } else {
      this.candidate = raw;
      this.count = 1;
    }
    // roll angle smoothing (light lerp)
    this.rollDeg += (rollDeg - this.rollDeg) * 0.25;
    return this.confirmed;
  }
  reset() {
    this.candidate = 'none';
    this.count = 0;
    this.confirmed = 'none';
  }
}
