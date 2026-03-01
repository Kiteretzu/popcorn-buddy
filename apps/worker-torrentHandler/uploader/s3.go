package uploader

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"sync/atomic"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// ProgressFunc is called as bytes are written to S3 (0–100).
type ProgressFunc func(pct int)

// Uploader handles S3 uploads.
type Uploader struct {
	mgr    *manager.Uploader
	bucket string
}

// New creates a new S3 Uploader using explicit credentials.
func New(bucket, region, accessKey, secretKey string) (*Uploader, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("loading aws config: %w", err)
	}

	mgr := manager.NewUploader(s3.NewFromConfig(cfg), func(u *manager.Uploader) {
		u.PartSize = 10 * 1024 * 1024 // 10 MB parts
		u.Concurrency = 5             // 5 parallel part uploads
	})

	return &Uploader{mgr: mgr, bucket: bucket}, nil
}

// Upload uploads a local file to S3 at the given key.
// onProgress is called with the upload percentage (0–100) as parts complete.
func (u *Uploader) Upload(ctx context.Context, filePath, key string, onProgress ProgressFunc) error {
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("opening file %q: %w", filePath, err)
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return fmt.Errorf("stat %q: %w", filePath, err)
	}
	totalBytes := fi.Size()

	pr := &progressReader{r: f, total: totalBytes, onProgress: onProgress}

	_, err = u.mgr.Upload(ctx, &s3.PutObjectInput{
		Bucket: aws.String(u.bucket),
		Key:    aws.String(key),
		Body:   pr,
	})
	if err != nil {
		return fmt.Errorf("uploading %q to S3: %w", key, err)
	}

	return nil
}

// progressReader wraps an io.Reader and reports upload progress.
type progressReader struct {
	r          io.Reader
	total      int64
	uploaded   atomic.Int64
	lastPct    int
	onProgress ProgressFunc
}

func (p *progressReader) Read(b []byte) (int, error) {
	n, err := p.r.Read(b)
	if n > 0 && p.total > 0 {
		now := p.uploaded.Add(int64(n))
		pct := int(float64(now) / float64(p.total) * 100)
		if pct > p.lastPct {
			p.lastPct = pct
			log.Printf("S3 upload: %d%%", pct)
			if p.onProgress != nil {
				p.onProgress(pct)
			}
		}
	}
	return n, err
}
