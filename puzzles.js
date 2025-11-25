// Puzzles: split image into pieces, shuffle, drag & snap.
// Uses the uploaded image file path provided by you:
const IMAGE_URL = '/mnt/data/Screenshot 2025-11-25 143120.png';

// DOM
const slotsContainer = document.getElementById('slots');
const piecesContainer = document.getElementById('pieces');
const shuffleBtn = document.getElementById('shuffleBtn');
const hintBtn = document.getElementById('hintBtn');
const resetBtn = document.getElementById('resetBtn');
const rowsSel = document.getElementById('rows');
const colsSel = document.getElementById('cols');
const message = document.getElementById('message');
const instruction = document.getElementById('instruction');

let rows = parseInt(rowsSel.value, 10);
let cols = parseInt(colsSel.value, 10);
let pieces = []; // {el, row, col, correctX, correctY, placed}
let boardRect = null;
let pieceSize = {w:0,h:0};
let dragging = null;
let zIndexCounter = 1;

function buildPuzzle(){
  rows = parseInt(rowsSel.value, 10);
  cols = parseInt(colsSel.value, 10);
  // clear
  slotsContainer.innerHTML = '';
  piecesContainer.innerHTML = '';
  pieces = [];
  message.classList.add('hidden');

  // configure slots grid
  slotsContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  slotsContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  // create offscreen image and canvas to slice pieces
  const img = new Image();
  img.src = IMAGE_URL;
  img.onload = () => {
    // determine board size inside .board (slots container fills board)
    const board = document.querySelector('.board');
    boardRect = board.getBoundingClientRect();

    // we want padding/gaps to match CSS; compute slot sizes in CSS pixels
    const gap = 8; // matches CSS gap
    const padding = 12; // container padding
    const availableW = boardRect.width - padding*2 - gap*(cols-1);
    const availableH = boardRect.height - padding*2 - gap*(rows-1);

    // size piece in CSS pixels (we will scale image accordingly)
    const slotW = Math.floor(availableW / cols);
    const slotH = Math.floor(availableH / rows);
    pieceSize.w = slotW;
    pieceSize.h = slotH;

    // set CSS size of slots container so it matches board inner area
    slotsContainer.style.padding = `${padding}px`;
    slotsContainer.style.gap = `${gap}px`;

    // create a canvas to slice the image at natural image resolution, then scale to slot size
    const tempCanvas = document.createElement('canvas');
    // set canvas size to img natural size to get crisp slices
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    const tctx = tempCanvas.getContext('2d');
    tctx.drawImage(img, 0, 0);

    // compute scale from image pixels to slot pixels
    const scaleX = img.naturalWidth / (cols * slotW);
    const scaleY = img.naturalHeight / (rows * slotH);

    // create slots and piece elements
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        // slot element (visual empty target)
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.row = r;
        slot.dataset.col = c;
        slotsContainer.appendChild(slot);

        // slice image region
        const sx = Math.round(c * slotW * scaleX);
        const sy = Math.round(r * slotH * scaleY);
        const sw = Math.round(slotW * scaleX);
        const sh = Math.round(slotH * scaleY);

        const pieceCanvas = document.createElement('canvas');
        pieceCanvas.width = slotW;
        pieceCanvas.height = slotH;
        const pctx = pieceCanvas.getContext('2d');
        // draw scaled slice to piece canvas
        pctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, slotW, slotH);
        const dataUrl = pieceCanvas.toDataURL();

        // piece element
        const piece = document.createElement('div');
        piece.className = 'piece';
        piece.style.width = slotW + 'px';
        piece.style.height = slotH + 'px';
        piece.style.backgroundImage = `url(${dataUrl})`;
        piece.style.backgroundSize = `${slotW}px ${slotH}px`;
        piece.dataset.row = r;
        piece.dataset.col = c;
        piece.dataset.placed = 'false';
        piecesContainer.appendChild(piece);

        pieces.push({
          el: piece,
          row: r,
          col: c,
          correctLeft: 0, // will compute after layout
          correctTop: 0,
          placed: false
        });
      }
    }

    // after elements added to DOM, compute correct positions of slots (CSS pixels)
    computeCorrectPositions();
    // shuffle pieces in the free area
    shufflePieces();
    // attach drag handlers
    attachDragHandlers();
  };
  img.onerror = () => {
    instruction.textContent = 'Could not load puzzle image.';
  };
}

function computeCorrectPositions(){
  // get slot positions relative to piecesContainer
  const slotEls = Array.from(document.querySelectorAll('.slot'));
  const pcRect = piecesContainer.getBoundingClientRect();
  slotEls.forEach(slot => {
    const r = parseInt(slot.dataset.row,10);
    const c = parseInt(slot.dataset.col,10);
    const rect = slot.getBoundingClientRect();
    // translate to piecesContainer coords
    const left = rect.left - pcRect.left;
    const top = rect.top - pcRect.top;
    // find piece object and set correct coords
    const p = pieces.find(x => x.row === r && x.col === c);
    if(p){
      p.correctLeft = left;
      p.correctTop = top;
    }
    // Also set slot size to match piece size (for visual)
    slot.style.width = pieceSize.w + 'px';
    slot.style.height = pieceSize.h + 'px';
  });
}

