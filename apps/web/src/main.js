import { Game } from "./game/Game.js";

const canvas = document.getElementById("gameCanvas");
if (!canvas) throw new Error("Missing #gameCanvas");

const game = new Game({ canvas });
game.start();

// Prevent page pan/zoom while preserving interactions in controls and pause panel.
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => {
  const target = e.target;
  if (
    target &&
    (
      target.closest?.("#pausePanel") ||
      target.closest?.("#settingsMenu") ||
      target.closest?.("#mobileControls")
    )
  ) {
    return;
  }
  e.preventDefault();
}, { passive: false });
