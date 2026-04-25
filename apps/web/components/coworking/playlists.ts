// Canned playlists for the coworking jukebox. Each entry points at
// an MP3 file the deploy serves from `public/audio/coworking/`. The
// MP3s aren't shipped in the repo (royalty-free sourcing is a
// follow-up task — the user will drop CC0 / Pixabay tracks at the
// declared paths). The UI works without the files; clicking a
// station that has no asset just sets the shared state and the
// audio element silently fails to load.

export type PlaylistId = 'lofi' | 'cafe' | 'rain' | 'ambient-piano';

export type PlaylistDescriptor = {
  readonly id: PlaylistId;
  readonly label: string;
  readonly description: string;
  readonly src: string;
  readonly loop: boolean;
};

export const PLAYLISTS: readonly PlaylistDescriptor[] = [
  {
    id: 'lofi',
    label: 'lo-fi',
    description: 'crackling beats for hands-on-keyboard hours',
    src: '/audio/coworking/lofi.mp3',
    loop: true,
  },
  {
    id: 'cafe',
    label: 'café',
    description: 'low murmur and clinking spoons — body-double in a parisian rain',
    src: '/audio/coworking/cafe.mp3',
    loop: true,
  },
  {
    id: 'rain',
    label: 'rain',
    description: 'steady drizzle over canvas — for shutting the world out',
    src: '/audio/coworking/rain.mp3',
    loop: true,
  },
  {
    id: 'ambient-piano',
    label: 'ambient piano',
    description: 'soft Satie-ish keys for thinking-work',
    src: '/audio/coworking/ambient-piano.mp3',
    loop: true,
  },
];

export function findPlaylist(id: string): PlaylistDescriptor | undefined {
  return PLAYLISTS.find((p) => p.id === id);
}
