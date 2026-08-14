import {
  Bomb,
  Flag,
  MousePointer2,
  RotateCcw,
  Timer,
  Trophy,
  createIcons,
} from "lucide";
import { LEVELS, Minesweeper } from "./game.js";
import "./style.css";

const icons = { Bomb, Flag, MousePointer2, RotateCcw, Timer, Trophy };
const board = document.querySelector("#board");
const boardScroll = document.querySelector("#board-scroll");
const mineCount = document.querySelector("#mine-count");
const timer = document.querySelector("#timer");
const status = document.querySelector("#game-status");
const boardSize = document.querySelector("#board-size");
const bestTime = document.querySelector("#best-time");
const footerLevel = document.querySelector("#footer-level");
const celebration = document.querySelector("#celebration");

let levelKey = localStorage.getItem("minesweeper-level") || "beginner";
if (!LEVELS[levelKey]) levelKey = "beginner";
let game = new Minesweeper(LEVELS[levelKey]);
let inputMode = "reveal";
let focusedIndex = 0;
let longPressTimer = null;
let longPressIndex = null;
let suppressClickIndex = null;
let previousStatus = game.status;

function iconMarkup(name, size = 17) {
  return `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;
}

function padCounter(value) {
  const safe = Math.max(-99, Math.min(9999, value));
  return safe < 0 ? `-${String(Math.abs(safe)).padStart(2, "0")}` : String(safe).padStart(3, "0");
}

function bestKey() {
  return `minesweeper-best-${levelKey}`;
}

function updateBest() {
  const value = Number(localStorage.getItem(bestKey()));
  bestTime.textContent = value > 0 ? `${value}s` : "--";
}

function createCelebration() {
  celebration.replaceChildren();
  const colors = ["#f2c94c", "#2d6a4f", "#e85d4a", "#277da1", "#ffffff"];
  for (let i = 0; i < 32; i += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${5 + Math.random() * 90}vw`);
    piece.style.setProperty("--delay", `${Math.random() * 0.5}s`);
    piece.style.setProperty("--drift", `${-60 + Math.random() * 120}px`);
    piece.style.background = colors[i % colors.length];
    celebration.append(piece);
  }
  celebration.classList.remove("active");
  requestAnimationFrame(() => celebration.classList.add("active"));
}

function renderBoard() {
  const { rows, cols } = game.level;
  board.style.setProperty("--rows", rows);
  board.style.setProperty("--cols", cols);
  board.dataset.level = levelKey;
  boardScroll.style.setProperty("--rows", rows);
  boardScroll.style.setProperty("--cols", cols);
  boardScroll.dataset.level = levelKey;
  board.setAttribute("aria-rowcount", rows);
  board.setAttribute("aria-colcount", cols);

  board.innerHTML = game.cells
    .map((cell, index) => {
      const row = Math.floor(index / cols) + 1;
      const col = (index % cols) + 1;
      const classes = ["cell"];
      let content = "";
      let label = `第 ${row} 行，第 ${col} 列，未翻开`;
      if (cell.revealed) classes.push("revealed");
      if (cell.flagged) {
        classes.push("flagged");
        content = iconMarkup("flag", 16);
        label = `第 ${row} 行，第 ${col} 列，已标记`;
      }
      if (cell.revealed && cell.mine) {
        classes.push("mine");
        content = iconMarkup("bomb", 18);
        label = `第 ${row} 行，第 ${col} 列，地雷`;
      } else if (cell.revealed && cell.adjacent > 0) {
        classes.push(`n${cell.adjacent}`);
        content = String(cell.adjacent);
        label = `第 ${row} 行，第 ${col} 列，周围 ${cell.adjacent} 颗雷`;
      } else if (cell.revealed) {
        label = `第 ${row} 行，第 ${col} 列，安全空格`;
      }
      if (cell.exploded) classes.push("exploded");
      if (cell.wrong) {
        classes.push("wrong");
        content = `${iconMarkup("flag", 15)}<span aria-hidden="true">×</span>`;
        label = `第 ${row} 行，第 ${col} 列，错误标记`;
      }
      return `<button class="${classes.join(" ")}" type="button" role="gridcell" data-index="${index}" aria-label="${label}" aria-rowindex="${row}" aria-colindex="${col}" tabindex="${index === focusedIndex ? 0 : -1}">${content}</button>`;
    })
    .join("");
}

