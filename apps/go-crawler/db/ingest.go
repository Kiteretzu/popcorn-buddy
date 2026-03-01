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

// UpsertMovies inserts or updates movies in the global_movies table.
// Movies are matched by the `url` unique key.
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
