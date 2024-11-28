# 🪼 Jelly-Clipper 🎬 

Jelly-Clipper is an open-source web application that allows Jellyfin users to easily create, share, and manage video clips directly from their media library (or at least it will be once all the major features are implemented :p )

## 🌟 Features

- **Simple Clip Creation**: Paste a URL and create clips with ease
- **Seamless Jellyfin Integration**: Works directly with your self-hosted Jellyfin server
- **User Authentication**: Secure access for your media clips
- **Easy Sharing**: Generate shareable links for your favorite moments
- **User-Friendly Interface**: Intuitive design inspired by YouTube and Twitch clip functionality

## 📸 Screenshots
<p float="left">
  <img src="https://github.com/user-attachments/assets/aae606aa-6a76-4257-99b1-97e858a2c10c" width="320" />
  <img src="https://github.com/user-attachments/assets/b538d53f-a126-4658-93fb-046b0900543c" width="320" /> 
  <img src="https://github.com/user-attachments/assets/27de9a66-838a-4301-8f76-fee9140a6dee" width="320" />
</p>


## 🚀 Deployment

### Docker Installation

Jelly-Clipper will be distributed as a self-hostable Docker image for easy deployment:

```bash
docker run -d \
  -p 3000:3000 \
  jelly-clipper/app
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
   bun run dev
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
- [ ] Implement sound (lol)
- [ ] Download Progress Indicator
- [ ] Clipping Segmented Inputs
- [ ] Clipping UI
- [ ] Create browser extension
- [ ] Improve mobile responsiveness

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Contact

[@arnolicious.bsky.social](https://arnolicious.bsky.social)
---

**Disclaimer**: This project is not officially affiliated with Jellyfin. It is a community-driven project created to enhance the Jellyfin experience.
