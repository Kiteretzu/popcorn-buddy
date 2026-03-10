// Server runs an HTTP API on port 4010 that fetches a magnet link for a single
// YTS movie page URL using the same logic as fetch-magnets.
//
// Usage (from apps/go-crawler):
//
//	go run ./cmd/server
//
// API:
//
//	GET  /magnet?url=<movie-page-url>
//	POST /magnet  Body: {"url":"<movie-page-url>"}
//
// Response: {"magnetLink":"magnet:?xt=..."} or {"error":"..."}
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/popcorn-buddies/go-crawler/crawler"
)

const addr = ":4111"

func main() {
	client := &http.Client{Timeout: 30 * time.Second}

	http.HandleFunc("/magnet", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}

		var url string
		switch r.Method {
		case http.MethodGet:
			url = r.URL.Query().Get("url")
		case http.MethodPost:
			var body struct {
				URL string `json:"url"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
				return
			}
			url = body.URL
		}

		if url == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "url is required"})
			return
		}

		magnet, err := crawler.FetchMagnetFromPage(client, url)
		if err != nil {
			log.Printf("FetchMagnetFromPage %s: %v", url, err)
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
			return
		}
		if magnet == "" {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "no magnet link found for this page"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"magnetLink": magnet})
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	log.Printf("go-crawler API listening on %s (GET/POST /magnet?url=... or POST /magnet with JSON body)", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("ListenAndServe: %v", err)
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}
