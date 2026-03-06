package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/popcorn-buddies/go-crawler/models"
)

// Ingestor writes movies into the global_movies table.
type Ingestor struct {
	conn *pgx.Conn
}

// New opens a connection to the given DATABASE_URL.
func New(ctx context.Context, databaseURL string) (*Ingestor, error) {
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connecting to db: %w", err)
	}
	return &Ingestor{conn: conn}, nil
}

// Close closes the underlying DB connection.
func (i *Ingestor) Close(ctx context.Context) {
	i.conn.Close(ctx)
}

const colsPerRow = 6 // title, year, rating, genres, poster, url

// UpsertMovies inserts or updates movies one-by-one. Prefer UpsertMoviesBatched for large slices.
func (i *Ingestor) UpsertMovies(ctx context.Context, movies []models.Movie) (int, error) {
	upserted := 0
	for _, m := range movies {
		if m.URL == "" || m.Title == "" {
			continue
		}

		genresLiteral := "{" + strings.Join(quoteSlice(m.Genres), ",") + "}"

		_, err := i.conn.Exec(ctx, `
			INSERT INTO global_movies (id, title, year, rating, genres, poster, url, "createdAt")
			VALUES (gen_random_uuid(), $1, $2, $3, $4::text[], $5, $6, now())
			ON CONFLICT (url) DO UPDATE SET
				title   = EXCLUDED.title,
				year    = EXCLUDED.year,
				rating  = EXCLUDED.rating,
				genres  = EXCLUDED.genres,
				poster  = EXCLUDED.poster
		`, m.Title, nullStr(m.Year), nullStr(m.Rating), genresLiteral, nullStr(m.Poster), m.URL)
		if err != nil {
			return upserted, fmt.Errorf("upsert %q: %w", m.URL, err)
		}
		upserted++
	}
	return upserted, nil
}

// UpsertMoviesBatched does a single multi-row INSERT ... ON CONFLICT per batch (much faster for large datasets).
func (i *Ingestor) UpsertMoviesBatched(ctx context.Context, movies []models.Movie, batchSize int) (int, error) {
	if batchSize <= 0 {
		batchSize = 2000
	}
	upserted := 0
	for start := 0; start < len(movies); start += batchSize {
		end := start + batchSize
		if end > len(movies) {
			end = len(movies)
		}
		chunk := movies[start:end]
		n, err := i.upsertBatch(ctx, chunk)
		if err != nil {
			return upserted, err
		}
		upserted += n
	}
	return upserted, nil
}

func (i *Ingestor) upsertBatch(ctx context.Context, movies []models.Movie) (int, error) {
	// Dedupe by URL within batch so ON CONFLICT doesn't see the same row twice (last wins).
	byURL := make(map[string]models.Movie)
	for _, m := range movies {
		if m.URL == "" || m.Title == "" {
			continue
		}
		byURL[m.URL] = m
	}
	// Build VALUES and args from deduplicated set
	var args []any
	var ph []string
	for _, m := range byURL {
		base := len(args) + 1
		ph = append(ph, fmt.Sprintf("(gen_random_uuid(), $%d, $%d, $%d, $%d::text[], $%d, $%d, now())",
			base, base+1, base+2, base+3, base+4, base+5))
		genresLiteral := "{" + strings.Join(quoteSlice(m.Genres), ",") + "}"
		args = append(args, m.Title, nullStr(m.Year), nullStr(m.Rating), genresLiteral, nullStr(m.Poster), m.URL)
	}
	if len(ph) == 0 {
		return 0, nil
	}
	query := `INSERT INTO global_movies (id, title, year, rating, genres, poster, url, "createdAt")
		VALUES ` + strings.Join(ph, ", ") + `
		ON CONFLICT (url) DO UPDATE SET
			title   = EXCLUDED.title,
			year    = EXCLUDED.year,
			rating  = EXCLUDED.rating,
			genres  = EXCLUDED.genres,
			poster  = EXCLUDED.poster`
	_, err := i.conn.Exec(ctx, query, args...)
	if err != nil {
		return 0, fmt.Errorf("batch upsert: %w", err)
	}
	return len(args) / colsPerRow, nil
}

func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func quoteSlice(ss []string) []string {
	out := make([]string, len(ss))
	for i, s := range ss {
		// Escape internal double-quotes and wrap in double-quotes for pg array literal
		out[i] = `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
	}
	return out
}
