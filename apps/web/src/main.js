import { Game } from "./game/Game.js";

const canvas = document.getElementById("c");
const game = new Game({ canvas });

game.start();

// Prevent gesture zoom weirdness
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
