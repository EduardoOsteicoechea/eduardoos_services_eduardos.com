import { apiSend, deleteJSON, postJSON, putJSON } from "./api";
import type { EmusicDocument } from "./eomusic";

export type EmusicLibraryTrack = {
  id: string;
  slug: string;
  title: string;
  file_name: string;
  src: string;
  has_lyrics: boolean;
};

export type EmusicLibrarySection = {
  id: string;
  title: string;
  tracks: EmusicLibraryTrack[];
};

export type EmusicPlaylist = {
  id: string;
  name: string;
  track_ids: string[];
  created_at?: string;
  updated_at?: string;
};

export function getEmusicLibrary() {
  return apiSend<{ sections?: EmusicLibrarySection[] }>("/emusic/library");
}

export function getEmusicPlaylists() {
  return apiSend<{ playlists?: EmusicPlaylist[] }>("/emusic/playlists");
}

export function createEmusicPlaylist(name: string, track_ids: string[]) {
  return postJSON<EmusicPlaylist>("/emusic/playlists", { name, track_ids });
}

export function updateEmusicPlaylist(id: string, body: { name?: string; track_ids?: string[] }) {
  return putJSON<EmusicPlaylist>(`/emusic/playlists/${encodeURIComponent(id)}`, body);
}

export function deleteEmusicPlaylist(id: string) {
  return deleteJSON(`/emusic/playlists/${encodeURIComponent(id)}`);
}

export function getEmusicDocument(slug: string) {
  return apiSend<EmusicDocument>(`/emusic/${encodeURIComponent(slug)}`);
}

export function saveEmusicDocument(slug: string, document: EmusicDocument) {
  return putJSON<{ slug: string; document: EmusicDocument }>(`/emusic/${encodeURIComponent(slug)}`, {
    document,
  });
}
