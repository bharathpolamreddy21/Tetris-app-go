// main is the entry point for the Tetris web server.
//
// Usage:
//
//	go run ./cmd/server
//
// The server listens on localhost:8080 by default. Override with PORT env var.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tetris/internal/config"
	"tetris/internal/game"
	"tetris/internal/handlers"
)

func main() {
	// ── Configuration ────────────────────────────────────────────────────────
	cfg := config.Default()

	// ── Dependencies ─────────────────────────────────────────────────────────
	leaderboard := game.NewLeaderboard(cfg.MaxLeaderboardSize)

	h, err := handlers.New(cfg.TemplateDir, cfg.StaticDir, leaderboard)
	if err != nil {
		log.Fatalf("failed to initialise handlers: %v", err)
	}

	// ── Router ───────────────────────────────────────────────────────────────
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Optionally wrap with request logger.
	var rootHandler http.Handler = mux
	if cfg.LogRequests {
		rootHandler = handlers.Logger(mux)
	}

	// ── Server ───────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      rootHandler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background goroutine.
	go func() {
		log.Printf("🎮  Tetris server starting on http://localhost%s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	}()

	// ── Graceful Shutdown ─────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server…")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}

	log.Println("server stopped cleanly")
}
