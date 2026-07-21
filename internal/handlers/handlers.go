// Package handlers wires together HTTP routes and their handler functions.
package handlers

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"tetris/internal/game"
)

// loggingResponseWriter wraps http.ResponseWriter to capture the status code.
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Logger is middleware that logs every HTTP request with timing information.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(lrw, r)

		log.Printf("%s %s %d %s", r.Method, r.RequestURI, lrw.statusCode, time.Since(start))
	})
}

// Handler holds all shared dependencies for HTTP handlers.
type Handler struct {
	templates   *template.Template
	leaderboard *game.Leaderboard
	staticDir   string
}

// New creates a new Handler, pre-parsing all templates from templateDir.
func New(templateDir, staticDir string, lb *game.Leaderboard) (*Handler, error) {
	pattern := filepath.Join(templateDir, "*.html")
	tmpl, err := template.ParseGlob(pattern)
	if err != nil {
		return nil, err
	}

	return &Handler{
		templates:   tmpl,
		leaderboard: lb,
		staticDir:   staticDir,
	}, nil
}

// RegisterRoutes attaches all application routes to mux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	// Serve static files (CSS, JS, images, sounds).
	fs := http.FileServer(http.Dir(h.staticDir))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Application pages.
	mux.HandleFunc("/", h.indexHandler)
	mux.HandleFunc("/health", h.healthHandler)

	// Leaderboard API.
	mux.HandleFunc("/api/leaderboard", h.leaderboardHandler)
	mux.HandleFunc("/api/leaderboard/submit", h.submitScoreHandler)
}

// ------- Page Handlers -------

// indexHandler renders the main game page.
func (h *Handler) indexHandler(w http.ResponseWriter, r *http.Request) {
	// Only handle the root path.
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := h.templates.ExecuteTemplate(w, "index.html", nil); err != nil {
		log.Printf("template error: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

// healthHandler returns a simple JSON health-check response.
func (h *Handler) healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

// ------- API Handlers -------

// leaderboardHandler returns the current leaderboard as JSON.
func (h *Handler) leaderboardHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	entries := h.leaderboard.Entries()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
	})
}

// submitScoreHandler accepts a POST with a JSON score body and adds it to the leaderboard.
func (h *Handler) submitScoreHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body to 4 KB.
	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var payload struct {
		Name   string `json:"name"`
		Points int    `json:"points"`
		Level  int    `json:"level"`
		Lines  int    `json:"lines"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Basic sanitisation.
	payload.Name = strings.TrimSpace(payload.Name)
	if payload.Name == "" {
		payload.Name = "Anonymous"
	}
	if len(payload.Name) > 32 {
		payload.Name = payload.Name[:32]
	}
	if payload.Points < 0 {
		payload.Points = 0
	}

	score := game.Score{
		Name:   payload.Name,
		Points: payload.Points,
		Level:  payload.Level,
		Lines:  payload.Lines,
	}

	h.leaderboard.Add(score)
	rank := h.leaderboard.Rank(score.Points)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "score submitted",
		"rank":    rank,
	})
}

// ------- Helpers -------

// writeJSON encodes v as JSON and writes it to w with the given status code.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("json encode error: %v", err)
	}
}
