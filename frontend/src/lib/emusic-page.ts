import {
  createEmusicPlaylist,
  deleteEmusicPlaylist,
  getEmusicDocument,
  getEmusicLibrary,
  getEmusicPlaylists,
  saveEmusicDocument,
  updateEmusicPlaylist,
  type EmusicLibraryTrack,
  type EmusicPlaylist,
} from "./emusic-api";
import { allEmusicTracks, EMUSIC_SECTIONS, type EmusicTrack } from "./emusic";
import {
  emptyEmusicDocument,
  flattenEmusicWords,
  formatTimeSec,
  isWordActive,
  lyricsFromPlainText,
  lyricsHasWords,
  markWordAtTime,
  nextPlaylistIndex,
  normalizeEmusicDocument,
  playlistQueue,
  tracksNotInPlaylist,
  updateWordAtRef,
  type EmusicDocument,
  type EmusicWordRef,
} from "./eomusic";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";

export type EmusicPageOpts = { admin: boolean };

function el<T extends Element>(root: ParentNode, selector: string): T {
  return root.querySelector(selector) as T;
}

function fail(data: { message?: string; request_id?: string; debug?: string }, fallback: string): void {
  showErrorModal({ message: data.message || fallback, requestId: data.request_id, debug: data.debug });
}

function catalogFallback(): EmusicTrack[] {
  return allEmusicTracks();
}

/** One playlist per public/emusic folder — used if API is unreachable. */
function sectionPlaylistsFallback(): EmusicPlaylist[] {
  return EMUSIC_SECTIONS.map((section) => ({
    id: `section-${section.id}`,
    name: section.title,
    track_ids: section.tracks.map((track) => track.id),
    system: true,
  }));
}

function toPlayable(track: EmusicLibraryTrack, sectionTitle: string, sectionId: string): EmusicTrack {
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    fileName: track.file_name,
    src: track.src,
    sectionId,
    sectionTitle,
  };
}

