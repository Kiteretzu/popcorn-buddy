// Fetch-magnets reads movies.json, visits each movie's URL, scrapes the magnet link
// from the YTS detail page, and writes an enriched JSON file. Optionally updates
// global_movies.magnetLink when -db is set.
//
// Usage (from apps/go-crawler):
//
//	go run ./cmd/fetch-magnets -input movies.json -output movies-with-magnets.json
//	go run ./cmd/fetch-magnets -input movies.json -limit 10 -verbose
//	DATABASE_URL="..." go run ./cmd/fetch-magnets -input movies.json -db "$DATABASE_URL"
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/popcorn-buddies/go-crawler/crawler"
	"github.com/popcorn-buddies/go-crawler/db"
	"github.com/popcorn-buddies/go-crawler/models"
)

func main() {
	input := flag.String("input", "movies.json", "Path to input movies.json")
	output := flag.String("output", "movies-with-magnets.json", "Path to output JSON file")
	delay := flag.Duration("delay", 1500*time.Millisecond, "Delay between page requests")
	limit := flag.Int("limit", 0, "Max number of movies to process (0 = all)")
	skip := flag.Int("skip", 0, "Number of movies to skip from the start (for resume)")
	dbURL := flag.String("db", "", "If set, update global_movies.magnetLink for each movie")
	verbose := flag.Bool("verbose", false, "Log each movie as it is processed")
	flag.Parse()

	client := &http.Client{Timeout: 30 * time.Second}

	var ingestor *db.Ingestor
	if *dbURL != "" {
		ctx := context.Background()
		var err error
		ingestor, err = db.New(ctx, *dbURL)
		if err != nil {
			log.Fatalf("DB connection: %v", err)
		}
		defer ingestor.Close(ctx)
	}

	f, err := os.Open(*input)
	if err != nil {
		log.Fatalf("Open %q: %v", *input, err)
	}
	defer f.Close()

	out, err := os.Create(*output)
	if err != nil {
		log.Fatalf("Create %q: %v", *output, err)
	}
	defer out.Close()

	dec := json.NewDecoder(f)
	if _, err := dec.Token(); err != nil {
		log.Fatalf("Decode array start: %v", err)
	}

	if _, err := out.WriteString("[\n"); err != nil {
		log.Fatalf("Write: %v", err)
	}

	ctx := context.Background()
	var pending *models.Movie
	processed := 0
	skipped := 0
	fetched := 0
	failures := 0

	for dec.More() {
		var m models.Movie
		if err := dec.Decode(&m); err != nil {
			log.Fatalf("Decode movie: %v", err)
		}

		if skipped < *skip {
			skipped++
			// Still need to write this movie to output (unchanged) to keep array valid
			writeMovie(out, &pending, &m, true)
			continue
		}

		if *limit > 0 && processed >= *limit {
			// Copy rest of input to output without fetching
			writeMovie(out, &pending, &m, true)
			for dec.More() {
				if err := dec.Decode(&m); err != nil {
					log.Fatalf("Decode movie: %v", err)
				}
				writeMovie(out, &pending, &m, true)
			}
			break
		}

		if m.URL != "" {
			time.Sleep(*delay)
			magnet, err := crawler.FetchMagnetFromPage(client, m.URL)
			if err != nil {
				if *verbose {
					log.Printf("Fetch %s: %v", m.URL, err)
				}
				failures++
			} else if magnet != "" {
				m.MagnetLink = magnet
				fetched++
				if *verbose {
					log.Printf("  %s (%s): magnet found", m.Title, m.Year)
				}
			}

			if ingestor != nil && m.MagnetLink != "" {
				if err := ingestor.UpdateMagnetByURL(ctx, m.URL, m.MagnetLink); err != nil {
					log.Printf("Update DB %q: %v", m.URL, err)
				}
			}
		}

		processed++
		writeMovie(out, &pending, &m, true)
	}

	// Write last pending without trailing comma
	writeMovie(out, &pending, nil, false)
	if _, err := out.WriteString("]\n"); err != nil {
		log.Fatalf("Write: %v", err)
	}

	if _, err := dec.Token(); err != nil {
		log.Fatalf("Decode array end: %v", err)
	}

	log.Printf("Done. Processed: %d, magnets fetched: %d, failures: %d → %s", processed, fetched, failures, *output)
}

// writeMovie writes the previous pending movie to out, then sets pending to next.
// If addComma is true, a comma and newline are written after the object (for array elements).
// Uses SetEscapeHTML(false) so magnet URLs are stored with literal & instead of \u0026.
func writeMovie(out *os.File, pending **models.Movie, next *models.Movie, addComma bool) {
	if *pending != nil {
		var buf bytes.Buffer
		enc := json.NewEncoder(&buf)
		enc.SetEscapeHTML(false)
		if err := enc.Encode(*pending); err != nil {
			log.Fatalf("Marshal: %v", err)
		}
		data := buf.Bytes()
		if len(data) > 0 && data[len(data)-1] == '\n' {
			data = data[:len(data)-1]
		}
		suffix := "\n"
		if addComma {
			suffix = ",\n"
		}
		if _, err := out.Write(append(append([]byte("  "), data...), []byte(suffix)...)); err != nil {
			log.Fatalf("Write: %v", err)
		}
	}
	*pending = next
}
