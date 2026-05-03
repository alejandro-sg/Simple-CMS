# ── Build stage ───────────────────────────────────────────────────────────────
FROM golang:1.25-bookworm AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o /simple-cms-api .

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -s /bin/false simplecms

RUN mkdir -p /var/lib/simplecms && chown simplecms:simplecms /var/lib/simplecms

WORKDIR /app
COPY --from=builder /simple-cms-api .

RUN chown simplecms:simplecms /app/simple-cms-api

USER simplecms

EXPOSE 8080
ENTRYPOINT ["/app/simple-cms-api"]
