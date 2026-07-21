# 🎮 Tetris — Go Web Game

A complete, production-quality **Tetris** game running in your browser.  
The backend is a lean Go HTTP server; the frontend is built with HTML5 Canvas and vanilla JavaScript.

---

## ✨ Features

### Gameplay
- **Standard 10 × 20 board** with the classic 7 tetrominoes (I, O, T, S, Z, J, L)
- **SRS (Super Rotation System)** wall-kick tables for accurate piece rotation
- **Lock delay** with up to 15 resets — gives you time to slide under overhangs
- **Ghost piece** — semi-transparent preview of where the piece will land
- **Hold piece** — swap the current piece into a slot once per drop (C / Shift)
- **Hard drop** — instantly lock a piece at its ghost position (Space)
- **Soft drop** — accelerate gravity (↓)
- **Combo system** — consecutive line clears multiply your score bonus
- **Increasing difficulty** — gravity speeds up every 10 lines

### Scoring (Guideline)
| Lines cleared | Base points (× level) |
|:---:|:---:|
| 1 | 100 |
| 2 | 300 |
| 3 | 500 |
| 4 (Tetris!) | 800 |

Hard-drop bonus: **+2 pts per cell** dropped.  
Combo bonus: **50 × combo × level** on top of line-clear points.

### Visual & Audio
- Dark / Light / Retro **theme switcher**
- **Neon glow blocks** with inner highlights and per-piece colours
- **Particle explosion** on piece lock and line clear
- **Procedurally synthesised sound effects** via Web Audio API (move, rotate, drop, clear, Tetris!, game over)
- **Background music** — simple melodic loop using Web Audio oscillators
- **60 FPS** render loop with `requestAnimationFrame`
- Live **FPS counter**
- Combo animation with bouncy keyframe

### Infrastructure
- **Go backend** serves all assets and provides REST APIs
- **In-memory leaderboard** (top 10) with atomic updates
- **High score** persisted in browser `localStorage`
- **Graceful shutdown** on `SIGINT` / `SIGTERM`
- **Request logging** middleware with method, path, status code, and latency
- **Health endpoint** at `/health`
- **Responsive layout** — scales to fit any viewport
- **Touch controls** on mobile (swipe left/right, swipe down, tap to rotate)
- **Fullscreen mode**

---

## 📁 Project Structure

```
tetris/
├── cmd/
│   └── server/
│       └── main.go          # Entry point — HTTP server + graceful shutdown
│
├── internal/
│   ├── config/
│   │   └── config.go        # App configuration (env vars + defaults)
│   ├── game/
│   │   └── leaderboard.go   # Thread-safe in-memory leaderboard
│   └── handlers/
│       └── handlers.go      # HTTP handlers, middleware, REST API
│
├── static/
│   ├── css/
│   │   └── style.css        # Complete CSS with dark/light/retro themes
│   └── js/
│       └── game.js          # Full game engine (Canvas, audio, particles, input)
│
├── templates/
│   └── index.html           # HTML shell with overlays and layout
│
├── go.mod
└── README.md
```

---

## 🛠 Requirements

| Tool | Version |
|------|---------|
| Go   | 1.21 +  |
| A modern browser | Chrome 88+, Firefox 85+, Safari 15+, Edge 88+ |

No external Go dependencies — the standard library is all you need.

---

## 🚀 Installation & Running

```bash
# 1. Clone the repository
git clone <your-repo-url> tetris
cd tetris

# 2. Tidy modules (no-op since there are no third-party deps)
go mod tidy

# 3. Run the server
go run ./cmd/server

# 4. Open your browser
open http://localhost:8080
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP listening port |
| `HOST` | `` (all interfaces) | HTTP listening host |
| `STATIC_DIR` | `static` | Directory for static assets |
| `TEMPLATE_DIR` | `templates` | Directory for HTML templates |
| `LOG_REQUESTS` | `true` | Enable request logging |
| `MAX_LEADERBOARD_SIZE` | `10` | Max number of leaderboard entries |

Example — run on port 3000:
```bash
PORT=3000 go run ./cmd/server
```

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| ← / → | Move left / right |
| ↑ | Rotate clockwise (SRS) |
| Z | Rotate counter-clockwise |
| ↓ | Soft drop |
| Space | Hard drop |
| C / Shift | Hold piece |
| P / Esc | Pause / Resume |
| R | Restart |

### Mobile / Touch

| Gesture | Action |
|---------|--------|
| Swipe left/right | Move piece |
| Tap | Rotate |
| Swipe up | Rotate |
| Swipe down | Soft drop |
| Long swipe down | Hard drop |

---

## 🔌 REST API

### `GET /health`
Simple health-check.

```json
{ "status": "ok", "time": "2024-01-01T00:00:00Z" }
```

### `GET /api/leaderboard`
Returns current top-10 scores.

```json
{
  "entries": [
    { "name": "Alice", "points": 12400, "level": 8, "lines": 74, "created_at": "..." }
  ]
}
```

### `POST /api/leaderboard/submit`
Submit a score.

**Request body:**
```json
{ "name": "Alice", "points": 12400, "level": 8, "lines": 74 }
```

**Response (201):**
```json
{ "message": "score submitted", "rank": 3 }
```

---

## 🎨 Themes

Click **🎨 Theme** to cycle through:
1. **Dark** (default) — deep navy with neon indigo/cyan accents
2. **Light** — soft white with purple accents
3. **Retro** — classic terminal green-on-black

---

## 🔮 Future Improvements

- [ ] **Database persistence** for leaderboard (SQLite / PostgreSQL)
- [ ] **WebSocket multiplayer** — race against a friend in real time
- [ ] **Replay recording** — save and replay past games
- [ ] **Custom key bindings** via settings menu
- [ ] **T-spin detection** and bonus points
- [ ] **All-spin bonus** (Guideline)
- [ ] **Perfect-clear bonus**
- [ ] **Gravity lock-out vs. block-out detection** (proper top-out rules)
- [ ] **Lobby system** and match-making
- [ ] **PWA manifest** for offline / installable play
- [ ] **Accessibility improvements** — screen-reader game state announcements
- [ ] **Unit tests** for game logic (board, SRS, scoring)

---

## 📜 License

MIT — feel free to use, modify, and redistribute.
