package reporter

import (
	"context"
	"encoding/json"
	"log"
	"time"

	kafka "github.com/segmentio/kafka-go"
)

const topic = "job-progress"

// ProgressMessage is the payload published to Kafka.
type ProgressMessage struct {
	JobID    string `json:"jobId"`
	UserID   string `json:"userId"`
	Stage    string `json:"stage"`
	Progress int    `json:"progress"`
	Status   string `json:"status"`
	Ts       string `json:"ts"`
}

// Reporter sends progress events to a Kafka topic.
type Reporter struct {
	writer *kafka.Writer
	jobID  string
	userID string
}

// New creates a new Reporter.
func New(broker, jobID, userID string) *Reporter {
	w := &kafka.Writer{
		Addr:     kafka.TCP(broker),
		Topic:    topic,
		Balancer: &kafka.LeastBytes{},
	}
	return &Reporter{writer: w, jobID: jobID, userID: userID}
}

// Publish sends a progress update to Kafka.
func (r *Reporter) Publish(ctx context.Context, stage string, progress int, status string) {
	msg := ProgressMessage{
		JobID:    r.jobID,
		UserID:   r.userID,
		Stage:    stage,
		Progress: progress,
		Status:   status,
		Ts:       time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("reporter: marshal error: %v", err)
		return
	}

	if err := r.writer.WriteMessages(ctx, kafka.Message{Value: data}); err != nil {
		log.Printf("reporter: kafka write error: %v", err)
	}
}

// Close closes the underlying Kafka writer.
func (r *Reporter) Close() {
	if err := r.writer.Close(); err != nil {
		log.Printf("reporter: close error: %v", err)
	}
}
