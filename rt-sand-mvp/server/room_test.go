package server

import "testing"

func TestCaptureAcrossChunkBoundary(t *testing.T) {
	room := NewRoom()

	// Surround the target position at (511,0) with black stones, leaving one liberty at (512,0).
	moves := []MoveRequest{
		{X: 510, Y: 0, Color: ColorBlack},
		{X: 511, Y: -1, Color: ColorBlack},
		{X: 511, Y: 1, Color: ColorBlack},
		{X: 511, Y: 0, Color: ColorWhite}, // target white stone
	}
	for i, m := range moves {
		res := room.ProcessMove(m)
		if !res.Accepted {
			t.Fatalf("move %d rejected: %v", i, res.Reason)
		}
	}

	result := room.ProcessMove(MoveRequest{X: 512, Y: 0, Color: ColorBlack})
	if !result.Accepted {
		t.Fatalf("capture move rejected: %v", result.Reason)
	}
	if len(result.Removed) != 1 {
		t.Fatalf("expected 1 stone removed, got %d", len(result.Removed))
	}
	removed := result.Removed[0]
	if removed.X != 511 || removed.Y != 0 || removed.Color != ColorWhite {
		t.Fatalf("unexpected removed stone: %+v", removed)
	}
	if result.Added == nil {
		t.Fatalf("capturing stone should remain on board")
	}
	if room.hasStone(511, 0) {
		t.Fatalf("captured stone still present on board")
	}
	if !room.hasStone(512, 0) {
		t.Fatalf("capturing stone missing on board")
	}
}

func TestSuicideAllowed(t *testing.T) {
	room := NewRoom()
	setup := []MoveRequest{
		{X: 1, Y: 0, Color: ColorBlack},
		{X: -1, Y: 0, Color: ColorBlack},
		{X: 0, Y: 1, Color: ColorBlack},
		{X: 0, Y: -1, Color: ColorBlack},
	}
	for i, m := range setup {
		res := room.ProcessMove(m)
		if !res.Accepted {
			t.Fatalf("setup move %d rejected: %v", i, res.Reason)
		}
	}

	result := room.ProcessMove(MoveRequest{X: 0, Y: 0, Color: ColorWhite})
	if !result.Accepted {
		t.Fatalf("suicide move rejected: %v", result.Reason)
	}
	if result.Added != nil {
		t.Fatalf("suicide move should not leave stone on board")
	}
	if len(result.Removed) != 1 || result.Removed[0].Color != ColorWhite {
		t.Fatalf("expected center white stone to be removed, got %+v", result.Removed)
	}
	if room.hasStone(0, 0) {
		t.Fatalf("suicide stone still present on board")
	}
}

func TestCaptureWithoutSelfDeath(t *testing.T) {
	room := NewRoom()

	// White stone with one liberty at (1,0).
	if res := room.ProcessMove(MoveRequest{X: 0, Y: 0, Color: ColorWhite}); !res.Accepted {
		t.Fatalf("white placement rejected: %v", res.Reason)
	}

	// Black stones surrounding the white stone and the target placement.
	setup := []MoveRequest{
		{X: -1, Y: 0, Color: ColorBlack},
		{X: 0, Y: 1, Color: ColorBlack},
		{X: 0, Y: -1, Color: ColorBlack},
		{X: 2, Y: 0, Color: ColorBlack},
		{X: 1, Y: 1, Color: ColorBlack},
		{X: 1, Y: -1, Color: ColorBlack},
	}
	for i, m := range setup {
		res := room.ProcessMove(m)
		if !res.Accepted {
			t.Fatalf("setup move %d rejected: %v", i, res.Reason)
		}
	}

	// This move has no liberties unless the white stone is captured.
	result := room.ProcessMove(MoveRequest{X: 1, Y: 0, Color: ColorBlack})
	if !result.Accepted {
		t.Fatalf("capture move rejected: %v", result.Reason)
	}
	if len(result.Removed) != 1 {
		t.Fatalf("expected to capture one stone, got %d", len(result.Removed))
	}
	if result.Removed[0].X != 0 || result.Removed[0].Y != 0 || result.Removed[0].Color != ColorWhite {
		t.Fatalf("unexpected removal: %+v", result.Removed[0])
	}
	if result.Added == nil {
		t.Fatalf("capturing stone should remain on board")
	}
	if !room.hasStone(1, 0) {
		t.Fatalf("capturing stone missing after move")
	}
	if room.hasStone(0, 0) {
		t.Fatalf("captured stone still present")
	}
}
