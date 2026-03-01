package crawler

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/popcorn-buddies/go-crawler/models"
)

const (
	baseURL   = "https://www.yts-official.top"
	browseURL = baseURL + "/browse-movies"
)

var defaultHeaders = map[string]string{
	"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language":           "en-US,en;q=0.9",
	"Connection":                "keep-alive",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent":                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
}

// Crawler holds the HTTP client and crawl configuration.
type Crawler struct {
	client   *http.Client
	delay    time.Duration
	maxPages int
	verbose  bool
}

// New creates a new Crawler instance.
func New(delay time.Duration, maxPages int, verbose bool) *Crawler {
	return &Crawler{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		delay:    delay,
		maxPages: maxPages,
		verbose:  verbose,
	}
}

// FetchAllMovies paginates through all browse-movies pages and collects every movie.
func (c *Crawler) FetchAllMovies() ([]models.Movie, error) {
	var all []models.Movie

	// Fetch page 1 first to discover total page count.
	movies, totalPages, err := c.scrapePage(1)
	if err != nil {
		return nil, fmt.Errorf("page 1: %w", err)
	}
	all = append(all, movies...)
	log.Printf("Page 1/%d: collected %d movies", totalPages, len(movies))

	limit := totalPages
	if c.maxPages > 0 && c.maxPages < totalPages {
		limit = c.maxPages
		log.Printf("Capping crawl at %d pages (site has %d)", limit, totalPages)
	}

	for page := 2; page <= limit; page++ {
		time.Sleep(c.delay)

		movies, _, err := c.scrapePage(page)
		if err != nil {
			log.Printf("Page %d error: %v — skipping", page, err)
			continue
		}

		if len(movies) == 0 {
			log.Printf("No movies on page %d, stopping early.", page)
			break
		}

		all = append(all, movies...)
		log.Printf("Page %d/%d: collected %d movies (total: %d)", page, limit, len(movies), len(all))
	}

	return all, nil
}

// scrapePage fetches a single browse page, parses movie cards, and returns the
// total number of pages detected in the pagination.
func (c *Crawler) scrapePage(page int) ([]models.Movie, int, error) {
	url := fmt.Sprintf("%s?page=%d", browseURL, page)

	body, err := c.get(url)
	if err != nil {
		return nil, 0, err
	}
	defer body.Close()

	doc, err := goquery.NewDocumentFromReader(body)
	if err != nil {
		return nil, 0, fmt.Errorf("parsing HTML: %w", err)
	}

	var movies []models.Movie
	doc.Find(".browse-movie-wrap").Each(func(_ int, s *goquery.Selection) {
		movie := c.parseMovieCard(s)
		if movie.Title != "" {
			movies = append(movies, movie)
			if c.verbose {
				log.Printf("  Found: %s (%s) [%s]", movie.Title, movie.Year, movie.Rating)
			}
		}
	})

	totalPages := detectTotalPages(doc)

	return movies, totalPages, nil
}

// parseMovieCard extracts movie data from a single .browse-movie-wrap element.
func (c *Crawler) parseMovieCard(s *goquery.Selection) models.Movie {
	// URL from the wrapping link
	href, _ := s.Find("a.browse-movie-link").Attr("href")
	url := resolveURL(href)

	// Title
	title := strings.TrimSpace(s.Find("a.browse-movie-title").Text())

	// Year
	year := strings.TrimSpace(s.Find(".browse-movie-year").Text())

	// Rating (e.g. "6.4 / 10")
	rating := strings.TrimSpace(s.Find("h4.rating").Text())

	// Poster — src is relative, e.g. /movies/poster/durango-1999.jpg
	posterSrc, _ := s.Find("img.img-responsive").Attr("src")
	poster := resolveURL(posterSrc)

	// Genres: all <h4> inside <figcaption> except the one with class "rating"
	var genres []string
	s.Find("figcaption h4").Each(func(_ int, h *goquery.Selection) {
		if h.HasClass("rating") {
			return
		}
		text := strings.TrimSpace(h.Text())
		if text != "" {
			genres = append(genres, text)
		}
	})

	return models.Movie{
		Title:  title,
		Year:   year,
		Rating: rating,
		Genres: genres,
		Poster: poster,
		URL:    url,
	}
}

// detectTotalPages reads the last page number from the tsc_pagination widget.
func detectTotalPages(doc *goquery.Document) int {
	total := 1
	doc.Find(".tsc_pagination a").Each(func(_ int, a *goquery.Selection) {
		href, exists := a.Attr("href")
		if !exists {
			return
		}
		// href looks like "/browse-movies?page=3654"
		if idx := strings.Index(href, "page="); idx >= 0 {
			numStr := href[idx+5:]
			if n, err := strconv.Atoi(numStr); err == nil && n > total {
				total = n
			}
		}
	})
	return total
}

// resolveURL turns a relative path into an absolute URL using baseURL.
func resolveURL(path string) string {
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "http") {
		return path
	}
	return baseURL + path
}

// get performs a GET request with browser-like headers.
func (c *Crawler) get(url string) (io.ReadCloser, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	for k, v := range defaultHeaders {
		req.Header.Set(k, v)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("GET %s returned status %d", url, resp.StatusCode)
	}

	return resp.Body, nil
}