export function startEmusicPage(root: HTMLElement, opts: EmusicPageOpts): void {
  const admin = opts.admin;
  const status = el<HTMLElement>(root, "[data-emusic-status]");
  const tracksBox = el<HTMLElement>(root, "[data-emusic-tracks]");
  const titleEl = el<HTMLElement>(root, "[data-emusic-title]");
  const sectionEl = el<HTMLElement>(root, "[data-emusic-section]");
  const audio = el<HTMLAudioElement>(root, "[data-emusic-audio]");
  const lyrics = el<HTMLElement>(root, "[data-emusic-lyrics]");
  const playlistSelect = el<HTMLSelectElement>(root, "[data-emusic-playlist]");
  const playlistAdmin = el<HTMLElement>(root, "[data-emusic-playlist-admin]");
  const playlistNew = el<HTMLFormElement>(root, "[data-emusic-playlist-new]");
  const playlistName = el<HTMLInputElement>(root, "[data-emusic-playlist-name]");
  const addTrackSelect = el<HTMLSelectElement>(root, "[data-emusic-add-track]");
  const addTrackBtn = el<HTMLButtonElement>(root, "[data-emusic-add-track-btn]");
  const lyricsTools = el<HTMLElement>(root, "[data-emusic-lyrics-tools]");
  const lyricsPaste = el<HTMLTextAreaElement>(root, "[data-emusic-lyrics-paste]");
  const wordEdit = el<HTMLElement>(root, "[data-emusic-word-edit]");
  const wordText = el<HTMLInputElement>(root, "[data-emusic-word-text]");
  const wordStart = el<HTMLInputElement>(root, "[data-emusic-word-start]");
  const wordEnd = el<HTMLInputElement>(root, "[data-emusic-word-end]");
  const toggleBtn = el<HTMLButtonElement>(root, "[data-emusic-toggle]");
  const loopBtn = el<HTMLButtonElement>(root, "[data-emusic-loop]");

  let library: EmusicTrack[] = catalogFallback();
  let tracks: EmusicTrack[] = [...library];
  let playlists: EmusicPlaylist[] = [];
  let activePlaylistId = "";
  let included = new Set<string>(library.map((t) => t.id));
  let selected: EmusicTrack | null = null;
  let eDoc: EmusicDocument | null = null;
  let wordRef: EmusicWordRef | null = null;
  let lyricsDirty = false;
  let loopList = true;
  let hasLyrics = new Map<string, boolean>();

  const queueTracks = () => playlistQueue(tracks, included);
  const queueIndex = () => {
    const queue = queueTracks();
    return selected ? queue.findIndex((track) => track.id === selected?.id) : -1;
  };
  const activePlaylist = () => playlists.find((item) => item.id === activePlaylistId) || null;
  const playlistEditable = () => {
    const playlist = activePlaylist();
    return !!admin && !!playlist && !playlist.system;
  };

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const fillWordFields = () => {
    if (!eDoc || !wordRef || !admin) {
      wordEdit.hidden = true;
      return;
    }
    const word = eDoc.unidades?.[wordRef.unit]?.l[wordRef.line]?.p[wordRef.word];
    if (!word) {
      wordEdit.hidden = true;
      return;
    }
    wordEdit.hidden = false;
    wordText.value = word.t;
    wordStart.value = formatTimeSec(word.i);
    wordEnd.value = formatTimeSec(word.f);
  };

  const paintActiveWords = () => {
    const time = audio.currentTime;
    lyrics.querySelectorAll<HTMLButtonElement>(".emusic__word").forEach((button) => {
      const on = isWordActive({ t: "", i: Number(button.dataset.i), f: Number(button.dataset.f) }, time);
      button.classList.toggle("emusic__word--active", on);
    });
    lyrics.querySelector(".emusic__word--active")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const renderLyrics = () => {
    lyrics.replaceChildren();
    if (!eDoc) {
      lyrics.textContent = selected ? "No lyrics yet." : "Select a track to follow the lyrics.";
      return;
    }
    const normalized = normalizeEmusicDocument(eDoc);
    if (!lyricsHasWords(normalized)) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = admin
        ? "Paste lyrics below and mark timings while the song plays."
        : "This track does not have lyrics yet.";
      lyrics.append(empty);
      return;
    }
    (normalized.unidades || []).forEach((unit, unitIndex) => {
      const block = document.createElement("div");
      block.className = "emusic__lyrics-block";
      const kind = document.createElement("p");
      kind.className = "emusic__lyrics-kind";
      kind.textContent = unit.t;
      block.append(kind);
      unit.l.forEach((line, lineIndex) => {
        const row = document.createElement("p");
        row.className = "emusic__lyrics-line";
        line.p.forEach((word, wordIndex) => {
          const span = document.createElement("button");
          span.type = "button";
          span.className = "emusic__word";
          span.dataset.i = String(word.i);
          span.dataset.f = String(word.f);
          if (wordRef && wordRef.unit === unitIndex && wordRef.line === lineIndex && wordRef.word === wordIndex) {
            span.classList.add("emusic__word--selected");
          }
          span.textContent = word.t;
          span.title = admin ? `${word.t} · ${formatTimeSec(word.i)}–${formatTimeSec(word.f)}s` : word.t;
          span.addEventListener("click", () => {
            audio.currentTime = word.i;
            if (admin) {
              wordRef = { unit: unitIndex, line: lineIndex, word: wordIndex };
              fillWordFields();
              renderLyrics();
            }
            void audio.play();
          });
          row.append(span, document.createTextNode(" "));
        });
        block.append(row);
      });
      lyrics.append(block);
    });
    paintActiveWords();
  };

  const renderTracks = () => {
    tracksBox.replaceChildren();
    for (const track of tracks) {
      const li = document.createElement("li");
      li.className = "emusic__queue-item";
      if (selected?.id === track.id) li.classList.add("emusic__queue-item--active");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = included.has(track.id);
      check.setAttribute("aria-label", `Include ${track.title}`);
      check.addEventListener("change", () => {
        if (check.checked) included.add(track.id);
        else included.delete(track.id);
        setStatus(`${queueTracks().length} in queue`);
      });

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "emusic__queue-play";
      btn.textContent = track.title;
      btn.addEventListener("click", () => void select(track));

      const meta = document.createElement("span");
      meta.className = "emusic__queue-meta";
      meta.textContent = track.sectionTitle;

      const lyricDot = document.createElement("span");
      lyricDot.className = "emusic__lyric-dot";
      lyricDot.title = hasLyrics.get(track.id) ? "Has lyrics" : "No lyrics";
      lyricDot.classList.toggle("emusic__lyric-dot--on", !!hasLyrics.get(track.id));

      if (playlistEditable()) {
        const up = document.createElement("button");
        up.type = "button";
        up.className = "icon-btn";
        up.title = "Move up";
        up.setAttribute("aria-label", "Move up");
        up.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_upward</span>';
        up.addEventListener("click", () => {
          const idx = tracks.findIndex((t) => t.id === track.id);
          if (idx <= 0) return;
          const next = [...tracks];
          const [item] = next.splice(idx, 1);
          next.splice(idx - 1, 0, item);
          tracks = next;
          renderTracks();
        });
        const down = document.createElement("button");
        down.type = "button";
        down.className = "icon-btn";
        down.title = "Move down";
        down.setAttribute("aria-label", "Move down");
        down.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">arrow_downward</span>';
        down.addEventListener("click", () => {
          const idx = tracks.findIndex((t) => t.id === track.id);
          if (idx < 0 || idx >= tracks.length - 1) return;
          const next = [...tracks];
          const [item] = next.splice(idx, 1);
          next.splice(idx + 1, 0, item);
          tracks = next;
          renderTracks();
        });
        li.append(check, btn, meta, lyricDot, up, down);
      } else {
        li.append(check, btn, meta, lyricDot);
      }
      tracksBox.append(li);
    }
  };

  const renderPlaylistSelect = () => {
    const current = playlistSelect.value;
    playlistSelect.replaceChildren();
    const libraryOpt = document.createElement("option");
    libraryOpt.value = "";
    libraryOpt.textContent = "Library";
    playlistSelect.append(libraryOpt);
    for (const playlist of playlists) {
      const opt = document.createElement("option");
      opt.value = playlist.id;
      opt.textContent = playlist.name;
      playlistSelect.append(opt);
    }
    playlistSelect.value = current;
  };

  const renderAddTrackSelect = () => {
    addTrackSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Add track…";
    addTrackSelect.append(placeholder);
    const available = tracksNotInPlaylist(library, tracks.map((t) => t.id));
    for (const track of available) {
      const opt = document.createElement("option");
      opt.value = track.id;
      opt.textContent = `${track.sectionTitle} · ${track.title}`;
      addTrackSelect.append(opt);
    }
  };

  const syncPlaylistAdminFields = () => {
    const editable = playlistEditable();
    const playlist = activePlaylist();
    playlistName.readOnly = !editable;
    playlistName.disabled = !editable;
    addTrackSelect.disabled = !editable;
    addTrackBtn.disabled = !editable;
    const saveBtn = el<HTMLButtonElement>(root, "[data-emusic-playlist-save]");
    const deleteBtn = el<HTMLButtonElement>(root, "[data-emusic-playlist-delete]");
    saveBtn.disabled = !editable;
    deleteBtn.disabled = !editable;
    if (playlist?.system) {
      playlistName.value = playlist.name;
      playlistName.title = "Catalog folder playlist (read-only)";
    } else {
      playlistName.title = "";
    }
  };

  const applyPlaylistView = () => {
    if (!activePlaylistId) {
      tracks = [...library];
      included = new Set(tracks.map((t) => t.id));
      playlistName.value = "";
    } else {
      const playlist = activePlaylist();
      if (!playlist) {
        activePlaylistId = "";
        tracks = [...library];
        included = new Set(tracks.map((t) => t.id));
      } else {
        const byId = new Map(library.map((t) => [t.id, t]));
        tracks = playlist.track_ids.map((id) => byId.get(id)).filter((t): t is EmusicTrack => !!t);
        included = new Set(tracks.map((t) => t.id));
        playlistName.value = playlist.name;
      }
    }
    syncPlaylistAdminFields();
    renderAddTrackSelect();
    renderTracks();
    setStatus(`${queueTracks().length} in queue`);
  };

  const select = async (track: EmusicTrack) => {
    selected = track;
    titleEl.textContent = track.title;
    sectionEl.textContent = track.sectionTitle;
    audio.src = track.src;
    wordRef = null;
    lyricsDirty = false;
    eDoc = null;
    renderTracks();
    const res = await getEmusicDocument(track.slug);
    if (res.status === 200 && res.data && (res.data as EmusicDocument).type === "emusic") {
      eDoc = normalizeEmusicDocument(res.data as EmusicDocument);
      hasLyrics.set(track.id, lyricsHasWords(eDoc));
    } else if (res.status === 404 && admin) {
      eDoc = emptyEmusicDocument(track.title);
      hasLyrics.set(track.id, false);
    } else if (res.status !== 404) {
      fail(res.data, "Could not load lyrics.");
      eDoc = null;
    }
    renderLyrics();
    fillWordFields();
    void audio.play().catch(() => undefined);
    const icon = toggleBtn.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = "pause";
    toggleBtn.title = "Pause";
    toggleBtn.setAttribute("aria-label", "Pause");
    if (mustLog) console.log("[emusic] select", { id: track.id, slug: track.slug });
  };

  const load = async () => {
    setStatus("Loading…");
    const [libRes, plRes] = await Promise.all([getEmusicLibrary(), getEmusicPlaylists()]);
    if (libRes.status === 200 && Array.isArray(libRes.data.sections)) {
      const next: EmusicTrack[] = [];
      hasLyrics = new Map();
      for (const section of libRes.data.sections) {
        for (const track of section.tracks || []) {
          next.push(toPlayable(track, section.title, section.id));
          hasLyrics.set(track.id, !!track.has_lyrics);
        }
      }
      if (next.length) library = next;
    } else if (libRes.status >= 400) {
      fail(libRes.data, "Could not load library.");
    }
    if (plRes.status === 200 && Array.isArray(plRes.data.playlists)) {
      playlists = plRes.data.playlists;
      if (!playlists.some((item) => item.system)) {
        playlists = [...sectionPlaylistsFallback(), ...playlists];
      }
    } else {
      playlists = sectionPlaylistsFallback();
      if (plRes.status >= 400) {
        fail(plRes.data, "Could not load playlists.");
      }
    }
    renderPlaylistSelect();
    applyPlaylistView();
    playlistAdmin.hidden = !admin;
    lyricsTools.hidden = !admin;
  };

  playlistSelect.addEventListener("change", () => {
    activePlaylistId = playlistSelect.value;
    applyPlaylistView();
  });

  el<HTMLButtonElement>(root, "[data-emusic-all]").addEventListener("click", () => {
    included = new Set(tracks.map((t) => t.id));
    renderTracks();
    setStatus(`${queueTracks().length} in queue`);
  });
  el<HTMLButtonElement>(root, "[data-emusic-none]").addEventListener("click", () => {
    included = new Set();
    renderTracks();
    setStatus("0 in queue");
  });

  playlistNew.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!admin) return;
    const name = new FormData(playlistNew).get("name");
    const res = await createEmusicPlaylist(String(name || "").trim(), [...included]);
    if (res.status !== 201) {
      fail(res.data, "Could not create playlist.");
      return;
    }
    playlistNew.reset();
    await load();
    if (res.data.id) {
      playlistSelect.value = res.data.id;
      activePlaylistId = res.data.id;
      applyPlaylistView();
    }
  });

  addTrackBtn.addEventListener("click", () => {
    if (!playlistEditable()) return;
    const id = addTrackSelect.value;
    const track = library.find((t) => t.id === id);
    if (!track) return;
    tracks = [...tracks, track];
    included.add(track.id);
    renderAddTrackSelect();
    renderTracks();
  });

  el<HTMLButtonElement>(root, "[data-emusic-playlist-save]").addEventListener("click", async () => {
    if (!playlistEditable() || !activePlaylistId) return;
    const res = await updateEmusicPlaylist(activePlaylistId, {
      name: playlistName.value.trim(),
      track_ids: tracks.map((t) => t.id),
    });
    if (res.status !== 200) {
      fail(res.data, "Could not save playlist.");
      return;
    }
    await load();
    playlistSelect.value = activePlaylistId;
    applyPlaylistView();
    setStatus("Playlist saved.");
  });

  el<HTMLButtonElement>(root, "[data-emusic-playlist-delete]").addEventListener("click", async () => {
    if (!playlistEditable() || !activePlaylistId) return;
    const res = await deleteEmusicPlaylist(activePlaylistId);
    if (res.status !== 200) {
      fail(res.data, "Could not delete playlist.");
      return;
    }
    activePlaylistId = "";
    await load();
  });

  el<HTMLButtonElement>(root, "[data-emusic-lyrics-apply]").addEventListener("click", () => {
    if (!admin || !selected) return;
    eDoc = lyricsFromPlainText(lyricsPaste.value, selected.title);
    lyricsDirty = true;
    wordRef = flattenEmusicWords(eDoc)[0] ? { unit: 0, line: 0, word: 0 } : null;
    renderLyrics();
    fillWordFields();
  });

  const markNow = () => {
    if (!admin || !eDoc || !wordRef) return;
    const marked = markWordAtTime(eDoc, wordRef, audio.currentTime);
    eDoc = marked.doc;
    wordRef = marked.next;
    lyricsDirty = true;
    renderLyrics();
    fillWordFields();
  };
  el<HTMLButtonElement>(root, "[data-emusic-lyrics-mark]").addEventListener("click", markNow);

  el<HTMLButtonElement>(root, "[data-emusic-lyrics-save]").addEventListener("click", async () => {
    if (!admin || !selected || !eDoc) return;
    const doc = normalizeEmusicDocument(eDoc);
    const res = await saveEmusicDocument(selected.slug, doc);
    if (res.status !== 200) {
      fail(res.data, "Could not save lyrics.");
      return;
    }
    eDoc = normalizeEmusicDocument(res.data.document || doc);
    lyricsDirty = false;
    hasLyrics.set(selected.id, lyricsHasWords(eDoc));
    renderTracks();
    renderLyrics();
    setStatus("Lyrics saved.");
  });

  const importInput = el<HTMLInputElement>(root, "[data-emusic-lyrics-import]");
  const importStatus = el<HTMLElement>(root, "[data-emusic-import-status]");
  const dropzone = el<HTMLElement>(root, "[data-emusic-dropzone]");
  const browseBtn = el<HTMLButtonElement>(root, "[data-emusic-lyrics-browse]");

  const setImportStatus = (text: string, ok = true) => {
    importStatus.hidden = false;
    importStatus.textContent = text;
    importStatus.className = ok ? "status emusic__import-status" : "status emusic__import-status hint";
  };

  const loadEmusicFile = async (file: File) => {
    if (!admin) return;
    if (!selected) {
      fail({ message: "Select a track before loading lyrics." }, "Select a track before loading lyrics.");
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".emusic") && !name.endsWith(".json")) {
      setImportStatus("Use a .emusic (or .json) file.", false);
      fail({ message: "Expected a .emusic file." }, "Expected a .emusic file.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as EmusicDocument;
      if (!parsed || parsed.type !== "emusic") {
        setImportStatus("Invalid contract: missing type \"emusic\".", false);
        fail({ message: "Invalid .emusic document (type must be emusic)." }, "Invalid .emusic document.");
        return;
      }
      eDoc = normalizeEmusicDocument(parsed);
      lyricsDirty = true;
      wordRef = flattenEmusicWords(eDoc)[0] ? { unit: 0, line: 0, word: 0 } : null;
      const words = flattenEmusicWords(eDoc).length;
      renderLyrics();
      fillWordFields();
      setImportStatus(`Loaded ${file.name} · ${words} timed word${words === 1 ? "" : "s"}. Save to persist.`);
      setStatus(`Imported ${file.name}`);
    } catch {
      setImportStatus("Could not parse JSON .emusic file.", false);
      fail({ message: "Invalid .emusic file." }, "Invalid .emusic file.");
    }
  };

  browseBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    importInput.click();
  });
  dropzone.addEventListener("click", (event) => {
    if (event.target === browseBtn || browseBtn.contains(event.target as Node)) return;
    importInput.click();
  });
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      importInput.click();
    }
  });
  dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropzone.classList.add("emusic__dropzone--active");
  });
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("emusic__dropzone--active");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("emusic__dropzone--active");
  });
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("emusic__dropzone--active");
    const file = event.dataTransfer?.files?.[0];
    if (file) void loadEmusicFile(file);
  });
  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (file) void loadEmusicFile(file);
  });

  const applyWordEdit = () => {
    if (!admin || !eDoc || !wordRef) return;
    eDoc = updateWordAtRef(eDoc, wordRef, {
      t: wordText.value,
      i: Number(wordStart.value),
      f: Number(wordEnd.value),
    });
    lyricsDirty = true;
    renderLyrics();
  };
  wordText.addEventListener("change", applyWordEdit);
  wordStart.addEventListener("change", applyWordEdit);
  wordEnd.addEventListener("change", applyWordEdit);

  const playNext = (delta: number) => {
    const queue = queueTracks();
    if (!queue.length) return;
    let idx = queueIndex();
    if (idx < 0) idx = 0;
    else if (delta > 0) {
      const next = nextPlaylistIndex(idx, queue.length, loopList);
      if (next === null) return;
      idx = next;
    } else {
      idx = idx <= 0 ? (loopList ? queue.length - 1 : 0) : idx - 1;
    }
    void select(queue[idx]);
  };

  el<HTMLButtonElement>(root, "[data-emusic-prev]").addEventListener("click", () => playNext(-1));
  el<HTMLButtonElement>(root, "[data-emusic-next]").addEventListener("click", () => playNext(1));
  toggleBtn.addEventListener("click", () => {
    if (audio.paused) void audio.play();
    else audio.pause();
  });
  loopBtn.addEventListener("click", () => {
    loopList = !loopList;
    loopBtn.setAttribute("aria-pressed", loopList ? "true" : "false");
  });

  audio.addEventListener("timeupdate", paintActiveWords);
  audio.addEventListener("play", () => {
    const icon = toggleBtn.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = "pause";
  });
  audio.addEventListener("pause", () => {
    const icon = toggleBtn.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = "play_arrow";
  });
  audio.addEventListener("ended", () => playNext(1));

  window.addEventListener("keydown", (event) => {
    if (!admin || event.key.toLowerCase() !== "m") return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    event.preventDefault();
    markNow();
  });

  document.querySelector("[data-emusic-refresh]")?.addEventListener("click", () => {
    void load();
  });

  void load().then(() => {
    if (lyricsDirty) return;
    setStatus(`${queueTracks().length} tracks ready`);
  });
}
