# InfiniteGo — Project Description

InfiniteGo is a real-time, multiplayer, ultra-large-scale board game inspired by Go, designed for LAN play. Unlike traditional turn-based Go, InfiniteGo eliminates turns entirely: players compete in a first-come-first-served style, dropping their stones as fast as they can.

**Key features:**

1. Massive, virtually infinite board: Supports up to 1e8 × 1e8 coordinates with sparse data representation.

2. Real-time multiplayer: Designed for 3–5 players in a single LAN room with minimal latency.

3. Simple yet strategic rules: Stones without liberties are captured, maintaining the core Go mechanic while prioritizing speed and responsiveness.

4. Efficient single-threaded server: Each room processes moves sequentially, ensuring authoritative state and consistency while remaining lightweight.

5. Expandable architecture: Clean separation between game logic, networking, and client rendering allows future performance upgrades or additional features.

InfiniteGo is ideal for experimenting with large-scale, real-time board mechanics while keeping gameplay intuitive and responsive.

## RT-Sand MVP Layout

- `rt-sand-mvp/server`: Go single-room authoritative server with sparse chunk storage and WebSocket endpoint.
- `rt-sand-mvp/client`: HTML/Canvas client that connects over WebSocket and renders stones with pan/zoom.
- `rt-sand-mvp/protocol`: Protobuf definition for move/result/delta messages.

### Run locally

```bash
cd rt-sand-mvp/server
go run ./cmd
# open http://localhost:8080 in a browser
```