function renderChrome() {
  const level = game.level;
  mineCount.textContent = padCounter(level.mines - game.flagCount);
  timer.textContent = padCounter(game.elapsedSeconds);
  boardSize.textContent = `${level.cols} × ${level.rows} · ${level.mines} 雷`;
  footerLevel.textContent = `${level.label} · ${level.cols} × ${level.rows}`;

  const labels = {
    ready: "准备排雷",
    playing: "排雷中",
    won: "雷区已清除",
    lost: "触雷，重新部署",
  };
  status.textContent = labels[game.status];
  status.dataset.state = game.status;

  document.querySelectorAll("[data-level]").forEach((button) => {
    const active = button.dataset.level === levelKey;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === inputMode));
  });
  updateBest();
}

function render({ keepFocus = false } = {}) {
  renderBoard();
  renderChrome();
  createIcons({ icons });
  if (keepFocus) board.querySelector(`[data-index="${focusedIndex}"]`)?.focus();

  if (game.status === "won" && previousStatus !== "won") {
    const oldBest = Number(localStorage.getItem(bestKey()));
    if (!oldBest || game.elapsedSeconds < oldBest) {
      localStorage.setItem(bestKey(), String(game.elapsedSeconds));
      updateBest();
    }
    createCelebration();
  }
  previousStatus = game.status;
}

function act(index, action = inputMode) {
  focusedIndex = index;
  const cell = game.cells[index];
  if (!cell) return;
  let changed = false;
  if (action === "flag") {
    changed = game.toggleFlag(index);
  } else if (cell.revealed) {
    changed = game.chord(index);
  } else {
    changed = game.reveal(index);
  }
  if (changed) render({ keepFocus: true });
}

function reset(nextLevel = levelKey) {
  levelKey = nextLevel;
  localStorage.setItem("minesweeper-level", levelKey);
  game = new Minesweeper(LEVELS[levelKey]);
  previousStatus = game.status;
  focusedIndex = 0;
  celebration.classList.remove("active");
  render();
  boardScroll.scrollTo({ left: 0, behavior: "smooth" });
}

board.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const index = Number(cell.dataset.index);
  if (suppressClickIndex === index) {
    suppressClickIndex = null;
    return;
  }
  act(index);
});

board.addEventListener("contextmenu", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  act(Number(cell.dataset.index), "flag");
});

board.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" || event.button !== 0) return;
  const cell = event.target.closest(".cell");
  if (!cell) return;
  longPressIndex = Number(cell.dataset.index);
  longPressTimer = window.setTimeout(() => {
    suppressClickIndex = longPressIndex;
    act(longPressIndex, "flag");
    navigator.vibrate?.(35);
    longPressTimer = null;
  }, 460);
});

function cancelLongPress() {
  if (longPressTimer) window.clearTimeout(longPressTimer);
  longPressTimer = null;
  longPressIndex = null;
}

board.addEventListener("pointerup", cancelLongPress);
board.addEventListener("pointercancel", cancelLongPress);
board.addEventListener("pointerleave", cancelLongPress);

board.addEventListener("keydown", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  const { rows, cols } = game.level;
  const index = Number(cell.dataset.index);
  const row = Math.floor(index / cols);
  const col = index % cols;
  let next = index;
  if (event.key === "ArrowLeft") next = row * cols + Math.max(0, col - 1);
  else if (event.key === "ArrowRight") next = row * cols + Math.min(cols - 1, col + 1);
  else if (event.key === "ArrowUp") next = Math.max(0, row - 1) * cols + col;
  else if (event.key === "ArrowDown") next = Math.min(rows - 1, row + 1) * cols + col;
  else if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    act(index, "flag");
    return;
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    act(index, "reveal");
    return;
  } else return;
  event.preventDefault();
  focusedIndex = next;
  render({ keepFocus: true });
});

document.querySelector("#restart").addEventListener("click", () => reset());
document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => reset(button.dataset.level));
});
document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    inputMode = button.dataset.mode;
    renderChrome();
    createIcons({ icons });
  });
});

window.setInterval(() => {
  if (game.status === "playing") timer.textContent = padCounter(game.elapsedSeconds);
}, 250);

render();
