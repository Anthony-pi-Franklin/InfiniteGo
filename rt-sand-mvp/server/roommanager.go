package server

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// RoomExpireTime is the duration after which a private room expires (24 hours)
// const RoomExpireTime = 24 * time.Hour

const RoomExpireTime = 2 * time.Minute // For testing

// RoomCreateCooldown is the duration an IP must wait before creating another room
const RoomCreateCooldown = 10 * time.Minute

// IPRateLimiter tracks when each IP last created a room
type IPRateLimiter struct {
	creationTimes map[string]time.Time
	mu            sync.RWMutex
}

// NewIPRateLimiter creates a new IP rate limiter
func NewIPRateLimiter() *IPRateLimiter {
	return &IPRateLimiter{
		creationTimes: make(map[string]time.Time),
	}
}

// CanCreateRoom checks if an IP can create a new room
func (rl *IPRateLimiter) CanCreateRoom(ip string) (bool, time.Duration) {
	rl.mu.RLock()
	lastCreation, exists := rl.creationTimes[ip]
	rl.mu.RUnlock()

	if !exists {
		return true, 0
	}

	elapsed := time.Since(lastCreation)
	if elapsed >= RoomCreateCooldown {
		return true, 0
	}

	return false, RoomCreateCooldown - elapsed
}

// RecordCreation records that an IP created a room
func (rl *IPRateLimiter) RecordCreation(ip string) {
	rl.mu.Lock()
	rl.creationTimes[ip] = time.Now()
	rl.mu.Unlock()
}

// Cleanup removes old entries from the rate limiter
func (rl *IPRateLimiter) Cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	for ip, t := range rl.creationTimes {
		if now.Sub(t) > RoomCreateCooldown {
			delete(rl.creationTimes, ip)
		}
	}
}

// RoomManager manages multiple game rooms
type RoomManager struct {
	rooms       map[string]*Room
	mu          sync.RWMutex
	ctx         context.Context
	rateLimiter *IPRateLimiter
}

// NewRoomManager creates a new room manager
func NewRoomManager(ctx context.Context) *RoomManager {
	// 初始化全局安全管理器
	ipBanManager = NewIPBanManager()
	ipConnectionCounter = NewIPConnectionCounter()

	rm := &RoomManager{
		rooms:       make(map[string]*Room),
		ctx:         ctx,
		rateLimiter: NewIPRateLimiter(),
	}
	// Start background goroutine to cleanup expired rooms
	go rm.cleanupExpiredRooms(ctx)
	// Start background goroutine to cleanup old rate limiter entries
	go rm.cleanupRateLimiter(ctx)
	// Start background goroutine to cleanup expired IP bans
	go rm.cleanupIPBans(ctx)
	return rm
}

// cleanupRateLimiter periodically cleans up old rate limiter entries
func (rm *RoomManager) cleanupRateLimiter(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rm.rateLimiter.Cleanup()
		}
	}
}

// cleanupIPBans periodically cleans up expired IP bans
func (rm *RoomManager) cleanupIPBans(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if ipBanManager != nil {
				ipBanManager.Cleanup()
			}
		}
	}
}

// PublicRoomID is the ID of the permanent public room that never gets cleaned up
const PublicRoomID = "public"

// GetOrCreateRoom gets an existing room or creates a new one
// clientIP is used for rate limiting room creation
// Returns (room, error) - error is non-nil if rate limited
func (rm *RoomManager) GetOrCreateRoom(roomID string, clientIP string) (*Room, error) {
	// Use public room if no ID provided
	if roomID == "" {
		roomID = PublicRoomID
	}

	// Try read lock first to check if room exists
	rm.mu.RLock()
	room, exists := rm.rooms[roomID]
	rm.mu.RUnlock()

	if exists {
		return room, nil
	}

	// Room doesn't exist - this is a creation
	// Check rate limit for non-public rooms
	if roomID != PublicRoomID {
		canCreate, remaining := rm.rateLimiter.CanCreateRoom(clientIP)
		if !canCreate {
			minutes := int(remaining.Minutes())
			seconds := int(remaining.Seconds()) % 60
			return nil, fmt.Errorf("请等待 %d 分 %d 秒后再创建新房间", minutes, seconds)
		}
	}

	// Room doesn't exist, acquire write lock to create it
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Double-check in case another goroutine created it
	if room, exists := rm.rooms[roomID]; exists {
		return room, nil
	}

	// Record this IP's room creation (for non-public rooms)
	if roomID != PublicRoomID {
		rm.rateLimiter.RecordCreation(clientIP)
		log.Printf("IP %s created room %s", clientIP, roomID)
	}

	// Create new room
	room = NewRoom()
	rm.rooms[roomID] = room

	// Start room in background
	go room.Run(rm.ctx)

	return room, nil
}

