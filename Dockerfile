# Build with:   docker build -t arnolicious/jelly-clipper .
# Run with:     docker run -v /mount/the/db:/app/db -v /path/to/downloaded/content:/app/static/videos -p 3000:3000 --rm --name IMAGE_NAME IMAGE_NAME

FROM node:22-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json package.json
RUN npm install

# Create db file
RUN mkdir db
RUN touch db/jelly-clipper.db

ENV DATABASE_URL=db/jelly-clipper.db

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "express-node-server.js"]