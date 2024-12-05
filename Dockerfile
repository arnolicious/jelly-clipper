# Build with:   docker build -t arnolicious/jelly-clipper .
# Run with:     docker run -v /mount/the/db:/app/db -v /path/to/downloaded/content:/app/static/videos -p 3000:3000 --rm --name IMAGE_NAME IMAGE_NAME

FROM oven/bun:1.1.38-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json package.json
RUN bun install

# Create db file
RUN mkdir db
RUN touch db/jelly-clipper.db

COPY . .
RUN bun run build

EXPOSE 3000

ENTRYPOINT ["bun", "./build"]