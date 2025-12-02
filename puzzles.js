// ===============================
// PUZZLES.JS — Direct-image-slicing version
// ===============================

let IMAGE_URL = "images1.png";

const imageSelect = document.getElementById("imageSelect");
const rowsSel = document.getElementById("rows");
const colsSel = document.getElementById("cols");
const shuffleBtn = document.getElementById("shuffleBtn");
const hintBtn = document.getElementById("hintBtn");
const resetBtn = document.getElementById("resetBtn");
const slotsContainer = document.getElementById("slots");
const piecesContainer = document.getElementById("pieces");
const message = document.getElementById("message");

let pieces = [];
let pieceSize = { w: 0, h: 0 };
let zIndexCounter = 1;
let dragging = null;

function log(...args) { console.log("[PUZZLE]", ...args); }

if (imageSelect) {
  IMAGE_URL = imageSelect.value;
  imageSelect.addEventListener("change", () => {
    IMAGE_URL = imageSelect.value;
    buildPuzzle();
  });
}

async function buildPuzzle() {
  const rows = parseInt(rowsSel.value, 10) || 3;
  const cols = parseInt(colsSel.value, 10) || 3;

  // clear
  slotsContainer.innerHTML = "";
  piecesContainer.innerHTML = "";
  pieces = [];
  message.classList.add("hidden");

  const board = document.querySelector(".board");
  if (!board) {
    console.error("[PUZZLE] no .board element found");
    return;
  }
  const br = board.getBoundingClientRect();

  // ensure overlay size
  slotsContainer.style.position = "absolute";
  slotsContainer.style.left = "0";
  slotsContainer.style.top = "0";
  slotsContainer.style.width = br.width + "px";
  slotsContainer.style.height = br.height + "px";

  piecesContainer.style.position = "absolute";
  piecesContainer.style.left = "0";
  piecesContainer.style.top = "0";
  piecesContainer.style.width = br.width + "px";
  piecesContainer.style.height = br.height + "px";

  // compute slot size
  const gap = 8;
  const padding = 12;
  const availableW = Math.max(64, br.width - padding * 2 - gap * (cols - 1));
  const availableH = Math.max(64, br.height - padding * 2 - gap * (rows - 1));
  const slotW = Math.max(40, Math.floor(availableW / cols));
  const slotH = Math.max(40, Math.floor(availableH / rows));
  pieceSize = { w: slotW, h: slotH };

  slotsContainer.style.gridTemplateColumns = `repeat(${cols}, ${slotW}px)`;
  slotsContainer.style.gridTemplateRows = `repeat(${rows}, ${slotH}px)`;
  slotsContainer.style.gap = `${gap}px`;
  slotsContainer.style.padding = `${padding}px`;

  // load and decode image
  const img = new Image();
  img.src = IMAGE_URL;

  let imageReady = false;
  try {
    if ("decode" in img) {
      await img.decode();
      imageReady = !!img.naturalWidth;
      log("image decoded OK:", IMAGE_URL, "size:", img.naturalWidth, "x", img.naturalHeight);
    } else {
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load error"));
      });
      imageReady = !!img.naturalWidth;
      log("image loaded via onload:", IMAGE_URL, "size:", img.naturalWidth, "x", img.naturalHeight);
    }
  } catch (err) {
    console.warn("[PUZZLE] image decode/load failed, will use fallback colors:", err);
    imageReady = false;
  }

  // Create slots & pieces — draw directly from `img` into piece canvas if available
  let index = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // slot
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.row = r;
      slot.dataset.col = c;
      slot.style.width = `${slotW}px`;
      slot.style.height = `${slotH}px`;
      slotsContainer.appendChild(slot);

      // piece
      const piece = document.createElement("div");
      piece.className = "piece";
      piece.style.width = `${slotW}px`;
      piece.style.height = `${slotH}px`;
      piece.dataset.row = r;
      piece.dataset.col = c;
      piece.dataset.placed = "false";
      piece.textContent = ""; // do not show numbers

     if (imageReady) {
        // We need the gap variable from the `buildPuzzle` function scope
        // It's defined on line 53: const gap = 8;
        const gap = 8;
        
        // Calculate the full image's display size (puzzleW/H) relative to the board slots
        // This is the size the image will be scaled to across the entire grid (slots + gaps)
        const puzzleW = cols * slotW + (cols - 1) * gap;
        const puzzleH = rows * slotH + (rows - 1) * gap;
        
        // Calculate the negative offset for this specific piece
        // The background position must be shifted left/up by the total width/height 
        // of all the pieces and gaps *before* this piece.
        const offsetX = -1 * (c * slotW + c * gap); 
        const offsetY = -1 * (r * slotH + r * gap);

        // Set the full image as the background for the piece
        piece.style.backgroundImage = `url(${IMAGE_URL})`;
        
        // Scale the full image to cover the entire grid
        piece.style.backgroundSize = `${puzzleW}px ${puzzleH}px`;
        
        // Shift the background image to show the correct slice
        piece.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
      }

      // fallback if slicing failed or image not ready
      if (!piece.style.backgroundImage) {
        const alt = ["#ffe9b4", "#cdeed6", "#f6c6d0", "#bee7f6"];
        piece.style.background = alt[(r + c) % alt.length];
      }

      piecesContainer.appendChild(piece);

      pieces.push({
        el: piece,
        row: r,
        col: c,
        correctLeft: 0,
        correctTop: 0,
        placed: false
      });

      index++;
    }
  }

  // compute positions then shuffle and attach handlers
  requestAnimationFrame(() => {
    computeCorrectPositions();
    shufflePieces();
    attachDragHandlers();
    log("buildPuzzle done. pieces:", pieces.length, "pieceSize:", pieceSize);
  });
}

