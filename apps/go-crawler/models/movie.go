package models

// Movie represents a single movie scraped from YTS.
type Movie struct {
	Title      string   `json:"title"`
	Year       string   `json:"year"`
	Rating     string   `json:"rating"`
	Genres     []string `json:"genres"`
	Poster     string   `json:"poster"`
	URL        string   `json:"url"`
	MagnetLink string   `json:"magnetLink,omitempty"`
}
