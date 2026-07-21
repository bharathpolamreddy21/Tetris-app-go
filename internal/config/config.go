// Package config provides application configuration management.
package config

import (
	"log"
	"os"
	"strconv"
)

// Config holds all application configuration values.
type Config struct {
	// Port is the HTTP server listening port.
	Port string

	// Host is the HTTP server listening host.
	Host string

	// StaticDir is the directory for serving static files.
	StaticDir string

	// TemplateDir is the directory for HTML templates.
	TemplateDir string

	// LogRequests enables HTTP request logging.
	LogRequests bool

	// MaxLeaderboardSize is the maximum number of leaderboard entries to keep.
	MaxLeaderboardSize int
}

// Default returns a Config populated with sensible defaults.
func Default() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		Host:               getEnv("HOST", ""),
		StaticDir:          getEnv("STATIC_DIR", "static"),
		TemplateDir:        getEnv("TEMPLATE_DIR", "templates"),
		LogRequests:        getBoolEnv("LOG_REQUESTS", true),
		MaxLeaderboardSize: getIntEnv("MAX_LEADERBOARD_SIZE", 10),
	}
}

// Addr returns the full address string (host:port) for the server to listen on.
func (c *Config) Addr() string {
	return c.Host + ":" + c.Port
}

// getEnv reads an environment variable or returns a fallback default.
func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

// getBoolEnv reads a boolean environment variable or returns a fallback default.
func getBoolEnv(key string, fallback bool) bool {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	b, err := strconv.ParseBool(val)
	if err != nil {
		log.Printf("config: invalid bool for %s=%q, using default %v", key, val, fallback)
		return fallback
	}
	return b
}

// getIntEnv reads an integer environment variable or returns a fallback default.
func getIntEnv(key string, fallback int) int {
	val, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		log.Printf("config: invalid int for %s=%q, using default %d", key, val, fallback)
		return fallback
	}
	return n
}
