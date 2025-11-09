// Interactive hover + click logic
document.addEventListener("DOMContentLoaded", () => {
  const boxes = document.querySelectorAll(".profile-box");

  boxes.forEach(box => {
    box.addEventListener("mouseenter", () => {
      box.style.transform = "scale(1.08)";
    });
    box.addEventListener("mouseleave", () => {
      box.style.transform = "scale(1)";
    });
    box.addEventListener("click", () => {
      alert(`You clicked on: ${box.querySelector("h2").textContent}`);
    });
  });

  // Navigation buttons (demo actions)
  document.getElementById("backBtn").onclick = () => alert("Go Back");
  document.getElementById("homeBtn").onclick = () => alert("Go Home");
  document.getElementById("settingsBtn").onclick = () => alert("Open Settings");
});
