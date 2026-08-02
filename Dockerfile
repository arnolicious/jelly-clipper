FROM node:25.2-alpine AS base

WORKDIR /app

RUN npm install -g pnpm@latest-10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS build

RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir db && touch db/jelly-clipper.db

RUN pnpm run build

FROM base AS production-dependencies

RUN pnpm install --frozen-lockfile --prod

FROM node:25.2-alpine AS runtime

# libass requires Fontconfig and installed fonts to burn subtitles into clips.
RUN apk add --no-cache ffmpeg fontconfig font-dejavu && fc-cache -f

WORKDIR /app

ENV DATABASE_URL=db/jelly-clipper.db
ENV NODE_ENV=production

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prod-entry.ts ./prod-entry.ts
COPY --from=build /app/src ./src

RUN mkdir db && touch db/jelly-clipper.db

EXPOSE 3000

CMD ["node", "prod-entry.ts"]
