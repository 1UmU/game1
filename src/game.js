export const LEVELS = {
  beginner: { label: "初级", rows: 9, cols: 9, mines: 10 },
  intermediate: { label: "中级", rows: 16, cols: 16, mines: 40 },
  expert: { label: "专家", rows: 16, cols: 30, mines: 99 },
};

function makeCell() {
  return {
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    exploded: false,
    wrong: false,
  };
}

export class Minesweeper {
  constructor(level = LEVELS.beginner, random = Math.random) {
    this.random = random;
    this.reset(level);
  }

  reset(level = this.level) {
    this.level = { ...level };
    this.cells = Array.from(
      { length: this.level.rows * this.level.cols },
      makeCell,
    );
    this.status = "ready";
    this.minesPlaced = false;
    this.revealedCount = 0;
    this.flagCount = 0;
    this.startedAt = null;
    this.finishedAt = null;
  }

  get elapsedSeconds() {
    if (!this.startedAt) return 0;
    const end = this.finishedAt ?? Date.now();
    return Math.min(9999, Math.floor((end - this.startedAt) / 1000));
  }

  neighbors(index) {
    const { rows, cols } = this.level;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const result = [];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (
          nextRow >= 0 &&
          nextRow < rows &&
          nextCol >= 0 &&
          nextCol < cols
        ) {
          result.push(nextRow * cols + nextCol);
        }
      }
    }
    return result;
  }

  start(now = Date.now()) {
    if (this.status !== "ready") return;
    this.status = "playing";
    this.startedAt = now;
  }

  placeMines(firstIndex) {
    if (this.minesPlaced) return;
    const protectedCells = new Set([firstIndex, ...this.neighbors(firstIndex)]);
    let candidates = this.cells
      .map((_, index) => index)
      .filter((index) => !protectedCells.has(index));

    if (candidates.length < this.level.mines) {
      candidates = this.cells
        .map((_, index) => index)
        .filter((index) => index !== firstIndex);
    }

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const index of candidates.slice(0, this.level.mines)) {
      this.cells[index].mine = true;
    }

    this.cells.forEach((cell, index) => {
      if (!cell.mine) {
        cell.adjacent = this.neighbors(index).filter(
          (neighbor) => this.cells[neighbor].mine,
        ).length;
      }
    });
    this.minesPlaced = true;
  }

  reveal(index, now = Date.now()) {
    if (this.status === "won" || this.status === "lost") return false;
    const cell = this.cells[index];
    if (!cell || cell.flagged || cell.revealed) return false;

    this.start(now);
    this.placeMines(index);

    if (cell.mine) {
      cell.exploded = true;
      this.lose(now);
      return true;
    }

    this.floodReveal(index);
    this.checkWin(now);
    return true;
  }

  floodReveal(startIndex) {
    const queue = [startIndex];
    const queued = new Set(queue);
    while (queue.length) {
      const index = queue.shift();
      const cell = this.cells[index];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      this.revealedCount += 1;
      if (cell.adjacent !== 0) continue;
      for (const neighbor of this.neighbors(index)) {
        const next = this.cells[neighbor];
        if (!queued.has(neighbor) && !next.revealed && !next.flagged) {
          queued.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  toggleFlag(index, now = Date.now()) {
    if (this.status === "won" || this.status === "lost") return false;
    const cell = this.cells[index];
    if (!cell || cell.revealed) return false;
    this.start(now);
    cell.flagged = !cell.flagged;
    this.flagCount += cell.flagged ? 1 : -1;
    return true;
  }

  chord(index, now = Date.now()) {
    if (this.status !== "playing") return false;
    const cell = this.cells[index];
    if (!cell?.revealed || cell.adjacent === 0) return false;
    const neighbors = this.neighbors(index);
    const flags = neighbors.filter((neighbor) => this.cells[neighbor].flagged).length;
    if (flags !== cell.adjacent) return false;

    let changed = false;
    for (const neighbor of neighbors) {
      const next = this.cells[neighbor];
      if (next.revealed || next.flagged) continue;
      if (next.mine) {
        next.exploded = true;
        this.lose(now);
        return true;
      }
      this.floodReveal(neighbor);
      changed = true;
    }
    this.checkWin(now);
    return changed;
  }

  checkWin(now = Date.now()) {
    if (this.revealedCount !== this.cells.length - this.level.mines) return;
    this.status = "won";
    this.finishedAt = now;
    this.cells.forEach((cell) => {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        this.flagCount += 1;
      }
    });
  }

  lose(now = Date.now()) {
    this.status = "lost";
    this.finishedAt = now;
    this.cells.forEach((cell) => {
      if (cell.mine) cell.revealed = true;
      if (cell.flagged && !cell.mine) cell.wrong = true;
    });
  }
}
