/**
 * Tetris – Complete Game Engine
 * ===========================================================
 * Modular vanilla-JS implementation using HTML5 Canvas.
 * Follows standard Tetris Guideline mechanics where possible.
 *
 * Sections:
 *  1. Constants & Tetromino Definitions
 *  2. Audio Engine
 *  3. Particle System
 *  4. Board
 *  5. Tetromino / Piece
 *  6. Ghost Piece
 *  7. Game State
 *  8. Renderer
 *  9. Input Handler
 * 10. Touch Handler
 * 11. UI Controller
 * 12. Leaderboard API
 * 13. Main Bootstrap
 */

'use strict';

/* ============================================================
   1. CONSTANTS & TETROMINO DEFINITIONS
   ============================================================ */

const COLS       = 10;
const ROWS       = 20;
const BLOCK_SIZE = 32;   // px – will be scaled for viewport

/** Tetromino shapes, each defined as (row, col) offsets from pivot. */
const TETROMINOES = {
  I: {
    color: '#22d3ee',
    shadow: '#0e7490',
    shapes: [
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
      [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[2,0],[3,0]],
    ],
    offset: [[0,-1],[1,0],[0,-1],[1,0]],  // pivot correction per rotation
  },
  O: {
    color: '#fbbf24',
    shadow: '#92400e',
    shapes: [
      [[0,0],[0,1],[1,0],[1,1]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
  T: {
    color: '#a855f7',
    shadow: '#6b21a8',
    shapes: [
      [[0,1],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[1,1]],  // actually wrong but we use SRS below
      [[0,0],[0,1],[0,2],[1,1]],
      [[0,1],[1,1],[2,1],[1,0]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
  S: {
    color: '#4ade80',
    shadow: '#166534',
    shapes: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,0],[1,0],[1,1],[2,1]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
  Z: {
    color: '#f87171',
    shadow: '#991b1b',
    shapes: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,0],[1,1],[2,0]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
  J: {
    color: '#3b82f6',
    shadow: '#1e3a8a',
    shapes: [
      [[0,0],[1,0],[1,1],[1,2]],
      [[0,0],[0,1],[1,0],[2,0]],
      [[0,0],[0,1],[0,2],[1,2]],
      [[0,1],[1,1],[2,0],[2,1]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
  L: {
    color: '#fb923c',
    shadow: '#7c2d12',
    shapes: [
      [[0,2],[1,0],[1,1],[1,2]],
      [[0,0],[1,0],[2,0],[2,1]],
      [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[0,1],[1,1],[2,1]],
    ],
    offset: [[0,0],[0,0],[0,0],[0,0]],
  },
};

/** SRS wall kick data (standard rotation system). */
const SRS_KICKS = {
  '0→1': [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
  '1→0': [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '1→2': [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
  '2→1': [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
  '2→3': [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
  '3→2': [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
  '3→0': [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
  '0→3': [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
};

const SRS_KICKS_I = {
  '0→1': [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
  '1→0': [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
  '1→2': [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
  '2→1': [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
  '2→3': [[ 0, 0],[ 2, 0],[-1, 0],[ 2, 1],[-1,-2]],
  '3→2': [[ 0, 0],[-2, 0],[ 1, 0],[-2,-1],[ 1, 2]],
  '3→0': [[ 0, 0],[ 1, 0],[-2, 0],[ 1,-2],[-2, 1]],
  '0→3': [[ 0, 0],[-1, 0],[ 2, 0],[-1, 2],[ 2,-1]],
};

/** Points awarded per lines-cleared (Guideline scoring). */
const LINE_POINTS = [0, 100, 300, 500, 800];

/** Gravity intervals (ms) per level (level 1…20). */
function gravityMs(level) {
  return Math.max(50, 1000 * Math.pow(0.85, level - 1));
}

/* ============================================================
   2. AUDIO ENGINE
   ============================================================ */

class AudioEngine {
  constructor() {
    this._ctx = null;
    this.muted = false;
    this._buffers = {};
    this._musicNode = null;
    this._musicGain = null;
    this._ready = false;
  }

  /** Lazily create the AudioContext on first user gesture. */
  _ensureCtx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {
        return false;
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return true;
  }

  toggle() {
    this.muted = !this.muted;
    if (this._musicGain) {
      this._musicGain.gain.setTargetAtTime(this.muted ? 0 : 0.15, this._ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  /** Play a synthesised sound effect. */
  play(type) {
    if (this.muted || !this._ensureCtx()) return;
    const ctx = this._ctx;
    const master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'move': {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.05);
        master.gain.setValueAtTime(0.08, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(master);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'rotate': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.07);
        master.gain.setValueAtTime(0.12, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(master);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'drop': {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        master.gain.setValueAtTime(0.2, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(master);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'clear': {
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.07);
          g.gain.linearRampToValueAtTime(0.2, now + i * 0.07 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.2);
        });
        break;
      }
      case 'tetris': {
        // Special fanfare for 4-line clear
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now + i * 0.06);
          g.gain.linearRampToValueAtTime(0.3, now + i * 0.06 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.3);
        });
        break;
      }
      case 'gameover': {
        [440, 370, 294, 220].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.18);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + i * 0.18 + 0.18);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.2, now + i * 0.18);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.18);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(now + i * 0.18);
          osc.stop(now + i * 0.18 + 0.2);
        });
        break;
      }
      case 'hold': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        master.gain.setValueAtTime(0.12, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(master);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      default:
        break;
    }
  }

  /** Simple procedural background music. */
  startMusic() {
    if (this.muted || !this._ensureCtx() || this._musicNode) return;
    const ctx = this._ctx;
    this._musicGain = ctx.createGain();
    this._musicGain.gain.value = this.muted ? 0 : 0.12;
    this._musicGain.connect(ctx.destination);
    this._playMusicNote();
  }

  _playMusicNote() {
    if (!this._ctx || !this._musicGain) return;
    const melody = [262, 294, 330, 349, 392, 349, 330, 294, 262, 220, 196, 220];
    let idx = 0;
    const ctx = this._ctx;
    const gain = this._musicGain;
    const step = () => {
      if (!gain) return;
      const freq = melody[idx % melody.length];
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(g);
      g.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      idx++;
      this._musicTimer = setTimeout(step, 480);
    };
    step();
  }

  stopMusic() {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
    if (this._musicGain) {
      this._musicGain.disconnect();
      this._musicGain = null;
      this._musicNode = null;
    }
  }
}

/* ============================================================
   3. PARTICLE SYSTEM
   ============================================================ */

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 3;
    this.alpha = 1;
    this.size = Math.random() * 5 + 2;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3;  // gravity
    this.alpha -= this.decay;
    this.size *= 0.97;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  get dead() { return this.alpha <= 0; }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color, count = 20) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  lineExplosion(row, blockSize, colors) {
    for (let col = 0; col < COLS; col++) {
      const x = col * blockSize + blockSize / 2;
      const y = row * blockSize + blockSize / 2;
      this.burst(x, y, colors[col % colors.length], 6);
    }
  }

  update() {
    this.particles = this.particles.filter(p => {
      p.update();
      return !p.dead;
    });
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}

/* ============================================================
   4. BOARD
   ============================================================ */

class Board {
  constructor() {
    /** 2D grid: null = empty, string = colour hex */
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  reset() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  /** Returns true if (row, col) is a valid empty cell. */
  isEmpty(row, col) {
    if (row < 0)          return true;  // above the board is fine
    if (row >= ROWS)      return false;
    if (col < 0 || col >= COLS) return false;
    return this.grid[row][col] === null;
  }

  /** Check whether a piece can occupy given absolute cells. */
  collides(cells) {
    return cells.some(([r, c]) => !this.isEmpty(r, c));
  }

  /** Lock a piece onto the board. */
  lock(cells, color) {
    cells.forEach(([r, c]) => {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        this.grid[r][c] = color;
      }
    });
  }

  /**
   * Clear completed rows.
   * Returns the list of cleared row indices.
   */
  clearLines() {
    const cleared = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        cleared.push(r);
      }
    }

    if (cleared.length === 0) return cleared;

    // Remove ALL full rows in one pass (avoids index-shift corruption from
    // repeated splice calls). Then prepend the right number of empty rows.
    const clearedSet = new Set(cleared);
    this.grid = this.grid.filter((_, r) => !clearedSet.has(r));
    for (let i = 0; i < cleared.length; i++) {
      this.grid.unshift(Array(COLS).fill(null));
    }

    return cleared;
  }

  /** True if any cell in row 0 is filled (game over). */
  isTopOut() {
    return this.grid[0].some(cell => cell !== null);
  }
}

/* ============================================================
   5. TETROMINO / PIECE
   ============================================================ */

class Piece {
  /**
   * @param {string} type – One of I O T S Z J L
   * @param {number} [rotationState] – 0..3
   */
  constructor(type, rotationState = 0) {
    this.type  = type;
    this.def   = TETROMINOES[type];
    this.rot   = rotationState;

    // Spawn near top-centre.
    const shape = this.def.shapes[this.rot];
    const maxCol = Math.max(...shape.map(([, c]) => c));
    this.row = -1;
    this.col = Math.floor((COLS - maxCol - 1) / 2);
  }

  /** Returns the absolute board cells occupied by this piece. */
  cells() {
    const shape = this.def.shapes[this.rot];
    return shape.map(([dr, dc]) => [this.row + dr, this.col + dc]);
  }

  /** Returns cells after applying a delta (without mutating). */
  projectedCells(drow, dcol, rot) {
    const r = rot !== undefined ? rot : this.rot;
    const shape = this.def.shapes[r];
    return shape.map(([dr, dc]) => [this.row + drow + dr, this.col + dcol + dc]);
  }

  /** Attempt to move. Returns true if successful. */
  move(drow, dcol, board) {
    const cells = this.projectedCells(drow, dcol);
    if (board.collides(cells)) return false;
    this.row += drow;
    this.col += dcol;
    return true;
  }

  /** Attempt SRS rotation. Returns true if successful. */
  rotate(dir, board) {
    const from = this.rot;
    const to   = (from + (dir === 1 ? 1 : 3)) % 4;
    const key  = `${from}→${to}`;
    const kicks = this.type === 'I' ? SRS_KICKS_I : SRS_KICKS;
    const tests = kicks[key] || [[0, 0]];

    for (const [dr, dc] of tests) {
      const cells = this.projectedCells(dr, dc, to);
      if (!board.collides(cells)) {
        this.row += dr;
        this.col += dc;
        this.rot  = to;
        return true;
      }
    }
    return false;
  }

  get color()  { return this.def.color; }
  get shadow() { return this.def.shadow; }
}

/* ============================================================
   6. GHOST PIECE
   ============================================================ */

/** Returns the row offset for the ghost (hard-drop preview). */
function ghostOffset(piece, board) {
  let drop = 0;
  while (true) {
    const cells = piece.projectedCells(drop + 1, 0);
    if (board.collides(cells)) break;
    drop++;
  }
  return drop;
}

/* ============================================================
   7. GAME STATE
   ============================================================ */

/** Generates a shuffled "bag" of the 7 tetromino types. */
function generateBag() {
  const types = Object.keys(TETROMINOES);
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

class GameState {
  constructor() {
    this.board         = new Board();
    this.particles     = new ParticleSystem();

    // Piece queues (two-bag system for lookahead).
    this._bag          = generateBag();
    this._nextBag      = generateBag();

    this.current       = this._spawnPiece();
    this.holdPiece     = null;
    this.holdUsed      = false;
    this.nextQueue     = this._buildNextQueue(3);

    // Scoring.
    this.score         = 0;
    this.highScore     = parseInt(localStorage.getItem('tetrisHighScore') || '0', 10);
    this.level         = 1;
    this.linesCleared  = 0;
    this.combo         = -1;

    // Timing.
    this.lastFall      = 0;
    this.lockDelay     = 500;   // ms
    this.lockTimer     = 0;
    this.lockResets    = 0;
    this.maxLockResets = 15;
    this.isTouching    = false;  // piece is resting on something

    // State flags.
    this.paused        = false;
    this.over          = false;
    this.started       = false;

    // Soft drop flag.
    this.softDropping  = false;
  }

  _dequeue() {
    if (this._bag.length === 0) {
      this._bag     = this._nextBag;
      this._nextBag = generateBag();
    }
    return this._bag.shift();
  }

  _spawnPiece() {
    const type = this._dequeue();
    return new Piece(type);
  }

  _buildNextQueue(n) {
    const q = [];
    for (let i = 0; i < n; i++) q.push(this._dequeue());
    return q;
  }

  /** Advance to the next piece from the queue. */
  _advance() {
    // nextQueue stores plain type strings (e.g. "I", "T"), not Piece objects.
    this.current  = new Piece(this.nextQueue[0]);
    this.nextQueue.shift();
    // Push a new type string (not a Piece) to keep the queue consistent.
    this.nextQueue.push(this._dequeue());
    this.holdUsed = false;
    this.isTouching = false;
    this.lockTimer  = 0;
    this.lockResets = 0;
  }

  /** Hold current piece; swap with held piece or spawn next. */
  hold(audio) {
    if (this.holdUsed) return;
    audio.play('hold');
    const cur = this.current.type;
    if (this.holdPiece) {
      this.current   = new Piece(this.holdPiece);
      this.holdPiece = cur;
    } else {
      this.holdPiece = cur;
      this._advance();
    }
    this.holdUsed = true;
    this.isTouching = false;
  }

  /** Compute score delta for cleared lines and apply it. */
  applyLineClear(count, audio) {
    if (count === 0) {
      this.combo = -1;
      return 0;
    }
    this.combo++;
    const comboBonus = this.combo > 0 ? 50 * this.combo * this.level : 0;
    const base       = LINE_POINTS[count] * this.level;
    const delta      = base + comboBonus;

    this.linesCleared += count;
    this.score        += delta;
    this.level         = Math.min(20, Math.floor(this.linesCleared / 10) + 1);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('tetrisHighScore', String(this.highScore));
    }

    if (count === 4) {
      audio.play('tetris');
    } else {
      audio.play('clear');
    }

    return delta;
  }

  /** Hard-drop: teleport piece to bottom and lock it. */
  hardDrop(audio) {
    let dropped = 0;
    while (this.current.move(1, 0, this.board)) {
      dropped++;
    }
    this.score += dropped * 2;
    audio.play('drop');
    this._lock(audio);
  }

  /** Lock the current piece, clear lines, spawn next. */
  _lock(audio) {
    const cells = this.current.cells();
    this.board.lock(cells, this.current.color);

    // Particle burst at locked position.
    cells.forEach(([r, c]) => {
      this.particles.burst(
        (c + 0.5) * BLOCK_SIZE,
        (r + 0.5) * BLOCK_SIZE,
        this.current.color,
        4
      );
    });

    const clearedRows = this.board.clearLines();
    if (clearedRows.length > 0) {
      clearedRows.forEach(r => {
        this.particles.lineExplosion(r, BLOCK_SIZE, [
          '#22d3ee', '#fbbf24', '#a855f7', '#4ade80', '#f87171',
        ]);
      });
    }
    this.applyLineClear(clearedRows.length, audio);

    if (this.board.isTopOut()) {
      this.over = true;
      audio.play('gameover');
      return;
    }

    this._advance();
  }

  /**
   * Main update tick. Called every animation frame.
   * @param {number} now – performance.now()
   * @param {AudioEngine} audio
   */
  tick(now, audio) {
    if (this.paused || this.over || !this.started) return;

    const interval = this.softDropping
      ? Math.min(gravityMs(this.level), 80)
      : gravityMs(this.level);

    // Check if piece is resting on something.
    const wouldCollide = this.board.collides(this.current.projectedCells(1, 0));
    this.isTouching = wouldCollide;

    if (!wouldCollide) {
      // Normal gravity fall.
      if (now - this.lastFall >= interval) {
        this.current.move(1, 0, this.board);
        this.lastFall = now;
        if (this.softDropping) this.score++;
        this.lockTimer  = 0;
      }
    } else {
      // Piece is resting: start / continue lock-delay timer.
      if (this.lockTimer === 0) this.lockTimer = now;
      if (now - this.lockTimer >= this.lockDelay) {
        this._lock(audio);
      }
    }
  }

  /** Returns ghost drop offset. */
  ghostDropOffset() {
    return ghostOffset(this.current, this.board);
  }
}

/* ============================================================
   8. RENDERER
   ============================================================ */

class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas – main game canvas
   * @param {HTMLCanvasElement} nextCanvas
   * @param {HTMLCanvasElement} holdCanvas
   */
  constructor(canvas, nextCanvas, holdCanvas) {
    this.canvas     = canvas;
    this.ctx        = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx    = nextCanvas.getContext('2d');
    this.holdCanvas = holdCanvas;
    this.holdCtx    = holdCanvas.getContext('2d');

    this.blockSize  = BLOCK_SIZE;
    this._scale();
  }

  /** Resize canvases to match COLS × ROWS at current block size. */
  _scale() {
    const w = COLS * this.blockSize;
    const h = ROWS * this.blockSize;
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  /**
   * Adjust block size so the board fits within the viewport.
   * Keeps a little margin for the side panels.
   */
  fitViewport() {
    const panelW = 220;
    const gap    = 20;
    const maxW   = window.innerWidth  - panelW * 2 - gap * 4;
    const maxH   = window.innerHeight - 40;

    const bsByW  = Math.floor(maxW / COLS);
    const bsByH  = Math.floor(maxH / ROWS);
    this.blockSize = Math.max(20, Math.min(BLOCK_SIZE, bsByW, bsByH));
    this._scale();
  }

  /** Draw a single block with neon glow effect. */
  _drawBlock(ctx, x, y, size, color, shadowColor, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow / glow
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;

    // Gradient face
    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, lighten(color, 40));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

    // Top/left highlight
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = lighten(color, 60);
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + size - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + size - 1, y + 1);
    ctx.stroke();

    // Bottom/right shadow
    ctx.strokeStyle = darken(color, 40);
    ctx.beginPath();
    ctx.moveTo(x + size - 1, y + 1);
    ctx.lineTo(x + size - 1, y + size - 1);
    ctx.lineTo(x + 1, y + size - 1);
    ctx.stroke();

    ctx.restore();
  }

  /** Render everything for a single frame. */
  render(state) {
    const ctx  = this.ctx;
    const bs   = this.blockSize;
    const w    = this.canvas.width;
    const h    = this.canvas.height;

    // Background
    ctx.clearRect(0, 0, w, h);

    // Grid background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f0f20');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Faint grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * bs);
      ctx.lineTo(w, r * bs);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * bs, 0);
      ctx.lineTo(c * bs, h);
      ctx.stroke();
    }

    // Locked board cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.board.grid[r][c];
        if (color) {
          this._drawBlock(ctx, c * bs, r * bs, bs, color, darken(color, 30));
        }
      }
    }

    // Ghost piece
    if (!state.over) {
      const drop   = state.ghostDropOffset();
      const ghost  = state.current.cells().map(([r, c]) => [r + drop, c]);
      ghost.forEach(([r, c]) => {
        if (r >= 0 && r < ROWS) {
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = state.current.color;
          ctx.lineWidth   = 1.5;
          ctx.strokeRect(c * bs + 1, r * bs + 1, bs - 2, bs - 2);
          ctx.restore();
        }
      });
    }

    // Active piece
    if (!state.over) {
      state.current.cells().forEach(([r, c]) => {
        if (r >= 0) {
          this._drawBlock(ctx, c * bs, r * bs, bs, state.current.color, state.current.shadow);
        }
      });
    }

    // Particles
    state.particles.update();
    state.particles.draw(ctx);

    // Render previews
    this._renderPreview(this.nextCtx, this.nextCanvas, state.nextQueue[0]);
    this._renderPreview(this.holdCtx, this.holdCanvas, state.holdPiece ? { type: state.holdPiece } : null);
  }

  /** Render a single piece centred in a small preview canvas. */
  _renderPreview(ctx, canvas, pieceOrNull) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark background
    ctx.fillStyle = '#0f0f20';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!pieceOrNull) return;

    const type  = pieceOrNull.type || pieceOrNull;
    const def   = TETROMINOES[type];
    const shape = def.shapes[0];

    const minR = Math.min(...shape.map(([r]) => r));
    const minC = Math.min(...shape.map(([, c]) => c));
    const maxR = Math.max(...shape.map(([r]) => r));
    const maxC = Math.max(...shape.map(([, c]) => c));

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const bs   = Math.min(
      Math.floor((canvas.width  - 16) / cols),
      Math.floor((canvas.height - 16) / rows),
      24
    );
    const offX = (canvas.width  - cols * bs) / 2;
    const offY = (canvas.height - rows * bs) / 2;

    shape.forEach(([r, c]) => {
      const x = offX + (c - minC) * bs;
      const y = offY + (r - minR) * bs;
      this._drawBlock(ctx, x, y, bs, def.color, def.shadow);
    });
  }
}

/* ── Colour helpers ─────────────────────────────────────────── */

/** Convert hex colour to RGB array. */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten a hex colour by amount (0-255). */
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${clamp(r+amt)},${clamp(g+amt)},${clamp(b+amt)})`;
}

/** Darken a hex colour by amount (0-255). */
function darken(hex, amt) {
  return lighten(hex, -amt);
}

function clamp(v) { return Math.max(0, Math.min(255, v)); }

/* ============================================================
   9. INPUT HANDLER
   ============================================================ */

class InputHandler {
  /**
   * @param {GameState} state
   * @param {AudioEngine} audio
   * @param {UIController} ui
   */
  constructor(state, audio, ui) {
    this.state = state;
    this.audio = audio;
    this.ui    = ui;

    // DAS (Delayed Auto Shift) timing.
    this._das       = { left: false, right: false };
    this._dasDelay  = 170;   // ms before repeat
    this._dasRepeat = 50;    // ms repeat interval
    this._dasTimers = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    Object.values(this._dasTimers).forEach(clearTimeout);
  }

  _onKeyDown(e) {
    const s = this.state;
    const a = this.audio;

    // Global keys (always active).
    if (e.code === 'KeyR') {
      e.preventDefault();
      this.ui.restart();
      return;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      this.ui.togglePause();
      return;
    }

    if (s.paused || s.over || !s.started) return;

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        if (!this._das.left) {
          this._moveLeft();
          this._das.left = true;
          this._dasTimers.left = setTimeout(() => {
            this._dasTimers.leftInterval = setInterval(() => this._moveLeft(), this._dasRepeat);
          }, this._dasDelay);
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (!this._das.right) {
          this._moveRight();
          this._das.right = true;
          this._dasTimers.right = setTimeout(() => {
            this._dasTimers.rightInterval = setInterval(() => this._moveRight(), this._dasRepeat);
          }, this._dasDelay);
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        s.softDropping = true;
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._rotate(1);
        break;

      case 'KeyZ':
        e.preventDefault();
        this._rotate(-1);
        break;

      case 'Space':
        e.preventDefault();
        s.hardDrop(a);
        break;

      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        e.preventDefault();
        s.hold(a);
        break;

      default:
        break;
    }
  }

  _onKeyUp(e) {
    if (e.code === 'ArrowLeft') {
      this._das.left = false;
      clearTimeout(this._dasTimers.left);
      clearInterval(this._dasTimers.leftInterval);
    }
    if (e.code === 'ArrowRight') {
      this._das.right = false;
      clearTimeout(this._dasTimers.right);
      clearInterval(this._dasTimers.rightInterval);
    }
    if (e.code === 'ArrowDown') {
      this.state.softDropping = false;
    }
  }

  _moveLeft() {
    if (this.state.current.move(0, -1, this.state.board)) {
      this.audio.play('move');
      this._resetLock();
    }
  }

  _moveRight() {
    if (this.state.current.move(0, 1, this.state.board)) {
      this.audio.play('move');
      this._resetLock();
    }
  }

  _rotate(dir) {
    if (this.state.current.rotate(dir, this.state.board)) {
      this.audio.play('rotate');
      this._resetLock();
    }
  }

  /** Reset lock delay on movement (up to maxLockResets times). */
  _resetLock() {
    if (this.state.isTouching && this.state.lockResets < this.state.maxLockResets) {
      this.state.lockTimer = 0;
      this.state.lockResets++;
    }
  }
}

/* ============================================================
   10. TOUCH HANDLER
   ============================================================ */

class TouchHandler {
  constructor(canvas, state, audio, ui) {
    this.canvas = canvas;
    this.state  = state;
    this.audio  = audio;
    this.ui     = ui;

    this._startX   = 0;
    this._startY   = 0;
    this._startT   = 0;
    this._moved    = false;
    this._tapCount = 0;

    this._onStart = this._onStart.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onEnd   = this._onEnd.bind(this);

    canvas.addEventListener('touchstart', this._onStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onEnd,   { passive: false });
  }

  _onStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    this._startX = t.clientX;
    this._startY = t.clientY;
    this._startT = Date.now();
    this._moved  = false;
  }

  _onMove(e) {
    e.preventDefault();
    const s    = this.state;
    if (s.paused || s.over || !s.started) return;

    const t    = e.touches[0];
    const dx   = t.clientX - this._startX;
    const dy   = t.clientY - this._startY;
    const bs   = this.canvas.width / COLS;

    if (Math.abs(dx) > bs && !this._moved) {
      this._moved = true;
      if (dx > 0) s.current.move(0,  1, s.board);
      else        s.current.move(0, -1, s.board);
      this.audio.play('move');
      this._startX = t.clientX;
    }

    if (dy > bs * 0.8 && !this._moved) {
      this._moved = true;
      s.softDropping = true;
    }
  }

  _onEnd(e) {
    e.preventDefault();
    const s   = this.state;
    const dt  = Date.now() - this._startT;
    const t   = e.changedTouches[0];
    const dx  = Math.abs(t.clientX - this._startX);
    const dy  = t.clientY - this._startY;

    s.softDropping = false;

    if (!this._moved) {
      if (dy < -60) {
        // Swipe up → rotate.
        if (!s.paused && !s.over && s.started) {
          s.current.rotate(1, s.board);
          this.audio.play('rotate');
        }
      } else if (dt < 250 && dx < 20) {
        // Tap → rotate.
        if (!s.paused && !s.over && s.started) {
          s.current.rotate(1, s.board);
          this.audio.play('rotate');
        }
      } else if (dy > 80) {
        // Swipe down → hard drop.
        if (!s.paused && !s.over && s.started) {
          s.hardDrop(this.audio);
        }
      }
    }
  }
}

/* ============================================================
   11. UI CONTROLLER
   ============================================================ */

class UIController {
  constructor() {
    // Elements
    this.$score      = document.getElementById('score-display');
    this.$highScore  = document.getElementById('high-score-display');
    this.$level      = document.getElementById('level-display');
    this.$lines      = document.getElementById('lines-display');
    this.$fps        = document.getElementById('fps-display');
    this.$combo      = document.getElementById('combo-display');
    this.$comboCount = document.getElementById('combo-count');

    this.$pauseOverlay    = document.getElementById('pause-overlay');
    this.$gameoverOverlay = document.getElementById('gameover-overlay');
    this.$lbOverlay       = document.getElementById('leaderboard-overlay');
    this.$finalScore      = document.getElementById('final-score-text');
    this.$finalLevel      = document.getElementById('final-level-text');
    this.$playerName      = document.getElementById('player-name');
    this.$submitFeedback  = document.getElementById('submit-feedback');
    this.$lbBody          = document.getElementById('leaderboard-body');

    // Callbacks (set externally).
    this.onRestart      = () => {};
    this.onTogglePause  = () => {};
    this.onSubmitScore  = () => {};

    this._comboTimer = null;
    this._themes     = ['dark', 'light', 'retro'];
    this._themeIdx   = 0;

    this._bindButtons();
  }

  _bindButtons() {
    document.getElementById('btn-pause')
      .addEventListener('click', () => this.togglePause());

    document.getElementById('btn-restart')
      .addEventListener('click', () => this.restart());

    document.getElementById('btn-restart-over')
      .addEventListener('click', () => this.restart());

    document.getElementById('btn-resume')
      .addEventListener('click', () => this.togglePause());

    document.getElementById('btn-leaderboard')
      .addEventListener('click', () => this.showLeaderboard());

    document.getElementById('btn-close-lb')
      .addEventListener('click', () => this.hideLeaderboard());

    document.getElementById('btn-fullscreen')
      .addEventListener('click', () => this.toggleFullscreen());

    document.getElementById('btn-sound')
      .addEventListener('click', () => {
        const muted = audio.toggle();
        document.getElementById('btn-sound').textContent = muted ? '🔇 Sound' : '🔊 Sound';
      });

    document.getElementById('btn-theme')
      .addEventListener('click', () => this.cycleTheme());

    document.getElementById('btn-submit-score')
      .addEventListener('click', () => this.onSubmitScore());

    // Close leaderboard on backdrop click.
    this.$lbOverlay.addEventListener('click', e => {
      if (e.target === this.$lbOverlay) this.hideLeaderboard();
    });
  }

  update(state) {
    this.$score.textContent     = formatNumber(state.score);
    this.$highScore.textContent = formatNumber(state.highScore);
    this.$level.textContent     = state.level;
    this.$lines.textContent     = state.linesCleared;
  }

  updateFPS(fps) {
    this.$fps.textContent = fps;
  }

  showCombo(count) {
    if (count <= 0) return;
    this.$comboCount.textContent = count;
    this.$combo.classList.remove('hidden');
    // Retrigg animation.
    this.$combo.style.animation = 'none';
    void this.$combo.offsetHeight;
    this.$combo.style.animation = '';

    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => {
      this.$combo.classList.add('hidden');
    }, 2000);
  }

  animateScore() {
    this.$score.classList.remove('score-pop');
    void this.$score.offsetHeight;
    this.$score.classList.add('score-pop');
  }

  showPause() {
    this.$pauseOverlay.classList.remove('hidden');
  }
  hidePause() {
    this.$pauseOverlay.classList.add('hidden');
  }
  togglePause() {
    this.onTogglePause();
  }

  showGameOver(score, level) {
    this.$finalScore.textContent    = `Score: ${formatNumber(score)}`;
    this.$finalLevel.textContent    = `Level: ${level}`;
    this.$submitFeedback.classList.add('hidden');
    this.$gameoverOverlay.classList.remove('hidden');
    // Focus name input for accessibility.
    setTimeout(() => this.$playerName.focus(), 300);
  }
  hideGameOver() {
    this.$gameoverOverlay.classList.add('hidden');
  }

  showLeaderboard() {
    this.$lbOverlay.classList.remove('hidden');
    loadLeaderboard(this.$lbBody);
  }
  hideLeaderboard() {
    this.$lbOverlay.classList.add('hidden');
  }

  restart() {
    this.hideGameOver();
    this.hidePause();
    this.onRestart();
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  cycleTheme() {
    const body = document.body;
    // Remove old theme class.
    if (this._themeIdx === 1) body.classList.remove('theme-light');
    if (this._themeIdx === 2) body.classList.remove('theme-retro');
    this._themeIdx = (this._themeIdx + 1) % this._themes.length;
    if (this._themeIdx === 1) body.classList.add('theme-light');
    if (this._themeIdx === 2) body.classList.add('theme-retro');
  }

  setSubmitFeedback(msg, isError = false) {
    this.$submitFeedback.textContent = msg;
    this.$submitFeedback.classList.toggle('error', isError);
    this.$submitFeedback.classList.remove('hidden');
  }
}

/* ============================================================
   12. LEADERBOARD API
   ============================================================ */

async function submitScore(name, points, level, lines) {
  const res = await fetch('/api/leaderboard/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, points, level, lines }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadLeaderboard(tbody) {
  tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">Loading…</td></tr>';
  try {
    const res  = await fetch('/api/leaderboard');
    const data = await res.json();
    const entries = data.entries || [];

    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">No entries yet – be the first!</td></tr>';
      return;
    }

    tbody.innerHTML = entries.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${formatNumber(e.points)}</td>
        <td>${e.level}</td>
        <td>${e.lines}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">Failed to load leaderboard.</td></tr>';
  }
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function formatNumber(n) {
  return n.toLocaleString();
}

/* ============================================================
   13. MAIN BOOTSTRAP
   ============================================================ */

// Module-level singletons.
const audio  = new AudioEngine();
let state    = new GameState();
let renderer = null;
let input    = null;
let touch    = null;
const ui     = new UIController();

// FPS tracking.
let _lastFrameTime = 0;
let _frameTimes    = [];

/** Main game loop driven by requestAnimationFrame. */
function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  // FPS calculation (rolling average over 30 frames).
  if (_lastFrameTime > 0) {
    _frameTimes.push(now - _lastFrameTime);
    if (_frameTimes.length > 30) _frameTimes.shift();
    const avg = _frameTimes.reduce((a, b) => a + b, 0) / _frameTimes.length;
    ui.updateFPS(Math.round(1000 / avg));
  }
  _lastFrameTime = now;

  // Update game logic.
  const prevScore = state.score;
  state.tick(now, audio);

  // Detect score change for combo/score-pop.
  if (state.score !== prevScore) {
    ui.animateScore();
  }
  if (state.combo > 0) {
    ui.showCombo(state.combo + 1);
  }

  // Update HUD.
  ui.update(state);

  // Render.
  renderer.render(state);

  // Game-over trigger (once).
  if (state.over && !state._overShown) {
    state._overShown = true;
    setTimeout(() => ui.showGameOver(state.score, state.level), 600);
  }
}

/** Initialise / reinitialise the game. */
function initGame() {
  if (input) input.destroy();

  state = new GameState();
  state.started = true;

  input = new InputHandler(state, audio, ui);
  if (renderer) {
    touch = new TouchHandler(
      document.getElementById('game-canvas'), state, audio, ui
    );
  }

  audio.stopMusic();
  audio.startMusic();
}

/** Called once on first load after DOM is ready. */
function bootstrap() {
  const gameCanvas = document.getElementById('game-canvas');
  const nextCanvas = document.getElementById('next-canvas');
  const holdCanvas = document.getElementById('hold-canvas');

  renderer = new Renderer(gameCanvas, nextCanvas, holdCanvas);
  renderer.fitViewport();

  // Re-fit on resize.
  window.addEventListener('resize', () => {
    renderer.fitViewport();
  });

  // Wire UI callbacks.
  ui.onRestart = initGame;

  ui.onTogglePause = () => {
    if (state.over || !state.started) return;
    state.paused = !state.paused;
    if (state.paused) {
      ui.showPause();
      audio.stopMusic();
    } else {
      ui.hidePause();
      audio.startMusic();
    }
  };

  ui.onSubmitScore = async () => {
    const name   = document.getElementById('player-name').value.trim() || 'Anonymous';
    const points = state.score;
    const level  = state.level;
    const lines  = state.linesCleared;
    try {
      const data = await submitScore(name, points, level, lines);
      ui.setSubmitFeedback(`✓ Submitted! You ranked #${data.rank}`, false);
    } catch (err) {
      ui.setSubmitFeedback('✗ Could not submit score.', true);
    }
  };

  // Start immediately.
  initGame();

  // Kick off the render loop.
  requestAnimationFrame(gameLoop);
}

// Wait for DOM.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
