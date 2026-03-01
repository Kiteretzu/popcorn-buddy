# Torrent Handler (Go)

A Go worker that runs as an ECS Fargate task. It downloads a movie via BitTorrent (magnet link), uploads the video file to S3, and reports download progress to Kafka so the client can show live progress (e.g. "Downloading 65%").

## Flow

1. Backend creates a `DownloadJob` and starts this task with env vars (job id, magnet URL, user id, etc.).
2. Worker adds the magnet with [anacrolix/torrent](https://github.com/anacrolix/torrent), downloads to a temp dir.
3. Every 2 seconds it publishes `{ jobId, userId, stage: "download", progress }` to the Kafka topic `job-progress`.
4. When the torrent is complete, it uploads the largest file (the video) to S3 at `torrents/{DOWNLOAD_JOB_ID}/{filename}`.
5. S3 triggers an event → SQS → transcoder ECS task runs. The transcoder updates the same job and user library when HLS is ready.

## Requirements

- **Go 1.24+** (see `go.mod`)

## Build

```bash
cd apps/worker-torrentHandler
go build -o torrent-worker .
```

## Run locally (for testing)

**Where to put `.env`:** In the worker directory, i.e. `apps/worker-torrentHandler/.env`. The binary loads it from the **current working directory** when you run it (via `godotenv`). If the file is missing, it’s ignored (ECS uses task env instead).

1. Copy the example and edit with your values:

   ```bash
   cd apps/worker-torrentHandler
   cp .env.example .env
   # Edit .env: set DOWNLOAD_JOB_ID, USER_ID, MAGNET_URL, MOVIE_SLUG, AWS_*, KAFKA_BROKER
   ```

2. Run from the same directory so `.env` is found:

   ```bash
   go build -o torrent-worker .
   ./torrent-worker
   ```

   Or without building: `go run .` (also from `apps/worker-torrentHandler`).

**Note:** Ensure Kafka is reachable at `KAFKA_BROKER` (e.g. local Kafka or a tunnel to MSK). If Kafka is down, progress publishing will log errors but the download and S3 upload will still run.

## Required environment variables

| Variable | Description |
|----------|-------------|
| `DOWNLOAD_JOB_ID` | UUID of the download job (used in S3 key and Kafka messages). |
| `USER_ID` | User who requested the movie (for Kafka fan-out to the right client). |
| `MAGNET_URL` | Magnet link for the torrent. |
| `MOVIE_SLUG` | Slug for the movie (e.g. `interstellar-2014`). |
| `AWS_S3_BUCKET_NAME` | S3 bucket for raw video uploads (e.g. raw/temp bucket). |
| `AWS_REGION` | AWS region. |
| `AWS_ACCESS_KEY_ID` | AWS credentials. |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials. |
| `KAFKA_BROKER` | Kafka broker address (e.g. `localhost:9092`). |

## Where the .env values come from

When you run the worker **locally** for testing, you fill `.env` yourself. In **production**, the backend and ECS pass these into the task. Here’s where each value originates:

| Variable | Source |
|----------|--------|
| **DOWNLOAD_JOB_ID** | Created by the **backend** when the user adds a movie to their library (`POST /api/library`). Stored in the `download_jobs` table; the backend passes it in the ECS task’s container overrides. For local runs, use any UUID or copy one from your DB after creating a library item. |
| **USER_ID** | The logged-in user’s id from the **backend** (from the JWT / `users` table). Passed by the backend when starting the ECS task. For local testing, use any user UUID from your `users` table. |
| **MAGNET_URL** | Resolved by the **backend** from the global library: either from `global_movies.magnet_link` (cached) or by scraping the YTS movie page. The backend passes it when starting this task. Locally, use a real magnet link (e.g. from a YTS movie page or any torrent site). |
| **MOVIE_SLUG** | Derived by the **backend** from the movie title/year (e.g. `interstellar-2014`) when creating the library item. Used for logging and by the transcoder for the HLS path. For local runs, any slug string is fine. |
| **AWS_S3_BUCKET_NAME** | Your **AWS** raw/temp videos bucket (same as `AWS_S3_RAW_VIDEOS_FOLDER` in the backend). Create the bucket in S3; use that name. |
| **AWS_REGION** | Your **AWS** region (e.g. `ap-south-1`). Same as in the backend. |
| **AWS_ACCESS_KEY_ID** / **AWS_SECRET_ACCESS_KEY** | **AWS IAM** credentials with permission to write to the raw-videos S3 bucket. Create a user/role in IAM, or use the same credentials as the backend. For ECS, the task role is usually used instead of long-lived keys. |
| **KAFKA_BROKER** | Your **Kafka** bootstrap server: local Kafka (`localhost:9092`), AWS MSK (e.g. `b-1.xxx.kafka.ap-south-1.amazonaws.com:9092`), or another managed Kafka. Must be reachable from where the worker runs. |

## Docker

Multi-stage build: compile on `golang:1.24-alpine`, run on `alpine:3.20`.

```bash
docker build -t torrent-handler .
docker run --env-file .env torrent-handler
```

The image is typically pushed to ECR and used as the container image for the ECS task definition `torrent-handler`.

## Project layout

```
apps/worker-torrentHandler/
├── main.go           # Entry: reads env, runs download → upload → Kafka final event
├── go.mod
├── go.sum
├── .env.example      # Template for local .env (copy to .env, do not commit .env)
├── downloader/
│   └── torrent.go    # anacrolix/torrent client, progress loop, largest-file selection
├── uploader/
│   └── s3.go         # AWS SDK v2 S3 PutObject
├── reporter/
│   └── kafka.go      # segmentio/kafka-go producer → job-progress topic
├── Dockerfile
└── README.md
```
