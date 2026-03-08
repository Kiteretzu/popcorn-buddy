package crawler

import (
	"fmt"
	"html"
	"io"
	"net/http"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// magnetHeaders are used for GET requests to movie detail pages (same as defaultHeaders in yts.go).
var magnetHeaders = map[string]string{
	"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
	"Accept-Language":           "en-US,en;q=0.9",
	"Connection":                "keep-alive",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent":                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
}

// FetchMagnetFromPage GETs the movie detail page at movieURL, parses it with goquery, and returns
// one magnet link. Prefers 1080p (matches backend crawl_yts behavior); otherwise returns the first
// magnet found in .modal-torrent blocks. Returns empty string on failure or when no magnet is found.
func FetchMagnetFromPage(client *http.Client, movieURL string) (string, error) {
	body, err := getPage(client, movieURL)
	if err != nil {
		return "", err
	}
	defer body.Close()

	doc, err := goquery.NewDocumentFromReader(body)
	if err != nil {
		return "", fmt.Errorf("parsing HTML: %w", err)
	}

	// Prefer highest quality: 2160p (4K) > 1080p > first available (e.g. 720p).
	var magnet2160, magnet1080, first string
	doc.Find(".modal-torrent").Each(func(_ int, s *goquery.Selection) {
		magnet, _ := s.Find("a.magnet").Attr("href")
		magnet = strings.TrimSpace(magnet)
		if magnet != "" {
			magnet = html.UnescapeString(magnet) // decode &amp; etc. to canonical &
		}
		if magnet == "" || !strings.HasPrefix(magnet, "magnet:") {
			return
		}
		if first == "" {
			first = magnet
		}
		quality := strings.TrimSpace(s.Find(".modal-quality span").Text())
		switch {
		case strings.Contains(quality, "2160p"):
			magnet2160 = magnet
		case strings.Contains(quality, "1080p"):
			magnet1080 = magnet
		}
	})

	if magnet2160 != "" {
		return magnet2160, nil
	}
	if magnet1080 != "" {
		return magnet1080, nil
	}
	return first, nil
}

// getPage performs a GET request with browser-like headers.
func getPage(client *http.Client, url string) (io.ReadCloser, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	for k, v := range magnetHeaders {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("GET %s returned status %d", url, resp.StatusCode)
	}
	return resp.Body, nil
}
