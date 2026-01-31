package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// ========== 反作弊配置 ==========
const (
	// 落子速率限制：每秒最多允许的落子数
	MaxMovesPerSecond = 3
	// 速率限制窗口时间
	RateLimitWindow = time.Second
	// 连续违规次数阈值，超过则封禁
	ViolationThreshold = 5
	// IP封禁时长
	BanDuration = 30 * time.Minute
	// 单个IP最大连接数
	MaxConnectionsPerIP = 5
	// 消息速率限制：每秒最多消息数（包括所有类型）
	MaxMessagesPerSecond = 10
)

// IPBanManager 管理被封禁的IP
type IPBanManager struct {
	bannedIPs map[string]time.Time // IP -> 封禁到期时间
	mu        sync.RWMutex
}

func NewIPBanManager() *IPBanManager {
	return &IPBanManager{
		bannedIPs: make(map[string]time.Time),
	}
}

// IsBanned 检查IP是否被封禁
func (m *IPBanManager) IsBanned(ip string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	expiry, exists := m.bannedIPs[ip]
	if !exists {
		return false
	}
	if time.Now().After(expiry) {
		// 封禁已过期，稍后清理
		return false
	}
	return true
}

// BanIP 封禁一个IP
func (m *IPBanManager) BanIP(ip string, duration time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.bannedIPs[ip] = time.Now().Add(duration)
	log.Printf("[SECURITY] IP %s 已被封禁 %v，原因：疑似作弊行为", ip, duration)
}

// Cleanup 清理过期的封禁记录
func (m *IPBanManager) Cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now()
	for ip, expiry := range m.bannedIPs {
		if now.After(expiry) {
			delete(m.bannedIPs, ip)
			log.Printf("[SECURITY] IP %s 封禁已解除", ip)
		}
	}
}

// IPConnectionCounter 统计每个IP的连接数
type IPConnectionCounter struct {
	connections map[string]int
	mu          sync.Mutex
}

func NewIPConnectionCounter() *IPConnectionCounter {
	return &IPConnectionCounter{
		connections: make(map[string]int),
	}
}

// Increment 增加连接计数，返回是否允许（未超过限制）
func (c *IPConnectionCounter) Increment(ip string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	count := c.connections[ip]
	if count >= MaxConnectionsPerIP {
		log.Printf("[SECURITY] IP %s 连接数超限 (%d/%d)", ip, count, MaxConnectionsPerIP)
		return false
	}
	c.connections[ip] = count + 1
	return true
}

// Decrement 减少连接计数
func (c *IPConnectionCounter) Decrement(ip string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.connections[ip] > 0 {
		c.connections[ip]--
	}
	if c.connections[ip] == 0 {
		delete(c.connections, ip)
	}
}

// MoveRateLimiter 落子速率限制器（令牌桶算法）
type MoveRateLimiter struct {
	tokens     int       // 当前令牌数
	lastRefill time.Time // 上次补充令牌的时间
	violations int       // 违规次数
	mu         sync.Mutex
}

func NewMoveRateLimiter() *MoveRateLimiter {
	return &MoveRateLimiter{
		tokens:     MaxMovesPerSecond,
		lastRefill: time.Now(),
		violations: 0,
	}
}

// TryConsume 尝试消耗一个令牌（落子），返回是否允许
func (r *MoveRateLimiter) TryConsume() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	// 补充令牌
	now := time.Now()
	elapsed := now.Sub(r.lastRefill)
	if elapsed >= RateLimitWindow {
		refillCount := int(elapsed / RateLimitWindow)
		r.tokens += refillCount * MaxMovesPerSecond
		if r.tokens > MaxMovesPerSecond*2 { // 最多存储2秒的令牌
			r.tokens = MaxMovesPerSecond * 2
		}
		r.lastRefill = now
	}

	if r.tokens > 0 {
		r.tokens--
		return true
	}

	// 记录违规
	r.violations++
	return false
}

// GetViolations 获取违规次数
func (r *MoveRateLimiter) GetViolations() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.violations
}

// MessageRateLimiter 消息速率限制器
type MessageRateLimiter struct {
	messageCount int
	windowStart  time.Time
	mu           sync.Mutex
}

func NewMessageRateLimiter() *MessageRateLimiter {
	return &MessageRateLimiter{
		messageCount: 0,
		windowStart:  time.Now(),
	}
}

// TryConsume 尝试消耗一个消息配额
func (r *MessageRateLimiter) TryConsume() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	if now.Sub(r.windowStart) >= time.Second {
		r.messageCount = 0
		r.windowStart = now
	}

	if r.messageCount >= MaxMessagesPerSecond {
		return false
	}

	r.messageCount++
	return true
}

