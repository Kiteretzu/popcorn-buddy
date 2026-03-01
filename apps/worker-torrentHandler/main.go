package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	"github.com/popcorn-buddies/worker-torrenthandler/downloader"
	"github.com/popcorn-buddies/worker-torrenthandler/reporter"
	"github.com/popcorn-buddies/worker-torrenthandler/uploader"
)

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required env var %q is not set", key)
	}
	return v
}

func main() {
	// Load .env from current directory when present (local testing; ECS uses task env)
	_ = godotenv.Load()

	downloadJobID := mustEnv("DOWNLOAD_JOB_ID")
	userID := mustEnv("USER_ID")
	magnetURL := mustEnv("MAGNET_URL")
	movieSlug := mustEnv("MOVIE_SLUG")
	bucket := mustEnv("AWS_S3_BUCKET_NAME")
	region := mustEnv("AWS_REGION")
	accessKey := mustEnv("AWS_ACCESS_KEY_ID")
	secretKey := mustEnv("AWS_SECRET_ACCESS_KEY")
	kafkaBroker := mustEnv("KAFKA_BROKER")

	log.Printf("Starting torrent download: job=%s slug=%s", downloadJobID, movieSlug)

	rep := reporter.New(kafkaBroker, downloadJobID, userID)
	defer rep.Close()

	ctx := context.Background()

	destDir := filepath.Join(os.TempDir(), "downloads")
	if err := os.MkdirAll(destDir, 0o755); err != nil {
		log.Fatalf("creating download dir: %v", err)
	}

	rep.Publish(ctx, "download", 0, "in_progress")

	result, err := downloader.Download(ctx, magnetURL, destDir, func(pct int) {
		rep.Publish(ctx, "download", pct, "in_progress")
	})
	if err != nil {
		rep.Publish(ctx, "download", 0, "failed")
		log.Fatalf("download failed: %v", err)
	}

	log.Printf("Downloaded: %s", result.FilePath)
	rep.Publish(ctx, "download", 100, "in_progress")

	s3Key := fmt.Sprintf("torrents/%s/%s", downloadJobID, result.FileName)
	log.Printf("Uploading to S3: bucket=%s key=%s", bucket, s3Key)

	up, err := uploader.New(bucket, region, accessKey, secretKey)
	if err != nil {
		rep.Publish(ctx, "download", 100, "failed")
		log.Fatalf("creating S3 uploader: %v", err)
	}

	if err := up.Upload(ctx, result.FilePath, s3Key); err != nil {
		rep.Publish(ctx, "download", 100, "failed")
		log.Fatalf("S3 upload failed: %v", err)
	}

	log.Printf("Upload complete: s3://%s/%s", bucket, s3Key)
	rep.Publish(ctx, "download", 100, "completed")

	log.Println("Torrent worker finished successfully")
}
