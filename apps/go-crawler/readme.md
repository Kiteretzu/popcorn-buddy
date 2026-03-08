# YTS Go Crawler

A Go CLI that crawls [YTS](https://www.yts-official.to/) (YIFY) and collects all listed movies into a single JSON file. It paginates through the browse-movies listing and extracts title, year, rating, genres, poster URL, and detail page URL for each movie. Additional commands can seed a database and enrich movies with magnet links.

## Requirements

- **Go 1.24+** (see `go.mod`)
- **PostgreSQL** (for `cmd/seed` and `cmd/fetch-magnets -db`)

## Build

```bash
cd apps/go-crawler
go build -o go-crawler .
```

---

## Commands overview

| Command | Purpose |
|--------|--------|
| `go run .` | Crawl browse-movies and write `movies.json` (optionally upsert to DB). |
| `go run ./cmd/seed` | Read `movies.json` and upsert all entries into `global_movies`. |
| `go run ./cmd/fetch-magnets` | Read `movies.json`, visit each movie URL, fetch magnet link, write enriched JSON (and optionally update DB). |

All commands are run from the `apps/go-crawler` directory.

---

## 1. Main crawler (fetch movie list)

Crawls the browse-movies listing and writes a JSON array of movies (title, year, rating, genres, poster, url).

```bash
go run . [flags]
# or, after building:
./go-crawler [flags]
```

### Examples

**Full crawl** — all pages (~3,654 pages, ~73k movies; expect ~1.5h with default delay):

```bash
go run . -output=movies.json
```

**Limited crawl** — first 100 pages (~2,000 movies):

```bash
go run . -max-pages=100 -output=movies.json
```

**Faster run with verbose logging** — shorter delay, log each movie:

```bash
go run . -max-pages=50 -delay=800ms -verbose -output=movies.json
```

**Crawl and upsert to PostgreSQL:**

```bash
go run . -output=movies.json -db "postgresql://user:pass@host:5432/dbname"
```

### Flags

| Flag         | Default       | Description                                      |
|--------------|---------------|--------------------------------------------------|
| `-output`    | `movies.json` | Path to the output JSON file.                    |
| `-delay`     | `1500ms`      | Delay between page requests (e.g. `1s`, `500ms`). |
| `-max-pages` | `0`           | Max number of pages to crawl; `0` = unlimited.   |
| `-verbose`   | `false`       | Log each movie as it is found.                   |
| `-db`        | (none)        | If set, upsert collected movies into `global_movies`. |

---

## 2. Seed (movies.json → database)

Reads `movies.json` and upserts every entry into the `global_movies` table. Use this after generating `movies.json` with the main crawler (or any compatible JSON array of movies).

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname" go run ./cmd/seed [flags]
```

### Examples

**Default** — read `movies.json` in current directory:

```bash
DATABASE_URL="postgresql://..." go run ./cmd/seed
```

**Custom input and batch size:**

```bash
DATABASE_URL="postgresql://..." go run ./cmd/seed -input /path/to/movies.json -batch 5000
```

### Flags

| Flag   | Default     | Description                          |
|--------|-------------|--------------------------------------|
| `-input`  | `movies.json` | Path to the input JSON file.       |
| `-batch`  | `5000`        | Number of movies to upsert per batch. |

**Required env:** `DATABASE_URL` — PostgreSQL connection string.

---

## 3. Fetch magnets (enrich with magnet links)

Reads `movies.json`, visits each movie’s detail page URL, scrapes the magnet link from the YTS page (preferring 2160p → 1080p → first available), and writes an enriched JSON file. Optionally updates `global_movies.magnetLink` when `-db` is set.

```bash
go run ./cmd/fetch-magnets [flags]
```

### Examples

**Enrich first 10 movies (dry run):**

```bash
go run ./cmd/fetch-magnets -input movies.json -output movies-with-magnets.json -limit 10 -verbose
```

**Full run** — all movies, 1.5s delay between requests:

```bash
go run ./cmd/fetch-magnets -input movies.json -output movies-with-magnets.json
```

**Resume** — skip first 1000, process next 2000:

```bash
go run ./cmd/fetch-magnets -input movies.json -output movies-with-magnets.json -skip 1000 -limit 2000
```

**Enrich and update database:**

```bash
go run ./cmd/fetch-magnets -input movies.json -db "$DATABASE_URL"
```

### Flags

| Flag     | Default                 | Description                                      |
|----------|-------------------------|--------------------------------------------------|
| `-input` | `movies.json`          | Path to input movies JSON.                      |
| `-output`| `movies-with-magnets.json` | Path to output JSON (enriched with `magnetLink`). |
| `-delay` | `1500ms`               | Delay between page requests.                     |
| `-limit` | `0`                    | Max movies to process; `0` = all.                |
| `-skip`  | `0`                    | Number of movies to skip from the start (resume). |
| `-db`    | (none)                 | If set, update `global_movies.magnetLink` for each movie. |
| `-verbose` | `false`              | Log each movie as it is processed.               |

Quality preference when multiple torrents exist: **2160p (4K)** → **1080p** → first available (e.g. 720p).

---

## Output format

The main crawler and seed work with a JSON array of movie objects:

```json
[
  {
    "title": "Durango",
    "year": "1999",
    "rating": "6.4 / 10",
    "genres": ["Drama", "Romance"],
    "poster": "https://www.yts-official.top/movies/poster/durango-1999.jpg",
    "url": "https://www.yts-official.top/movies/durango-1999/"
  }
]
```

After running `fetch-magnets`, output entries include an optional `magnetLink`:

```json
{
  "title": "Durango",
  "year": "1999",
  "rating": "6.4 / 10",
  "genres": ["Drama", "Romance"],
  "poster": "https://...",
  "url": "https://...",
  "magnetLink": "magnet:?xt=urn:btih:..."
}
```

## Notes

- The crawler targets **www.yts-official.top** (the site’s browse domain). The homepage **www2.yts-official.to** redirects browse links there.
- Use a reasonable `-delay` to avoid overloading the site; default is 1.5s between pages.
- Total page count is read from the first page’s pagination; the site currently has thousands of pages.
- For ~78k movies, `fetch-magnets` with default delay takes many hours; use `-skip` and `-limit` for batches or overnight runs.
