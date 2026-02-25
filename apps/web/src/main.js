import { Game } from "./game/Game.js";

const canvas = document.getElementById("c");
const game = new Game({ canvas });

game.start();

// Prevent gesture zoom weirdness
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => {
  const target = e.target;
  if (target && (target.closest?.("#settingsMenu") || target.closest?.("#mobileControls"))) {
    return;
  }
  e.preventDefault();
}, { passive: false });
