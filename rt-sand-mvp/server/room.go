package server

import (
	"context"
	"encoding/json"
	"log"
	"sync"
)

type MoveRequest struct {
	Player *Client
	X      int64 `json:"x"`
	Y      int64 `json:"y"`
	Color  Color `json:"color"`
}

type MoveResult struct {
	Accepted  bool   `json:"accepted"`
	Reason    string `json:"reason,omitempty"`
	Removed   []Cell `json:"removed,omitempty"`
	Added     *Cell  `json:"added,omitempty"`
	ServerSeq uint64 `json:"server_seq"`
}

type DeltaUpdate struct {
	Added     []Cell `json:"added,omitempty"`
	Removed   []Cell `json:"removed,omitempty"`
	ServerSeq uint64 `json:"server_seq"`
}

type Envelope struct {
	Type        string       `json:"type"`
	MoveResult  *MoveResult  `json:"move_result,omitempty"`
	DeltaUpdate *DeltaUpdate `json:"delta_update,omitempty"`
}

type coord struct {
	X, Y int64
}

type Room struct {
	Inbox   chan MoveRequest
	Chunks  map[ChunkID]*Chunk
	Seq     uint64
	clients map[*Client]struct{}
	clMu    sync.RWMutex
}

func NewRoom() *Room {
	return &Room{
		Inbox:   make(chan MoveRequest, 1024),
		Chunks:  make(map[ChunkID]*Chunk),
		clients: make(map[*Client]struct{}),
	}
}

func (r *Room) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case req := <-r.Inbox:
			result := r.ProcessMove(req)
			if req.Player != nil {
				req.Player.sendEnvelope(Envelope{Type: "move_result", MoveResult: &result})
			}
			if result.Accepted {
				var delta DeltaUpdate
				delta.ServerSeq = result.ServerSeq
				if result.Added != nil {
					delta.Added = append(delta.Added, *result.Added)
				}
				delta.Removed = append(delta.Removed, result.Removed...)
				r.broadcast(delta)
			}
		}
	}
}

func (r *Room) broadcast(delta DeltaUpdate) {
	env := Envelope{Type: "delta_update", DeltaUpdate: &delta}
	payload, err := json.Marshal(env)
	if err != nil {
		log.Printf("broadcast marshal: %v", err)
		return
	}
	r.clMu.RLock()
	defer r.clMu.RUnlock()
	for c := range r.clients {
		c.deliver(payload)
	}
}

func (r *Room) addClient(c *Client) {
	r.clMu.Lock()
	defer r.clMu.Unlock()
	r.clients[c] = struct{}{}
}

func (r *Room) removeClient(c *Client) {
	r.clMu.Lock()
	defer r.clMu.Unlock()
	delete(r.clients, c)
}

func (r *Room) neighbors4(x, y int64) [4]coord {
	return [4]coord{
		{X: x + 1, Y: y},
		{X: x - 1, Y: y},
		{X: x, Y: y + 1},
		{X: x, Y: y - 1},
	}
}

func (r *Room) bfsSameColor(seed coord, color Color, visited map[coord]struct{}) ([]coord, bool) {
	queue := []coord{seed}
	component := make([]coord, 0, 16)
	hasLiberty := false

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]

		if _, ok := visited[cur]; ok {
			continue
		}
		visited[cur] = struct{}{}
		component = append(component, cur)

		for _, n := range r.neighbors4(cur.X, cur.Y) {
			col, ok := r.getCell(n.X, n.Y)
			if !ok {
				hasLiberty = true
				continue
			}
			if col == color {
				if _, seen := visited[n]; !seen {
					queue = append(queue, n)
				}
			}
		}
	}
	return component, hasLiberty
}

func (r *Room) ProcessMove(req MoveRequest) MoveResult {
	if _, err := chunkIDFor(req.X, req.Y); err != nil {
		return MoveResult{Accepted: false, Reason: err.Error(), ServerSeq: r.Seq}
	}
	if _, occupied := r.getCell(req.X, req.Y); occupied {
		return MoveResult{Accepted: false, Reason: "occupied", ServerSeq: r.Seq}
	}

	if err := r.setCell(req.X, req.Y, req.Color); err != nil {
		return MoveResult{Accepted: false, Reason: err.Error(), ServerSeq: r.Seq}
	}

	var removed []Cell
	visitedOpp := make(map[coord]struct{})

	for _, nb := range r.neighbors4(req.X, req.Y) {
		col, ok := r.getCell(nb.X, nb.Y)
		if !ok || col == req.Color {
			continue
		}
		if _, seen := visitedOpp[nb]; seen {
			continue
		}
		comp, hasLiberty := r.bfsSameColor(nb, col, visitedOpp)
		if !hasLiberty {
			for _, c := range comp {
				r.removeCell(c.X, c.Y)
				removed = append(removed, Cell{X: c.X, Y: c.Y, Color: col})
			}
		}
	}

	visitedSelf := make(map[coord]struct{})
	selfComp, selfLiberty := r.bfsSameColor(coord{X: req.X, Y: req.Y}, req.Color, visitedSelf)
	if !selfLiberty {
		for _, c := range selfComp {
			r.removeCell(c.X, c.Y)
			removed = append(removed, Cell{X: c.X, Y: c.Y, Color: req.Color})
		}
	}

	r.Seq++
	result := MoveResult{
		Accepted:  true,
		Removed:   removed,
		ServerSeq: r.Seq,
	}
	if r.hasStone(req.X, req.Y) {
		result.Added = &Cell{X: req.X, Y: req.Y, Color: req.Color}
	}
	return result
}
