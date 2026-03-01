# YTS Go Crawler

A Go CLI that crawls [YTS](https://www.yts-official.to/) (YIFY) and collects all listed movies into a single JSON file. It paginates through the browse-movies listing and extracts title, year, rating, genres, poster URL, and detail page URL for each movie.

## Requirements

- **Go 1.24+** (see `go.mod`)

## Build

```bash
cd apps/go-crawler
go build -o go-crawler .
```

## Usage

Run from the `apps/go-crawler` directory:

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

## Flags

| Flag         | Default     | Description                                  |
|--------------|-------------|----------------------------------------------|
| `-output`    | `movies.json` | Path to the output JSON file.               |
| `-delay`     | `1500ms`    | Delay between page requests (e.g. `1s`, `500ms`). |
| `-max-pages` | `0`         | Max number of pages to crawl; `0` = unlimited. |
| `-verbose`   | `false`     | Log each movie as it is found.              |

## Output format

The crawler writes a JSON array of movie objects:

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

## Notes

- The crawler targets **www.yts-official.top** (the site’s browse domain). The homepage **www2.yts-official.to** redirects browse links there.
- Use a reasonable `-delay` to avoid overloading the site; default is 1.5s between pages.
- Total page count is read from the first page’s pagination; the site currently has thousands of pages.