// GetRoom gets an existing room without creating one
func (rm *RoomManager) GetRoom(roomID string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	room, exists := rm.rooms[roomID]
	return room, exists
}

// RemoveRoom removes a room (for cleanup)
// The public room will never be removed
func (rm *RoomManager) RemoveRoom(roomID string) {
	if roomID == PublicRoomID {
		return // Never remove the public room
	}
	rm.mu.Lock()
	defer rm.mu.Unlock()
	delete(rm.rooms, roomID)
}

// TryCleanupRoom checks if a room is empty and removes it if it's not the public room
func (rm *RoomManager) TryCleanupRoom(roomID string) {
	if roomID == PublicRoomID {
		return // Never cleanup the public room
	}

	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[roomID]
	if !exists {
		return
	}

	room.clMu.RLock()
	count := len(room.clients)
	room.clMu.RUnlock()

	if count == 0 {
		log.Printf("Room %s is empty, removing (was NOT expired)", roomID)
		delete(rm.rooms, roomID)
	}
}

// ListRooms returns a list of all active room IDs
func (rm *RoomManager) ListRooms() []string {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	ids := make([]string, 0, len(rm.rooms))
	for id := range rm.rooms {
		ids = append(ids, id)
	}
	return ids
}

// GetRoomInfo returns room information for the lobby
type RoomInfo struct {
	ID          string `json:"id"`
	PlayerCount int    `json:"player_count"`
}

func (rm *RoomManager) GetRoomInfoList() []RoomInfo {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	infos := make([]RoomInfo, 0, len(rm.rooms))
	for id, room := range rm.rooms {
		room.clMu.RLock()
		count := len(room.clients)
		room.clMu.RUnlock()

		infos = append(infos, RoomInfo{
			ID:          id,
			PlayerCount: count,
		})
	}
	return infos
}

// cleanupExpiredRooms periodically checks and removes expired private rooms
func (rm *RoomManager) cleanupExpiredRooms(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second) // Check every 5 seconds for testing
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rm.checkAndCleanupExpiredRooms()
		}
	}
}

// checkAndCleanupExpiredRooms checks all rooms and removes expired ones
func (rm *RoomManager) checkAndCleanupExpiredRooms() {
	now := time.Now()
	var expiredRooms []string

	// First pass: identify expired rooms (with read lock)
	rm.mu.RLock()
	log.Printf("Checking %d rooms for expiration...", len(rm.rooms))
	for id, room := range rm.rooms {
		// Skip the public room
		if id == PublicRoomID {
			continue
		}
		age := now.Sub(room.CreatedAt)
		log.Printf("Room %s: age=%v, expires in %v", id, age, RoomExpireTime-age)
		// Check if room has expired
		if age >= RoomExpireTime {
			log.Printf("Room %s is EXPIRED, will close and kick players", id)
			expiredRooms = append(expiredRooms, id)
		}
	}
	rm.mu.RUnlock()

	// Second pass: close and remove expired rooms
	for _, id := range expiredRooms {
		rm.mu.Lock()
		room, exists := rm.rooms[id]
		if exists {
			log.Printf("=== EXPIRING ROOM %s - kicking all players ===", id)
			room.Close() // This will kick all players
			delete(rm.rooms, id)
			log.Printf("=== ROOM %s DELETED ===", id)
		}
		rm.mu.Unlock()
	}
}
