package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

type bucket struct {
	count    int
	resetAt  time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	limit   int
	window  time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		buckets: make(map[string]*bucket),
		limit:   limit,
		window:  window,
	}
	go rl.cleanupLoop()
	return rl
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[ip]
	if !ok || now.After(b.resetAt) {
		rl.buckets[ip] = &bucket{count: 1, resetAt: now.Add(rl.window)}
		return true
	}
	b.count++
	return b.count < rl.limit
}

func (rl *rateLimiter) cleanupLoop() {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for range t.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, b := range rl.buckets {
			if now.After(b.resetAt) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

var loginLimiter = newRateLimiter(10, time.Minute)
var reviewLimiter = newRateLimiter(3, time.Hour)

// RateLimitLogin applies a 5-attempts-per-minute limit per IP on the login endpoint.
func RateLimitLogin(next http.Handler) http.Handler {
	return rateLimit(loginLimiter, next)
}

// RateLimitReviews applies a 3-submissions-per-hour limit per IP on the review endpoint.
func RateLimitReviews(next http.Handler) http.Handler {
	return rateLimit(reviewLimiter, next)
}

func rateLimit(rl *rateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
		if !rl.allow(ip) {
			http.Error(w, `{"error":"Too many requests"}`, http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
