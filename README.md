# jelly-clipper
Companion Webapp to Jellyfin which enables the creation and sharing of clips from Jellyfin content

## Idea
- Login with Jellyfin account
- Enter/get ID of movie/episode
- Show scrubbable video player with trimming tool
- Save with name
- Make clip accessible for other users of the jellyfin instance
## Stack
- Sveltekit
## Resources
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- https://github.com/kribblo/node-ffmpeg-installer

### Examples / References
- https://github.com/Fallenbagel/jellyseerr/blob/develop/server/api/jellyfin.ts
- https://github.com/Fallenbagel/jellyseerr/blob/develop/src/components/Login/JellyfinLogin.tsx#L55
- https://github.com/Fallenbagel/jellyseerr/blob/develop/server/routes/auth.ts#L278
