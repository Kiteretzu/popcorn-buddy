package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"time"

	"github.com/popcorn-buddies/go-crawler/crawler"
	"github.com/popcorn-buddies/go-crawler/db"
)

func main() {
	output := flag.String("output", "movies.json", "Path to the output JSON file")
	delay := flag.Duration("delay", 1500*time.Millisecond, "Delay between page requests (e.g. 1s, 500ms)")
	maxPages := flag.Int("max-pages", 0, "Maximum number of pages to crawl (0 = unlimited)")
	verbose := flag.Bool("verbose", false, "Log each movie as it is found")
	dbURL := flag.String("db", "", "PostgreSQL DATABASE_URL; if set, upserts movies into global_movies table")
	flag.Parse()

	log.Printf("Starting YTS crawler (delay=%s, max-pages=%d)", *delay, *maxPages)

	c := crawler.New(*delay, *maxPages, *verbose)

	movies, err := c.FetchAllMovies()
	if err != nil {
		log.Fatalf("Crawl failed: %v", err)
	}

	log.Printf("Crawl complete. Total movies collected: %d", len(movies))

	// Upsert into PostgreSQL if -db flag provided
	if *dbURL != "" {
		ctx := context.Background()
		ingestor, err := db.New(ctx, *dbURL)
		if err != nil {
			log.Fatalf("DB connection failed: %v", err)
		}
		defer ingestor.Close(ctx)

		upserted, err := ingestor.UpsertMovies(ctx, movies)
		if err != nil {
			log.Fatalf("DB upsert failed: %v", err)
		}
		log.Printf("Upserted %d movies into global_movies", upserted)
	}

	// Always write JSON output
	f, err := os.Create(*output)
	if err != nil {
		log.Fatalf("Cannot create output file %q: %v", *output, err)
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(movies); err != nil {
		log.Fatalf("Failed to write JSON: %v", err)
	}

	log.Printf("Results saved to %s", *output)
}
