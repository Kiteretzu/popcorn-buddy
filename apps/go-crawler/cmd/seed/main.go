// Seed reads movies.json and upserts all entries into the global_movies table.
// Usage (from apps/go-crawler):
//
//	DATABASE_URL="postgresql://..." go run ./cmd/seed
//	DATABASE_URL="..." go run ./cmd/seed -input /path/to/movies.json
package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"time"

	"github.com/popcorn-buddies/go-crawler/db"
	"github.com/popcorn-buddies/go-crawler/models"
)

func main() {
	input := flag.String("input", "movies.json", "Path to movies.json")
	batchSize := flag.Int("batch", 5000, "Number of movies to upsert per batch")
	flag.Parse()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	start := time.Now()

	f, err := os.Open(*input)
	if err != nil {
		log.Fatalf("Open %q: %v", *input, err)
	}
	defer f.Close()

	dec := json.NewDecoder(f)
	if _, err := dec.Token(); err != nil {
		log.Fatalf("Decode array start: %v", err)
	}

	ctx := context.Background()
	ingestor, err := db.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("DB connection: %v", err)
	}
	defer ingestor.Close(ctx)

	var batch []models.Movie
	totalUpserted := 0
	totalSkipped := 0

	for dec.More() {
		var m models.Movie
		if err := dec.Decode(&m); err != nil {
			log.Fatalf("Decode movie: %v", err)
		}
		if m.URL == "" || m.Title == "" {
			totalSkipped++
			continue
		}
		batch = append(batch, m)
		if len(batch) >= *batchSize {
			n, err := ingestor.UpsertMoviesBatched(ctx, batch, *batchSize)
			if err != nil {
				log.Fatalf("Upsert batch: %v", err)
			}
			totalUpserted += n
			log.Printf("Upserted batch: %d (total so far: %d)", n, totalUpserted)
			batch = batch[:0]
		}
	}

	if len(batch) > 0 {
		n, err := ingestor.UpsertMoviesBatched(ctx, batch, *batchSize)
		if err != nil {
			log.Fatalf("Upsert final batch: %v", err)
		}
		totalUpserted += n
	}

	if _, err := dec.Token(); err != nil {
		log.Fatalf("Decode array end: %v", err)
	}

	elapsed := time.Since(start)
	log.Printf("Done. Upserted: %d, skipped: %d in %s", totalUpserted, totalSkipped, elapsed.Round(time.Millisecond))
}
