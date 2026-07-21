// Package game implements the server-side Tetris game logic and leaderboard management.
package game

import (
	"sort"
	"sync"
	"time"
)

// Score represents a single leaderboard entry.
type Score struct {
	Name      string    `json:"name"`
	Points    int       `json:"points"`
	Level     int       `json:"level"`
	Lines     int       `json:"lines"`
	CreatedAt time.Time `json:"created_at"`
}

// Leaderboard is a concurrency-safe in-memory leaderboard.
type Leaderboard struct {
	mu      sync.RWMutex
	entries []Score
	maxSize int
}

// NewLeaderboard creates a Leaderboard that holds at most maxSize entries.
func NewLeaderboard(maxSize int) *Leaderboard {
	return &Leaderboard{
		entries: make([]Score, 0, maxSize),
		maxSize: maxSize,
	}
}

// Add inserts a new score entry into the leaderboard, keeping it sorted
// (highest score first) and trimmed to maxSize.
func (lb *Leaderboard) Add(s Score) {
	s.CreatedAt = time.Now().UTC()

	lb.mu.Lock()
	defer lb.mu.Unlock()

	lb.entries = append(lb.entries, s)

	// Sort descending by Points, then Level, then Lines as tiebreakers.
	sort.Slice(lb.entries, func(i, j int) bool {
		if lb.entries[i].Points != lb.entries[j].Points {
			return lb.entries[i].Points > lb.entries[j].Points
		}
		if lb.entries[i].Level != lb.entries[j].Level {
			return lb.entries[i].Level > lb.entries[j].Level
		}
		return lb.entries[i].Lines > lb.entries[j].Lines
	})

	// Trim to maxSize.
	if len(lb.entries) > lb.maxSize {
		lb.entries = lb.entries[:lb.maxSize]
	}
}

// Entries returns a defensive copy of the current leaderboard entries.
func (lb *Leaderboard) Entries() []Score {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	out := make([]Score, len(lb.entries))
	copy(out, lb.entries)
	return out
}

// Rank returns the position (1-based) of the given score in the leaderboard,
// or 0 if it would not make the cut.
func (lb *Leaderboard) Rank(points int) int {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	for i, e := range lb.entries {
		if points >= e.Points {
			return i + 1
		}
	}

	if len(lb.entries) < lb.maxSize {
		return len(lb.entries) + 1
	}
	return 0
}
