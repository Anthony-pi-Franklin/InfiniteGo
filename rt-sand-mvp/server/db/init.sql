-- InfiniteGo Database Initialization Script
-- PostgreSQL 16

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table: stores metadata about game rooms
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_players INTEGER DEFAULT 5,
    current_players INTEGER DEFAULT 0,
    server_seq BIGINT NOT NULL DEFAULT 0
);

-- Game states table: stores snapshot of entire game state for recovery
CREATE TABLE IF NOT EXISTS game_states (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    server_seq BIGINT NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, server_seq)
);

-- Chunks table: stores individual chunks with their cells
CREATE TABLE IF NOT EXISTS chunks (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    chunk_x INTEGER NOT NULL,
    chunk_y INTEGER NOT NULL,
    cells JSONB NOT NULL DEFAULT '{}',
    stone_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, chunk_x, chunk_y)
);

-- Moves table: optional, for replay and analytics
CREATE TABLE IF NOT EXISTS moves (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id VARCHAR(255),
    x BIGINT NOT NULL,
    y BIGINT NOT NULL,
    color SMALLINT NOT NULL,
    server_seq BIGINT NOT NULL,
    accepted BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Players table: track connected players
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    color SMALLINT,
    stone_count INTEGER NOT NULL DEFAULT 0,
    connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_connected BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_game_states_room ON game_states(room_id, server_seq DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_room ON chunks(room_id);
CREATE INDEX IF NOT EXISTS idx_chunks_coords ON chunks(room_id, chunk_x, chunk_y);
CREATE INDEX IF NOT EXISTS idx_moves_room ON moves(room_id, server_seq);
CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chunks_updated_at BEFORE UPDATE ON chunks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default room for testing
INSERT INTO rooms (id, name, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Room', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (for production, use more restrictive permissions)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO infinitego;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO infinitego;
