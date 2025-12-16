package server

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DBRoom represents a room in the database
type DBRoom struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	Name           string    `gorm:"type:varchar(255);not null"`
	CreatedAt      time.Time `gorm:"not null;default:now()"`
	UpdatedAt      time.Time `gorm:"not null;default:now()"`
	IsActive       bool      `gorm:"not null;default:true"`
	MaxPlayers     int       `gorm:"default:5"`
	CurrentPlayers int       `gorm:"default:0"`
	ServerSeq      uint64    `gorm:"not null;default:0"`
}

// TableName specifies the table name for DBRoom
func (DBRoom) TableName() string {
	return "rooms"
}

// DBGameState represents a snapshot of the game state
type DBGameState struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	RoomID    uuid.UUID `gorm:"type:uuid;not null;index:idx_game_states_room"`
	ServerSeq uint64    `gorm:"not null;uniqueIndex:idx_room_seq"`
	StateData []byte    `gorm:"type:jsonb;not null"` // Stores serialized game state
	CreatedAt time.Time `gorm:"not null;default:now()"`
	Room      DBRoom    `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for DBGameState
func (DBGameState) TableName() string {
	return "game_states"
}

// DBChunk represents a chunk in the database
type DBChunk struct {
	ID         uint      `gorm:"primaryKey;autoIncrement"`
	RoomID     uuid.UUID `gorm:"type:uuid;not null;index:idx_chunks_room;uniqueIndex:idx_room_chunk_coords"`
	ChunkX     int32     `gorm:"not null;uniqueIndex:idx_room_chunk_coords"`
	ChunkY     int32     `gorm:"not null;uniqueIndex:idx_room_chunk_coords"`
	Cells      []byte    `gorm:"type:jsonb;not null;default:'{}'"`
	StoneCount int       `gorm:"not null;default:0"`
	CreatedAt  time.Time `gorm:"not null;default:now()"`
	UpdatedAt  time.Time `gorm:"not null;default:now()"`
	Room       DBRoom    `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for DBChunk
func (DBChunk) TableName() string {
	return "chunks"
}

// DBMove represents a move in the database (for replay/analytics)
type DBMove struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	RoomID    uuid.UUID `gorm:"type:uuid;not null;index:idx_moves_room"`
	PlayerID  string    `gorm:"type:varchar(255)"`
	X         int64     `gorm:"not null"`
	Y         int64     `gorm:"not null"`
	Color     Color     `gorm:"type:smallint;not null"`
	ServerSeq uint64    `gorm:"not null;index:idx_moves_room"`
	Accepted  bool      `gorm:"not null"`
	CreatedAt time.Time `gorm:"not null;default:now()"`
	Room      DBRoom    `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for DBMove
func (DBMove) TableName() string {
	return "moves"
}

// DBPlayer represents a player in the database
type DBPlayer struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	RoomID       uuid.UUID `gorm:"type:uuid;not null;index:idx_players_room"`
	SessionID    string    `gorm:"type:varchar(255);not null;index:idx_players_session"`
	Color        *Color    `gorm:"type:smallint"`
	StoneCount   int       `gorm:"not null;default:0"`
	ConnectedAt  time.Time `gorm:"not null;default:now()"`
	LastSeenAt   time.Time `gorm:"not null;default:now()"`
	IsConnected  bool      `gorm:"not null;default:true"`
	Room         DBRoom    `gorm:"foreignKey:RoomID;constraint:OnDelete:CASCADE"`
}

// TableName specifies the table name for DBPlayer
func (DBPlayer) TableName() string {
	return "players"
}

// AutoMigrate runs automatic migration for all models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&DBRoom{},
		&DBGameState{},
		&DBChunk{},
		&DBMove{},
		&DBPlayer{},
	)
}
