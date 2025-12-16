package server

import (
	"context"
	"sync"
)

// RoomManager manages multiple game rooms
type RoomManager struct {
	rooms map[string]*Room
	mu    sync.RWMutex
	ctx   context.Context
}

// NewRoomManager creates a new room manager
func NewRoomManager(ctx context.Context) *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
		ctx:   ctx,
	}
}

// GetOrCreateRoom gets an existing room or creates a new one
func (rm *RoomManager) GetOrCreateRoom(roomID string) *Room {
	// Use default room if no ID provided
	if roomID == "" {
		roomID = "default"
	}

	// Try read lock first to check if room exists
	rm.mu.RLock()
	room, exists := rm.rooms[roomID]
	rm.mu.RUnlock()

	if exists {
		return room
	}

	// Room doesn't exist, acquire write lock to create it
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Double-check in case another goroutine created it
	if room, exists := rm.rooms[roomID]; exists {
		return room
	}

	// Create new room
	room = NewRoom()
	rm.rooms[roomID] = room

	// Start room in background
	go room.Run(rm.ctx)

	return room
}

// GetRoom gets an existing room without creating one
func (rm *RoomManager) GetRoom(roomID string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	room, exists := rm.rooms[roomID]
	return room, exists
}

// RemoveRoom removes a room (for cleanup)
func (rm *RoomManager) RemoveRoom(roomID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	delete(rm.rooms, roomID)
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