function shufflePieces(){
  // place pieces randomly around the board edges (not overlapping slots)
  const board = document.querySelector('.board');
  const br = board.getBoundingClientRect();
  const padding = 8;
  pieces.forEach(p=>{
    p.placed = false;
    p.el.classList.remove('placed');
    p.el.dataset.placed = 'false';
    // random position inside board but avoid center slots area by offsetting to sides
    const side = Math.random();
    let x, y;
    if(side < 0.33){
      x = Math.random() * (br.width - pieceSize.w);
      y = br.height - pieceSize.h - padding;
    } else if(side < 0.66){
      x = padding;
      y = Math.random() * (br.height - pieceSize.h);
    } else {
      x = br.width - pieceSize.w - padding;
      y = Math.random() * (br.height - pieceSize.h);
    }
    // set style in piecesContainer coordinate space
    const pcRect = piecesContainer.getBoundingClientRect();
    p.el.style.left = `${x - pcRect.left}px`;
    p.el.style.top = `${y - pcRect.top}px`;
    p.el.style.position = 'absolute';
    p.el.style.transform = 'rotate(' + (Math.random()*20-10) + 'deg)';
    p.el.style.zIndex = ++zIndexCounter;
  });
}

function attachDragHandlers(){
  pieces.forEach(p=>{
    const el = p.el;

    // pointer events work for mouse + touch
    el.addEventListener('pointerdown', startDrag);

    function startDrag(e){
      if (p.placed) return;
      el.setPointerCapture(e.pointerId);
      dragging = {
        piece: p,
        el,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: parseFloat(el.style.left) || 0,
        origTop: parseFloat(el.style.top) || 0,
        id: e.pointerId
      };
      el.style.transition = 'none';
      el.style.transform = 'none';
      el.style.zIndex = ++zIndexCounter;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', endDrag);
    }

    function onMove(ev){
      if (!dragging || dragging.id !== ev.pointerId) return;
      const dx = ev.clientX - dragging.startX;
      const dy = ev.clientY - dragging.startY;
      const nx = dragging.origLeft + dx;
      const ny = dragging.origTop + dy;
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
    }

    function endDrag(ev){
      if (!dragging || dragging.id !== ev.pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', endDrag);
      el.releasePointerCapture(ev.pointerId);
      // check snap to correct slot
      const dx = ev.clientX - dragging.startX;
      const dy = ev.clientY - dragging.startY;
      const finalLeft = dragging.origLeft + dx;
      const finalTop = dragging.origTop + dy;

      // distance to correct spot
      const distX = finalLeft - p.correctLeft;
      const distY = finalTop - p.correctTop;
      const dist = Math.hypot(distX, distY);

      // snap threshold (pixels)
      const threshold = Math.max(pieceSize.w, pieceSize.h) * 0.35;

      if(dist <= threshold){
        // snap into place
        el.style.left = p.correctLeft + 'px';
        el.style.top = p.correctTop + 'px';
        el.classList.add('placed');
        p.placed = true;
        el.dataset.placed = 'true';
        el.style.pointerEvents = 'none';
        el.style.transform = 'none';
        checkCompletion();
      } else {
        // leave where dropped
      }

      dragging = null;
    }
  });
}

function checkCompletion(){
  const allPlaced = pieces.every(p => p.placed);
  if(allPlaced){
    message.classList.remove('hidden');
  }
}

shuffleBtn.addEventListener('click', () => {
  shufflePieces();
  message.classList.add('hidden');
});

resetBtn.addEventListener('click', () => {
  // rebuild full puzzle (useful if rows/cols changed)
  buildPuzzle();
});

hintBtn.addEventListener('click', () => {
  // briefly show a faint preview of full image in the slot area
  // overlay a temporary element
  const preview = document.createElement('div');
  preview.style.position = 'absolute';
  preview.style.inset = '12px';
  preview.style.backgroundImage = `url(${IMAGE_URL})`;
  preview.style.backgroundSize = `${cols * pieceSize.w}px ${rows * pieceSize.h}px`;
  preview.style.opacity = '0.45';
  preview.style.borderRadius = '10px';
  preview.style.pointerEvents = 'none';
  preview.style.zIndex = 0;
  document.querySelector('.board').appendChild(preview);
  setTimeout(()=> preview.remove(), 900);
});

// rebuild on rows/cols change
rowsSel.addEventListener('change', buildPuzzle);
colsSel.addEventListener('change', buildPuzzle);

// initial build
window.addEventListener('load', () => {
  buildPuzzle();
  // ensure layout recalculation if window resizes (recompute correct positions)
  window.addEventListener('resize', () => {
    computeCorrectPositions();
  });
});
