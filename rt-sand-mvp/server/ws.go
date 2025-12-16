package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn          *websocket.Conn
	room          *Room
	send          chan []byte
	selectedColor *Color // Player's chosen color (nil if not selected yet)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for local/LAN usage; Nginx already restricts access.
	// Compatible with both LAN and WAN deployments
	CheckOrigin: func(r *http.Request) bool { return true },
}

func ServeWS(roomManager *RoomManager, w http.ResponseWriter, r *http.Request) {
	// Get room ID from query parameter
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		roomID = "default"
	}

	// Get or create the room
	room := roomManager.GetOrCreateRoom(roomID)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		return
	}
	client := &Client{
		conn:          conn,
		room:          room,
		send:          make(chan []byte, 64),
		selectedColor: nil, // Will be set when player chooses color
	}
	room.addClient(client)

	ctx, cancel := context.WithCancel(context.Background())
	go client.writePump(ctx, cancel)
	go client.readPump(ctx, cancel)
}

func (c *Client) readPump(ctx context.Context, cancel context.CancelFunc) {
	defer func() {
		cancel()
		c.conn.Close()
		c.room.removeClient(c)
	}()
	c.conn.SetReadLimit(1 << 16)
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var payload struct {
			Type  string      `json:"type"`
			X     json.Number `json:"x"`
			Y     json.Number `json:"y"`
			Color int         `json:"color"`
		}
		if err := json.Unmarshal(message, &payload); err != nil {
			c.sendError("invalid_payload")
			continue
		}
		
		// Handle color selection
		if payload.Type == "select_color" {
			if payload.Color < 0 || payload.Color > 255 {
				c.sendError("invalid_color")
				continue
			}
			selectedColor := Color(payload.Color)
			c.selectedColor = &selectedColor
			c.sendEnvelope(Envelope{Type: "color_selected", MoveResult: &MoveResult{Accepted: true, ServerSeq: c.room.Seq}})
			continue
		}
		
		// Handle state request
		if payload.Type == "get_state" {
			select {
			case c.room.StateInbox <- GetStateRequest{Player: c}:
			case <-ctx.Done():
				return
			}
			continue
		}

		// Handle board reset request
		if payload.Type == "restart" {
			select {
			case c.room.ResetInbox <- ResetRequest{Player: c}:
			case <-ctx.Done():
				return
			}
			continue
		}
		
		// Handle move request - player must have selected a color
		if c.selectedColor == nil {
			c.sendError("color_not_selected")
			continue
		}
		
		// Validate that player is using their selected color
		if payload.Color != int(*c.selectedColor) {
			c.sendError("must_use_selected_color")
			continue
		}
		
		x, errX := strconv.ParseInt(payload.X.String(), 10, 64)
		y, errY := strconv.ParseInt(payload.Y.String(), 10, 64)
		if errX != nil || errY != nil {
			c.sendError("invalid_coordinate")
			continue
		}
		
		req := MoveRequest{
			Player: c,
			X:      x,
			Y:      y,
			Color:  Color(payload.Color),
		}
		select {
		case c.room.Inbox <- req:
		case <-ctx.Done():
			return
		}
	}
}

func (c *Client) writePump(ctx context.Context, cancel context.CancelFunc) {
	defer func() {
		cancel()
		c.conn.Close()
	}()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-c.send:
			if !ok {
				return
			}
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}
}

func (c *Client) sendError(reason string) {
	result := MoveResult{
		Accepted:  false,
		Reason:    reason,
		ServerSeq: c.room.Seq,
	}
	c.sendEnvelope(Envelope{Type: "move_result", MoveResult: &result})
}

func (c *Client) sendEnvelope(env Envelope) {
	payload, err := json.Marshal(env)
	if err != nil {
		log.Printf("send envelope: %v", err)
		return
	}
	c.deliver(payload)
}

func (c *Client) deliver(payload []byte) {
	select {
	case c.send <- payload:
	default:
		log.Printf("client send buffer full, dropping message")
	}
}
