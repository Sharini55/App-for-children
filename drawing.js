// elements
const guideCanvas = document.getElementById('guideCanvas');
const drawCanvas = document.getElementById('drawCanvas');
const guideCtx = guideCanvas.getContext('2d');
const ctx = drawCanvas.getContext('2d');

const shapeInstruction = document.getElementById('shapeInstruction');
const nextShapeBtn = document.getElementById('nextShapeBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');

let painting = false;
let color = '#5a4032';

// list of shapes to cycle through
const shapes = [
  { id: 'circle', label: 'Draw a big circle!' },
  { id: 'square', label: 'Draw a big square!' },
  { id: 'triangle', label: 'Draw a triangle!' }
];
let currentShapeIndex = 0;

// set up drawing style for user draw canvas
ctx.lineWidth = 6;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.strokeStyle = color;

// Resize both canvases to fit wrapper CSS pixels (and account for devicePixelRatio for sharpness)
function resizeCanvases() {
  const wrap = drawCanvas.parentElement;
  const rect = wrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  [guideCanvas, drawCanvas].forEach(c => {
    c.width = Math.round(rect.width * ratio);
    c.height = Math.round(rect.height * ratio);
    c.style.width = `${rect.width}px`;
    c.style.height = `${rect.height}px`;
  });

  // scale contexts for crisp drawing on high DPI displays
  guideCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  // reapply drawing defaults after resizing
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawGuide(shapes[currentShapeIndex].id);
}

// call once on load
window.addEventListener('load', resizeCanvases);
window.addEventListener('resize', resizeCanvases);

// ---------- GUIDE DRAWING ----------
// draws dashed/dotted guideline shapes on guideCanvas
function drawGuide(shapeId) {
  // clear guide
  guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

  // visual config
  const w = guideCanvas.width / (window.devicePixelRatio || 1);
  const h = guideCanvas.height / (window.devicePixelRatio || 1);
  guideCtx.strokeStyle = 'rgba(90,64,50,0.35)'; // soft brown
  guideCtx.lineWidth = 4;
  guideCtx.lineCap = 'round';
  guideCtx.lineJoin = 'round';

  // dashed: change pattern for different feel
  guideCtx.setLineDash([8, 6]); // longer dashes
  guideCtx.beginPath();

  if (shapeId === 'circle') {
    const radius = Math.min(w, h) * 0.35;
    const cx = w / 2;
    const cy = h / 2;

    // Draw dashed circular path
    guideCtx.beginPath();
    guideCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    guideCtx.stroke();

    // Optional: add subtle dots along circle to create "traceable" markers
    drawDotsAlongCircle(cx, cy, radius, 12);

  } else if (shapeId === 'square') {
    const size = Math.min(w, h) * 0.6;
    const x = (w - size) / 2;
    const y = (h - size) / 2;

    guideCtx.beginPath();
    guideCtx.rect(x, y, size, size);
    guideCtx.stroke();

    // add corner dots for tracing
    drawCornerDots(x, y, size, 4);

  } else if (shapeId === 'triangle') {
    const size = Math.min(w, h) * 0.6;
    const cx = w / 2;
    const cy = h / 2;
    const htri = size * Math.sqrt(3) / 2;

    const p1 = [cx, cy - (2/3) * htri];
    const p2 = [cx - size / 2, cy + (1/3) * htri];
    const p3 = [cx + size / 2, cy + (1/3) * htri];

    guideCtx.beginPath();
    guideCtx.moveTo(p1[0], p1[1]);
    guideCtx.lineTo(p2[0], p2[1]);
    guideCtx.lineTo(p3[0], p3[1]);
    guideCtx.closePath();
    guideCtx.stroke();

    // add dots along edges
    drawDotsAlongLine(p1, p2, 8);
    drawDotsAlongLine(p2, p3, 8);
    drawDotsAlongLine(p3, p1, 8);
  }

  // reset dash to solid for future drawings on guideCtx if any
  guideCtx.setLineDash([]);
}

// helper to draw small dots along a circular path (nice for preschool tracing)
function drawDotsAlongCircle(cx, cy, radius, count) {
  guideCtx.fillStyle = 'rgba(90,64,50,0.35)';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    guideCtx.beginPath();
    guideCtx.arc(x, y, 3, 0, Math.PI * 2);
    guideCtx.fill();
  }
}

function drawCornerDots(x, y, size, radius) {
  guideCtx.fillStyle = 'rgba(90,64,50,0.35)';
  const corners = [
    [x, y],
    [x + size, y],
    [x + size, y + size],
    [x, y + size]
  ];
  corners.forEach(c => {
    guideCtx.beginPath();
    guideCtx.arc(c[0], c[1], 4, 0, Math.PI * 2);
    guideCtx.fill();
  });
}

function drawDotsAlongLine(pA, pB, count) {
  guideCtx.fillStyle = 'rgba(90,64,50,0.35)';
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = pA[0] + (pB[0] - pA[0]) * t;
    const y = pA[1] + (pB[1] - pA[1]) * t;
    guideCtx.beginPath();
    guideCtx.arc(x, y, 3, 0, Math.PI * 2);
    guideCtx.fill();
  }
}

// ---------- DRAWING (user strokes) ----------
function getCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left),
    y: (e.clientY - rect.top)
  };
}

function getTouchPos(touch, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (touch.clientX - rect.left),
    y: (touch.clientY - rect.top)
  };
}

// mouse events
drawCanvas.addEventListener('mousedown', (e) => {
  painting = true;
  const p = getCanvasPos(e, drawCanvas);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

window.addEventListener('mouseup', () => {
  if (painting) {
    painting = false;
    ctx.closePath();
  }
});

drawCanvas.addEventListener('mousemove', (e) => {
  if (!painting) return;
  const p = getCanvasPos(e, drawCanvas);
  ctx.strokeStyle = color;
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
});

// touch events
drawCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  painting = true;
  const p = getTouchPos(e.touches[0], drawCanvas);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
}, { passive: false });

drawCanvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!painting) return;
  const p = getTouchPos(e.touches[0], drawCanvas);
  ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = color;
  ctx.stroke();
}, { passive: false });

drawCanvas.addEventListener('touchend', () => {
  painting = false;
  ctx.closePath();
});

// ---------- color change ----------
document.querySelectorAll('.color').forEach(c => {
  c.addEventListener('click', () => {
    color = window.getComputedStyle(c).backgroundColor;
    // use a darker brush color for good contrast when the palette color is pale
    ctx.strokeStyle = color;
  });
});

// ---------- buttons ----------
nextShapeBtn.addEventListener('click', () => {
  currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
  shapeInstruction.textContent = shapes[currentShapeIndex].label;
  drawGuide(shapes[currentShapeIndex].id);
});

clearCanvasBtn.addEventListener('click', () => {
  // only clear the user's drawing (drawCanvas), keep guide intact
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
});

// initial guide
shapeInstruction.textContent = shapes[currentShapeIndex].label;
window.requestAnimationFrame(() => drawGuide(shapes[currentShapeIndex].id));
