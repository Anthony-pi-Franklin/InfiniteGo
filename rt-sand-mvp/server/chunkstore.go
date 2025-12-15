package server

import (
	"errors"
	"math"
)

const (
	ChunkSize     = 512
	chunkBits     = 9
	chunkSizeMask = ChunkSize - 1
)

var (
	ErrOutOfBounds = errors.New("coordinate out of chunk range")
)

type Color uint8

const (
	ColorBlack Color = 0
	ColorWhite Color = 1
)

type Chunk struct {
	X, Y  int32
	Cells map[uint32]Color
}

type ChunkID struct {
	X, Y int32
}

type Cell struct {
	X     int64 `json:"x"`
	Y     int64 `json:"y"`
	Color Color `json:"color"`
}

func chunkIDFor(x, y int64) (ChunkID, error) {
	cx := x >> chunkBits
	cy := y >> chunkBits
	if cx > math.MaxInt32 || cx < math.MinInt32 || cy > math.MaxInt32 || cy < math.MinInt32 {
		return ChunkID{}, ErrOutOfBounds
	}
	return ChunkID{X: int32(cx), Y: int32(cy)}, nil
}

func localIndex(x, y int64) uint32 {
	return (uint32(uint64(x)&chunkSizeMask) << chunkBits) | uint32(uint64(y)&chunkSizeMask)
}

func (r *Room) getChunk(id ChunkID, create bool) *Chunk {
	ch, ok := r.Chunks[id]
	if ok {
		return ch
	}
	if !create {
		return nil
	}
	nc := &Chunk{
		X:     id.X,
		Y:     id.Y,
		Cells: make(map[uint32]Color),
	}
	r.Chunks[id] = nc
	return nc
}

func (r *Room) setCell(x, y int64, color Color) error {
	id, err := chunkIDFor(x, y)
	if err != nil {
		return err
	}
	ch := r.getChunk(id, true)
	ch.Cells[localIndex(x, y)] = color
	return nil
}

func (r *Room) removeCell(x, y int64) {
	id, err := chunkIDFor(x, y)
	if err != nil {
		return
	}
	ch := r.getChunk(id, false)
	if ch == nil {
		return
	}
	idx := localIndex(x, y)
	delete(ch.Cells, idx)
	if len(ch.Cells) == 0 {
		delete(r.Chunks, id)
	}
}

func (r *Room) getCell(x, y int64) (Color, bool) {
	id, err := chunkIDFor(x, y)
	if err != nil {
		return 0, false
	}
	ch := r.getChunk(id, false)
	if ch == nil {
		return 0, false
	}
	color, ok := ch.Cells[localIndex(x, y)]
	return color, ok
}

func (r *Room) hasStone(x, y int64) bool {
	_, ok := r.getCell(x, y)
	return ok
}

func (r *Room) getAllCells() []Cell {
	var cells []Cell
	for chunkID, chunk := range r.Chunks {
		baseX := int64(chunkID.X) << chunkBits
		baseY := int64(chunkID.Y) << chunkBits
		for idx, color := range chunk.Cells {
			localX := int64((idx >> chunkBits) & chunkSizeMask)
			localY := int64(idx & chunkSizeMask)
			x := baseX + localX
			y := baseY + localY
			cells = append(cells, Cell{X: x, Y: y, Color: color})
		}
	}
	return cells
}
