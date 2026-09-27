# Hyfata Media Player

**[한국어 버전](README.ko.md)**

A dependency-free HTML5 video player for anime and movies, with opening/ending
skip, a segmented progress bar, and a glassmorphism UI optimized separately
for desktop and mobile.

![Desktop](screenshots/desktop.png)

![Mobile bottom sheet](screenshots/mobile-sheet.png)

## Features

- **Opening/ending skip** — detects segments from embedded chapters
  (where supported) or a WebVTT chapters file, with a floating skip button
  and optional auto-skip
- **Segmented progress bar** — real breaks at opening/ending boundaries,
  with time + segment-name tooltip
- **Glassmorphism UI** — desktop control panel, mobile floating glass boxes,
  compact mode for small players
- **Mobile bottom-sheet settings** — playback speed, auto-skip, skip-button
  visibility, with drag-to-close and background dim
- **Touch gestures** — double-tap left/right to seek ±10 s, single tap to
  show/hide controls
- **Keyboard shortcuts** — play/pause, seek, volume, mute, fullscreen,
  0–90% jumps
- **i18n** — built-in English/Korean packs, switchable per player and
  extensible (`VideoPlayer.addLang`)
- **No dependencies** — single JS + CSS file, works with any bundler or a
  plain `<script>` tag

## Quick start

```html
<link rel="stylesheet" href="video-player.css" />
<div id="player"></div>
<script src="video-player.js"></script>
<script>
  new VideoPlayer('#player', {
    src: 'video.mp4',
    chaptersUrl: 'chapters.vtt'
  });
</script>
```

Open `index.html` for a live demo (English UI, Korean UI, and no-chapter cases).

## Options

| Option               | Type     | Default      | Description                                                      |
| -------------------- | -------- | ------------ | ---------------------------------------------------------------- |
| `src`                | string   | `null`       | Video URL                                                        |
| `poster`             | string   | `null`       | Poster image URL                                                 |
| `chaptersUrl`        | string   | `null`       | WebVTT chapters fallback (used when embedded chapters are absent)|
| `lang`               | string   | `'en'`       | Language pack code (`'en'`, `'ko'`, or a custom code)            |
| `labels`             | object   | `{}`         | Per-string overrides merged over the language pack               |
| `autoplay`           | boolean  | `false`      | Autoplay (starts muted, per browser policy)                      |
| `muted`              | boolean  | `false`      | Start muted                                                      |
| `loop`               | boolean  | `false`      | Loop playback                                                    |
| `preload`            | string   | `'auto'`         | Video preload mode (`'auto'` shows a frame before play and enables pre-play seek, like video.js) |
| `seekStep`           | number   | `10`         | Double-tap / button seek step (seconds)                          |
| `keyboardSeek`       | number   | `5`          | Arrow-key seek step (seconds)                                    |
| `hideDelay`          | number   | `2600`       | ms until the overlay auto-hides                                  |
| `skipButtonDuration` | number   | `4000`       | ms until the skip button auto-hides while playing                |

## Language packs

```js
// Built-in packs
new VideoPlayer('#player', { src: 'video.mp4', lang: 'ko' });

// Override single strings
new VideoPlayer('#player', {
  src: 'video.mp4',
  labels: { skipOpening: 'Skip intro' }
});

// Register your own language (missing keys fall back to English)
VideoPlayer.addLang('ja', {
  play: '再生',
  pause: '一時停止',
  skipOpening: 'オープニングをスキップ',
  skipEnding: 'エンディングをスキップ'
});
new VideoPlayer('#player', { src: 'video.mp4', lang: 'ja' });
```

Available label keys: `skipOpening`, `skipEnding`, `opening`, `ending`,
`play`, `pause`, `mute`, `unmute`, `fullscreen`, `exitFullscreen`,
`settings`, `playbackRate`, `autoSkip`, `showSkip`, `skipped`, `volume`,
`seekPosition`, `seekFlash` (`{sign}{sec}s`), `seekBack`, `seekForward`,
`loadError`. See `VideoPlayer.LANGS` in the source for the full lists.

### Contributing a language pack

PRs adding new language packs are welcome:

1. Copy the `en` pack from `VideoPlayer.LANGS` in `video-player.js` and
   translate every value into your language.
2. Keep the `{sec}`, `{sign}`, and `{detail}` placeholders intact —
   the player fills them in at runtime.
3. Test locally with `lang: '<your-code>'` on desktop and mobile
   (settings sheet, skip button, tooltips).
4. Send a PR adding your pack to `LANGS` (keep keys in the same order as
   `en`). One language per PR keeps review simple.

## Chapters

Chapter titles are classified automatically (case-insensitive, word match):

- opening: `opening`, `intro`, `op`
- ending: `ending`, `credits`, `ed`

WebVTT example:

```vtt
WEBVTT

00:00.000 --> 00:15.000
Opening

00:15.000 --> 01:20.000
Main story

01:40.000 --> 02:00.000
Ending Credits
```

Browsers that expose embedded chapter tracks use those; otherwise the VTT
file given via `chaptersUrl` is used (embedded wins if both exist).

## Controls

| Input              | Action                          |
| ------------------ | ------------------------------- |
| `Space` / `K`      | Play / pause                    |
| `←` / `→`          | Back / forward 5 s              |
| `J` / `L`          | Back / forward 10 s             |
| `↑` / `↓`          | Volume                          |
| `M`                | Mute                            |
| `F`                | Fullscreen                      |
| `0`–`9`            | Jump to 0%–90% of the video     |
| Mobile double-tap  | −10 s (left) / +10 s (right)    |
| Mobile single tap  | Show / hide controls            |

## API

```js
const player = new VideoPlayer('#player', { src: 'video.mp4' });

player.play();
player.pause();
player.togglePlay();
player.seekTo(75);      // seconds
player.seekBy(-10);     // relative seconds
player.toggleMute();
player.toggleFullscreen();
player.getChapters();   // [{ start, end, title, type }]
player.destroy();
```

Statics: `VideoPlayer.parseVTT(text)`, `VideoPlayer.classifyChapter(title)`,
`VideoPlayer.formatTime(sec)`, `VideoPlayer.addLang(code, dict)`.

## Browser support

Modern browsers (Chrome, Edge, Firefox, Safari, mobile Safari/Chrome).
Embedded-chapter reading depends on the browser's `textTracks` support;
the WebVTT fallback covers the rest. iOS Safari uses its native fullscreen
player via `webkitEnterFullscreen`.

## License

MIT — see [LICENSE](LICENSE).
