import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, Minesweeper } from "./game.js";

test("first reveal and its neighbors are safe", () => {
  const game = new Minesweeper(LEVELS.beginner, () => 0.25);
  game.reveal(40, 1000);
  assert.equal(game.cells[40].mine, false);
  for (const index of game.neighbors(40)) {
    assert.equal(game.cells[index].mine, false);
  }
  assert.equal(game.cells.filter((cell) => cell.mine).length, 10);
});

test("flags update the remaining mine count", () => {
  const game = new Minesweeper(LEVELS.beginner);
  assert.equal(game.toggleFlag(0, 1000), true);
  assert.equal(game.flagCount, 1);
  assert.equal(game.toggleFlag(0, 1200), true);
  assert.equal(game.flagCount, 0);
});

test("revealing every safe cell wins and flags mines", () => {
  const game = new Minesweeper({ rows: 2, cols: 2, mines: 1 }, () => 0);
  game.reveal(0, 1000);
  game.cells.forEach((cell, index) => {
    if (!cell.mine) game.reveal(index, 2000);
  });
  assert.equal(game.status, "won");
  assert.equal(game.flagCount, 1);
});

test("revealing a mine loses the game", () => {
  const game = new Minesweeper({ rows: 3, cols: 3, mines: 1 }, () => 0);
  game.reveal(0, 1000);
  const mineIndex = game.cells.findIndex((cell) => cell.mine);
  game.reveal(mineIndex, 2000);
  assert.equal(game.status, "lost");
  assert.equal(game.cells[mineIndex].exploded, true);
});
