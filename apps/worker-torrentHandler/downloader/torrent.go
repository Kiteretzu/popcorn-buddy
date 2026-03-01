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
	FilePath string
	FileName string
}

// Progress holds stats reported every tick.
type Progress struct {
	Percent      int
	SpeedMBps    float64 // current download speed in MB/s
	DownloadedMB float64 // bytes downloaded so far in MB
	TotalMB      float64 // total size in MB
}

// ProgressFunc is called every 2 seconds with the current download stats.
type ProgressFunc func(p Progress)

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

	total := t.Length()
	log.Printf("Torrent: %s (%.2f MB)", t.Name(), float64(total)/(1024*1024))
	t.DownloadAll()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	var prevCompleted int64

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()

		case <-ticker.C:
			if total == 0 {
				continue
			}

			completed := t.BytesCompleted()
			delta := completed - prevCompleted // bytes downloaded in the last 2 s
			prevCompleted = completed

			pct := int(float64(completed) / float64(total) * 100)
			if pct > 100 {
				pct = 100
			}

			speedMBps := float64(delta) / 2.0 / (1024 * 1024) // bytes/s → MB/s

			p := Progress{
				Percent:      pct,
				SpeedMBps:    speedMBps,
				DownloadedMB: float64(completed) / (1024 * 1024),
				TotalMB:      float64(total) / (1024 * 1024),
			}

			log.Printf("Download: %d%% | %.2f MB/s | %.1f/%.1f MB",
				p.Percent, p.SpeedMBps, p.DownloadedMB, p.TotalMB)
			onProgress(p)

			if completed >= total {
				p.Percent = 100
				p.SpeedMBps = 0
				onProgress(p)
				log.Println("Download complete")
				return largestFile(destDir, t.Name())
			}
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
