# ---- Build stage ----
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc g++ musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o torrent-worker .

# ---- Run stage ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates libc6-compat

WORKDIR /app
COPY --from=builder /app/torrent-worker .

CMD ["./torrent-worker"]
