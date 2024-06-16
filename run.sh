#!/bin/sh

docker rm -f poker

docker run -d --name poker --restart unless-stopped -p 80:8000 \
    -v "$PWD"/poker:/app denoland/deno:latest run --allow-read --allow-net /app/main.ts