function computeCorrectPositions() {
  const pcRect = piecesContainer.getBoundingClientRect();
  document.querySelectorAll(".slot").forEach(slot => {
    const rect = slot.getBoundingClientRect();
    const r = parseInt(slot.dataset.row, 10);
    const c = parseInt(slot.dataset.col, 10);
    const p = pieces.find(x => x.row === r && x.col === c);
    if (p) {
      p.correctLeft = Math.round(rect.left - pcRect.left);
      p.correctTop = Math.round(rect.top - pcRect.top);
    }
  });
}

function shufflePieces() {
  const board = document.querySelector(".board");
  const bw = board.clientWidth;
  const bh = board.clientHeight;
  const padding = 8;

  pieces.forEach((p, idx) => {
    p.placed = false;
    p.el.classList.remove("placed");
    p.el.dataset.placed = "false";
    p.el.style.pointerEvents = "auto";

    const zone = idx % 4;
    let x, y;
    if (zone === 0) {
      x = Math.random() * (bw - pieceSize.w - padding*2) + padding;
      y = padding;
    } else if (zone === 1) {
      x = Math.random() * (bw - pieceSize.w - padding*2) + padding;
      y = bh - pieceSize.h - padding;
    } else if (zone === 2) {
      x = padding;
      y = Math.random() * (bh - pieceSize.h - padding*2) + padding;
    } else {
      x = bw - pieceSize.w - padding;
      y = Math.random() * (bh - pieceSize.h - padding*2) + padding;
    }

    p.el.style.position = "absolute";
    p.el.style.left = `${Math.round(x)}px`;
    p.el.style.top = `${Math.round(y)}px`;
    p.el.style.transform = `rotate(${(Math.random()*18-9)}deg)`;
    p.el.style.zIndex = ++zIndexCounter;
  });
}

