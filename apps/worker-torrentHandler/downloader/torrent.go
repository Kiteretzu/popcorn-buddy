package downloader

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/anacrolix/torrent"
)

// Result is returned after a successful download.
type Result struct {
	// FilePath is the absolute path to the downloaded video file.
	FilePath string
	// FileName is just the base name.
	FileName string
}

// ProgressFunc is called periodically with download percentage (0–100).
type ProgressFunc func(progress int)

// Download downloads the torrent identified by magnetURI into destDir,
// calling onProgress every 2 seconds. Returns the largest file's path.
func Download(ctx context.Context, magnetURI, destDir string, onProgress ProgressFunc) (*Result, error) {
	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = destDir
	cfg.DisableIPv6 = false

	c, err := torrent.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("creating torrent client: %w", err)
	}
	defer c.Close()

	t, err := c.AddMagnet(magnetURI)
	if err != nil {
		return nil, fmt.Errorf("adding magnet: %w", err)
	}

	log.Println("Waiting for torrent metadata...")
	select {
	case <-t.GotInfo():
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	log.Printf("Torrent: %s (%.2f MB)", t.Name(), float64(t.Length())/(1024*1024))
	t.DownloadAll()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	done := t.Complete.On()

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()

		case <-done:
			onProgress(100)
			log.Println("Download complete")
			return largestFile(destDir, t.Name())

		case <-ticker.C:
			total := t.Length()
			if total == 0 {
				continue
			}
			completed := t.BytesCompleted()
			pct := int(float64(completed) / float64(total) * 100)
			if pct > 100 {
				pct = 100
			}
			log.Printf("Download progress: %d%%", pct)
			onProgress(pct)
		}
	}
}

func largestFile(destDir, torrentName string) (*Result, error) {
	base := filepath.Join(destDir, torrentName)

	info, err := os.Stat(base)
	if err != nil {
		return nil, fmt.Errorf("stat download path %q: %w", base, err)
	}

	if !info.IsDir() {
		return &Result{FilePath: base, FileName: torrentName}, nil
	}

	entries, err := os.ReadDir(base)
	if err != nil {
		return nil, fmt.Errorf("reading download dir: %w", err)
	}

	type fileEntry struct {
		name string
		size int64
	}
	var files []fileEntry
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		fi, err := e.Info()
		if err != nil {
			continue
		}
		files = append(files, fileEntry{name: e.Name(), size: fi.Size()})
	}

	if len(files) == 0 {
		return nil, fmt.Errorf("no files found in %q", base)
	}

	sort.Slice(files, func(i, j int) bool { return files[i].size > files[j].size })
	largest := files[0]

	return &Result{
		FilePath: filepath.Join(base, largest.name),
		FileName: largest.name,
	}, nil
}
