# Ambient music

| File                                  | Purpose                                                        |
|---------------------------------------|----------------------------------------------------------------|
| `woven-paths-at-nightfall.mp3`        | Plays on loop everywhere the user is post-auth (mounted by `apps/web/components/audio/AmbientMusic.tsx` in the root layout). |

The file is committed to the repo (3.5 MB) so prod and preview deploys serve it directly without an external host. If the playlist grows beyond a couple of tracks, move to a CDN or storage bucket to keep the bundle lean.

Source / attribution: user-supplied; replace this line with the licence + credit when known.
