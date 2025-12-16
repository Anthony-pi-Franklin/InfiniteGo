package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"

	server "github.com/Anthony-pi-Franklin/InfiniteGo/rt-sand-mvp/server"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	// Create room manager to handle multiple rooms
	roomManager := server.NewRoomManager(ctx)

	mux := http.NewServeMux()

	staticDir, err := filepath.Abs(filepath.Join("..", "client"))
	if err != nil {
		log.Fatalf("resolve static dir: %v", err)
	}
	fs := http.FileServer(http.Dir(staticDir))
	mux.Handle("/", fs)
	
	// WebSocket handler with room support
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		server.ServeWS(roomManager, w, r)
	})
	
	// API endpoint to list rooms
	mux.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		rooms := roomManager.GetRoomInfoList()
		if err := json.NewEncoder(w).Encode(rooms); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})

	addr := ":8080"
	srv := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("listening on %s", addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
