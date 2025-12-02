const shapes = [
  { key: "circle",   name: "Circle",   char: "⭘" },
  { key: "triangle", name: "Triangle", char: "▲" },
  { key: "square",   name: "Square",   char: "▢" },
  { key: "star",     name: "Star",     char: "★" }
];

let currentTarget = null;
let score = 0;
let isLocked = false;                 
const CORRECT_DELAY_MS = 700;         

const targetNameEl = document.getElementById("target-name");
const targetIconEl = document.getElementById("target-icon");
const scoreEl      = document.getElementById("score");
const feedbackEl   = document.getElementById("feedback");
const choiceBtns   = Array.from(document.querySelectorAll(".choice"));

function setTarget(shape) {
  currentTarget = shape;
  targetNameEl.textContent = shape.name;
  targetIconEl.textContent = shape.char;


  targetIconEl.className = "shape-icon shape-" + shape.key;


  choiceBtns.forEach(btn => btn.classList.remove("correct", "wrong"));
  feedbackEl.textContent = "";
  isLocked = false;
}

function pickRandomTarget() {
  const idx = Math.floor(Math.random() * shapes.length);
  setTarget(shapes[idx]);
}

function handleChoiceClick(e) {
  if (isLocked || !currentTarget) return;   

  const btn = e.currentTarget;
  const chosenKey = btn.dataset.shape;

  if (chosenKey === currentTarget.key) {

    isLocked = true;                        
    btn.classList.add("correct");
    feedbackEl.textContent = "Great job! That's the right shape!";
    score += 1;
    scoreEl.textContent = score;

    
    setTimeout(() => {
      pickRandomTarget();
    }, CORRECT_DELAY_MS);
  } else {
  
    btn.classList.add("wrong");
    feedbackEl.textContent = "Oops! Try again.";
  }
}

choiceBtns.forEach(btn => {
  btn.addEventListener("click", handleChoiceClick);
});



document.querySelector(".nav-home").addEventListener("click", () => {
  window.location.href = "home.html";   
});

document.querySelector(".nav-settings").addEventListener("click", () => {
  window.location.href = "profile.html";
});

pickRandomTarget();