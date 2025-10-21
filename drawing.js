const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
let painting = false;
let color = '#5a4032';

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

// set up line style
ctx.lineWidth = 4;
ctx.lineCap = 'round'; // makes edges round
ctx.lineJoin = 'round';

// Start drawing
canvas.addEventListener('mousedown', (e) => {
  painting = true;
  ctx.beginPath();
  ctx.moveTo(getX(e), getY(e));
});

canvas.addEventListener('mouseup', () => {
  painting = false;
  ctx.closePath();
});

canvas.addEventListener('mousemove', draw);

function draw(e) {
  if (!painting) return;
  ctx.strokeStyle = color;
  ctx.lineTo(getX(e), getY(e));
  ctx.stroke();
}

// Touch support for tablets
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  painting = true;
  ctx.beginPath();
  ctx.moveTo(getX(e.touches[0]), getY(e.touches[0]));
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!painting) return;
  ctx.lineTo(getX(e.touches[0]), getY(e.touches[0]));
  ctx.strokeStyle = color;
  ctx.stroke();
});

canvas.addEventListener('touchend', () => {
  painting = false;
  ctx.closePath();
});

// Helper to get coordinates
function getX(e) {
  const rect = canvas.getBoundingClientRect();
  return e.clientX - rect.left;
}

function getY(e) {
  const rect = canvas.getBoundingClientRect();
  return e.clientY - rect.top;
}

// Color change
document.querySelectorAll('.color').forEach(c => {
  c.addEventListener('click', () => {
    color = window.getComputedStyle(c).backgroundColor;
  });
});

// Next shape button
document.getElementById('nextShapeBtn').addEventListener('click', () => {
  document.getElementById('shapeInstruction').textContent = 'Draw a big square!';
});
