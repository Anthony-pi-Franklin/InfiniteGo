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
	conn *websocket.Conn
	room *Room
	send chan []byte
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for local/LAN usage; Nginx already restricts access.
	CheckOrigin: func(r *http.Request) bool { return true },
}

func ServeWS(room *Room, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		return
	}
	client := &Client{
		conn: conn,
		room: room,
		send: make(chan []byte, 64),
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
		
		// Handle state request
		if payload.Type == "get_state" {
			select {
			case c.room.StateInbox <- GetStateRequest{Player: c}:
			case <-ctx.Done():
				return
			}
			continue
		}
		
		// Handle move request
		x, errX := strconv.ParseInt(payload.X.String(), 10, 64)
		y, errY := strconv.ParseInt(payload.Y.String(), 10, 64)
		if errX != nil || errY != nil {
			c.sendError("invalid_coordinate")
			continue
		}
		if payload.Color != int(ColorBlack) && payload.Color != int(ColorWhite) {
			c.sendError("invalid_color")
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
