# 🪼 Jelly-Clipper 🎬

Jelly-Clipper is an open-source web application that allows Jellyfin users to easily create, share, and manage video clips directly from their media library (or at least it will be once all the major features are implemented :p )

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
  <img src="https://github.com/user-attachments/assets/aae606aa-6a76-4257-99b1-97e858a2c10c" width="320" />
  <img src="https://github.com/user-attachments/assets/b538d53f-a126-4658-93fb-046b0900543c" width="320" /> 
  <img src="https://github.com/user-attachments/assets/27de9a66-838a-4301-8f76-fee9140a6dee" width="320" />
</p>

## 🚀 Deployment

### Docker Installation

Jelly-Clipper is easily hostable with docker compose:

```yaml
services:
  jelly-clipper:
    image: arnolicious/jelly-clipper:latest
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
    restart: unless-stopped
    environment:
      # Full URL with Protocol and Port, where the application will live
      - JELLY_CLIPPER_ORIGIN=http://localhost:3000
      # with a reverse proxy it could be something like:
      # - JELLY_CLIPPER_ORIGIN=https://clip.jellyfin.mydomain.test
```

## 💻 Technologies

- SvelteKit
- Svelte 5
- TypeScript
- Bun
- Drizzle ORM

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

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

## [@arnolicious.bsky.social](https://arnolicious.bsky.social)

**Disclaimer**: This project is not officially affiliated with Jellyfin. It is a community-driven project created to enhance the Jellyfin experience.