function attachDragHandlers() {
  pieces.forEach(p => {
    const el = p.el;
    el.onpointerdown = null;
    el.onpointermove = null;
    el.onpointerup = null;

    el.style.touchAction = "none";
    el.onpointerdown = (e) => {
      if (p.placed) return;
      try { el.setPointerCapture(e.pointerId); } catch(_) {}
      dragging = {
        piece: p,
        el,
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: parseFloat(el.style.left) || 0,
        origTop: parseFloat(el.style.top) || 0
      };
      el.style.transition = "none";
      el.style.zIndex = ++zIndexCounter;
    };

    el.onpointermove = (e) => {
      if (!dragging || dragging.id !== e.pointerId) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      dragging.el.style.left = (dragging.origLeft + dx) + "px";
      dragging.el.style.top = (dragging.origTop + dy) + "px";
    };

    el.onpointerup = (e) => {
      if (!dragging || dragging.id !== e.pointerId) return;
      try { el.releasePointerCapture(e.pointerId); } catch(_) {}
      const finalLeft = parseFloat(el.style.left) || 0;
      const finalTop = parseFloat(el.style.top) || 0;
      const dx = finalLeft - p.correctLeft;
      const dy = finalTop - p.correctTop;
      const dist = Math.hypot(dx, dy);
      const threshold = Math.max(pieceSize.w, pieceSize.h) * 0.35;
      if (dist <= threshold) {
        el.style.left = p.correctLeft + "px";
        el.style.top = p.correctTop + "px";
        el.classList.add("placed");
        p.placed = true;
        el.dataset.placed = "true";
        el.style.pointerEvents = "none";
        checkCompletion();
      }
      dragging = null;
    };
  });
}

function checkCompletion() {
  if (pieces.length && pieces.every(p => p.placed)) {
    message.classList.remove("hidden");
    log("puzzle complete");
  }
}

shuffleBtn.addEventListener("click", () => { shufflePieces(); message.classList.add("hidden"); });
resetBtn.addEventListener("click", () => { buildPuzzle(); });
hintBtn.addEventListener("click", () => {
  // Recalculate parameters needed for the hint display
  const rows = parseInt(rowsSel.value, 10) || 3;
  const cols = parseInt(colsSel.value, 10) || 3;
  
  // The 'gap' variable is defined as 8 in the buildPuzzle function (line 53)
  const gap = 8;
  
  // We need the latest piece size, which is calculated and stored globally
  // (Assuming pieceSize is updated by buildPuzzle, which it is)
  const { w: slotW, h: slotH } = pieceSize;
  
  // Calculate the total width and height of the grid (slots + gaps)
  const puzzleW = cols * slotW + (cols - 1) * gap;
  const puzzleH = rows * slotH + (rows - 1) * gap;

  // Get the board element
  const board = document.querySelector(".board");
  
  // Create the preview overlay
  const preview = document.createElement("div");
  preview.style.position = "absolute";
  
  // Position the hint exactly where the slots start (accounting for the 12px padding)
  const padding = 12;
  preview.style.left = `${padding}px`;
  preview.style.top = `${padding}px`;
  
  // Set the size to match the total grid size (puzzleW/H calculated above)
  preview.style.width = `${puzzleW}px`;
  preview.style.height = `${puzzleH}px`;
  
  // Use the current image URL
  preview.style.backgroundImage = `url(${IMAGE_URL})`;
  
  // Set background size to fit the content exactly (it should match the size you use for the pieces)
  preview.style.backgroundSize = `${puzzleW}px ${puzzleH}px`;
  
  preview.style.opacity = '0.45';
  preview.style.zIndex = 0; // Behind the pieces
  preview.style.borderRadius = '8px';
  
  board.appendChild(preview);
  
  // Remove the hint after 0.9 seconds
  setTimeout(()=> preview.remove(), 900);
});

rowsSel.addEventListener("change", () => buildPuzzle());
colsSel.addEventListener("change", () => buildPuzzle());

window.addEventListener("load", () => {
  const sel = document.getElementById('imageSelect');
  if (sel) IMAGE_URL = sel.value;
  buildPuzzle();
  setTimeout(()=> {
    log("board size:", document.querySelector('.board').getBoundingClientRect());
    log("pieces count:", document.querySelectorAll('.piece').length);
  }, 600);
});

// expose debug helpers
window._puzzleDebug = { pieces, pieceSize, buildPuzzle, shufflePieces, computeCorrectPositions };
