package uploader

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Uploader handles S3 uploads.
type Uploader struct {
	client *s3.Client
	bucket string
}

// New creates a new S3 Uploader using explicit credentials from env vars.
func New(bucket, region, accessKey, secretKey string) (*Uploader, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("loading aws config: %w", err)
	}

	return &Uploader{
		client: s3.NewFromConfig(cfg),
		bucket: bucket,
	}, nil
}

// Upload uploads a local file to S3 at the given key.
func (u *Uploader) Upload(ctx context.Context, filePath, key string) error {
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("opening file %q: %w", filePath, err)
	}
	defer f.Close()

	_, err = u.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(u.bucket),
		Key:    aws.String(key),
		Body:   f,
	})
	if err != nil {
		return fmt.Errorf("putting object %q to S3: %w", key, err)
	}

	return nil
}