// 全局管理器（将在 RoomManager 中初始化）
var (
	ipBanManager        *IPBanManager
	ipConnectionCounter *IPConnectionCounter
)

// roomIDRegex validates room IDs: alphanumeric, underscore, hyphen, 1-128 chars
var roomIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)

// getClientIP extracts the real client IP from the request
// It checks X-Forwarded-For and X-Real-IP headers (set by Nginx) first
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (may contain multiple IPs, take the first)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if ip != "" {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	// Fall back to RemoteAddr (remove port if present)
	addr := r.RemoteAddr
	if colonIdx := strings.LastIndex(addr, ":"); colonIdx != -1 {
		// Check if it's IPv6 format [::1]:port
		if bracketIdx := strings.LastIndex(addr, "]"); bracketIdx != -1 && bracketIdx < colonIdx {
			return addr[:colonIdx]
		} else if strings.Count(addr, ":") == 1 {
			// IPv4 format 1.2.3.4:port
			return addr[:colonIdx]
		}
	}
	return addr
}

type Client struct {
	conn               *websocket.Conn
	room               *Room
	roomID             string // Room ID for cleanup purposes
	roomManager        *RoomManager
	send               chan []byte
	selectedColor      *Color              // Player's chosen color (nil if not selected yet)
	clientIP           string              // Client's IP address for security tracking
	moveRateLimiter    *MoveRateLimiter    // 落子速率限制器
	messageRateLimiter *MessageRateLimiter // 消息速率限制器
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
		roomID = PublicRoomID
	}

	// Validate room ID to prevent injection attacks
	if !roomIDRegex.MatchString(roomID) {
		http.Error(w, "Invalid room ID: must be 1-128 alphanumeric characters, underscore or hyphen", http.StatusBadRequest)
		return
	}

	// Get client IP for rate limiting and security
	clientIP := getClientIP(r)

	// 检查IP是否被封禁
	if ipBanManager != nil && ipBanManager.IsBanned(clientIP) {
		log.Printf("[SECURITY] 已封禁IP尝试连接: %s", clientIP)
		http.Error(w, "您的IP已被临时封禁，请稍后再试", http.StatusForbidden)
		return
	}

	// 检查IP连接数限制
	if ipConnectionCounter != nil && !ipConnectionCounter.Increment(clientIP) {
		http.Error(w, "连接数超过限制，请关闭一些连接后再试", http.StatusTooManyRequests)
		return
	}

	// Get or create the room (with rate limiting)
	room, err := roomManager.GetOrCreateRoom(roomID, clientIP)
	if err != nil {
		// 连接失败，减少计数
		if ipConnectionCounter != nil {
			ipConnectionCounter.Decrement(clientIP)
		}
		// Rate limited
		http.Error(w, err.Error(), http.StatusTooManyRequests)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade: %v", err)
		// 连接失败，减少计数
		if ipConnectionCounter != nil {
			ipConnectionCounter.Decrement(clientIP)
		}
		return
	}
	client := &Client{
		conn:               conn,
		room:               room,
		roomID:             roomID,
		roomManager:        roomManager,
		send:               make(chan []byte, 64),
		selectedColor:      nil, // Will be set when player chooses color
		clientIP:           clientIP,
		moveRateLimiter:    NewMoveRateLimiter(),
		messageRateLimiter: NewMessageRateLimiter(),
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
		// 减少IP连接计数
		if ipConnectionCounter != nil {
			ipConnectionCounter.Decrement(c.clientIP)
		}
		// Try to cleanup empty private rooms
		c.roomManager.TryCleanupRoom(c.roomID)
	}()
	c.conn.SetReadLimit(1 << 16)
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}

		// ========== 消息速率限制检查 ==========
		if c.messageRateLimiter != nil && !c.messageRateLimiter.TryConsume() {
			c.sendError("rate_limited")
			continue
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

		// Handle board reset request (clear only player's color)
		if payload.Type == "restart" {
			if c.selectedColor == nil {
				c.sendError("color_not_selected")
				continue
			}
			select {
			case c.room.ResetInbox <- ResetRequest{Player: c, Color: *c.selectedColor}:
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

		// ========== 反作弊：落子速率限制 ==========
		if c.moveRateLimiter != nil && !c.moveRateLimiter.TryConsume() {
			violations := c.moveRateLimiter.GetViolations()
			log.Printf("[ANTI-CHEAT] IP %s 落子过快，违规次数: %d", c.clientIP, violations)

			// 检查是否需要封禁
			if violations >= ViolationThreshold {
				if ipBanManager != nil {
					ipBanManager.BanIP(c.clientIP, BanDuration)
				}
				c.sendError("banned_cheating")
				// 强制断开连接
				c.conn.Close()
				return
			}

			c.sendError("move_too_fast")
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
