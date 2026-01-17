# 🪼 Jelly-Clipper 🎬

Jelly-Clipper is an open-source web application that allows Jellyfin users to easily create, share, and manage video clips from their Jellyfin media library

> [!IMPORTANT]
> This is my first open source project, and it was very much a hacky "lets try to make it work somehow" thing.
> So absolutely feel free to contribute and fix all the stuff I did wrong :D

## 🌟 Features

- **Simple Clip Creation**: Paste a URL and create clips with ease
- **Seamless Jellyfin Integration**: Works directly with your self-hosted Jellyfin server
- **User Authentication**: Clips are only accessible for other users of the Jellyfin instance
- **Easy Sharing**: Generate shareable links for your favorite moments
- **User-Friendly(-ish) Interface**: Intuitive design inspired by YouTube and Twitch clip functionality

## 📸 Screenshots

<p float="left">
  
  <img src="https://github.com/user-attachments/assets/497fee97-571d-4181-a2a6-64092bba9174" width="320" />
  <img src="https://github.com/user-attachments/assets/8aa52143-732d-417e-bcea-f99c11a8b447" width="320" /> 
  <img src="https://github.com/user-attachments/assets/21ff1121-516c-43ee-a14e-26039d05e2de" width="320" />
</p>

## ❓ How does this work?

This tool takes a very simple approach:

1. Jelly-Clipper checks if it can find the original file from jellyfin locally at the same path

- If it can **and** if it is mp4 - h264, no download will happen
- If not Jelly-Clipper downloads the original file (transcoded) from jellyfin

2. The user can create their clip
3. The clip will be saved indefinitely in their profile and is accessible for other members of the jellyfin instance
4. The downloaded original files get cleaned up regularly, if they're older than 2 days, to save storage

## 🚀 Deployment

### Docker Installation

Jelly-Clipper is easily hostable with docker compose:

```yaml
services:
  jelly-clipper:
    image: ghcr.io/arnolicious/jelly-clipper:latest
    container_name: jelly-clipper
    ports:
      - 3000:3000
    volumes:
      # Path to the db directory, in which the sqlite db file will live
      - <MY_DB_PATH>:/app/db

      # Path to the videos directory.
      # This will store all the clips permanently and the original files temporarily,
      # so it might get a lil big
      - <MY_VIDEOS_PATH>:/app/assets/videos

      # If jelly-clipper runs on the same server as jellyfin
      # you can mount the jellyfin media folder into jelly-clipper in the same exact same way it is mounted in jellyfin
      # This allows jelly-clipper to directly access the media, instead of needing to download it
      # - /my-media:/media <-- The mounted path must match exactly with the path in jellyfin
    restart: unless-stopped
    environment:
      # Timezone to have the cleanup cron job working as expected
      - TZ=Europe/Berlin
      # Full URL with Protocol and Port, where the application will live
      - JELLY_CLIPPER_ORIGIN=http://localhost:3000
      # with a reverse proxy it could be something like:
      # - JELLY_CLIPPER_ORIGIN=https://clip.jellyfin.mydomain.test
```

## 💻 Technologies

- SvelteKits
- Svelte 5
- TypeScript
- Bun
- Drizzle ORM
- Effect-TS

## 🤝 Development

### Prerequisites

- Node.js v20
- Bun
- Jellyfin server for local development

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/arnolicious/jelly-clipper.git
   cd jelly-clipper
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run the development server:
   ```bash
   bun dev
   ```

### Contributing

Contributions are welcome! Please check out our [Contribution Guidelines](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Todo

- [x] Basic Prototype
- [x] Implement sound (lol)
- [x] Download Progress Indicator
- [x] Clipping UI
- [ ] Create browser extension
- [ ] Improve mobile responsiveness

## ⭐ Star History

<a href="https://www.star-history.com/#arnolicious/jelly-clipper&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=arnolicious/jelly-clipper&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=arnolicious/jelly-clipper&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=arnolicious/jelly-clipper&type=Date" />
 </picture>
</a>

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

## [@arnolicious.bsky.social](https://arnolicious.bsky.social)

**Disclaimer**: This project is not officially affiliated with Jellyfin. It is a community-driven project created to enhance the Jellyfin experience.
