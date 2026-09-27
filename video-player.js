/*!
 * Hyfata Media Player — HTML5 video player for anime/movies
 * - Detects opening/ending segments from embedded chapters (where supported)
 *   or a WebVTT chapters file
 * - Auto-classifies opening (opening/intro/op) and ending (ending/credits/ed)
 *   with a skip button
 * - Progress bar shows breaks at opening/ending boundaries
 * - Keyboard seek (←/→, J/L), mobile double-tap seek (YouTube style)
 * - Glassmorphism UI, separately optimized controls for desktop/mobile
 * - Built-in English/Korean language packs, extensible via VideoPlayer.addLang()
 *
 * Usage:
 *   new VideoPlayer('#container', {
 *     src: 'video.mp4',
 *     chaptersUrl: 'chapters.vtt',   // fallback for browsers without embedded chapters
 *     lang: 'en',                    // 'en' (default) | 'ko' | custom pack code
 *     labels: { play: 'Play ▶' },    // per-string overrides
 *     seekStep: 10,                  // double-tap/button seek seconds (default 10)
 *     keyboardSeek: 5                // arrow-key seek seconds (default 5)
 *   });
 *
 * Add a language:
 *   VideoPlayer.addLang('ja', { play: '再生', pause: '一時停止', ... });
 *   new VideoPlayer('#container', { src: 'video.mp4', lang: 'ja' });
 */
(function (global) {
  'use strict';

  /* ================= Icons ================= */
  var ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    rewind: '<svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6L11 18zm.5-6l8.5 6V6l-8.5 6z"/></svg>',
    forward: '<svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>',
    skipNext: '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.21 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    fullscreenExit: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
  };

  /* ================= Utils ================= */

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return (h > 0 ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
  }

  /**
   * Classify a segment from its chapter title
   * opening: opening / intro / op
   * ending:  ending / credits / ed
   */
  function classifyChapter(title) {
    var t = (title || '').toLowerCase();
    if (/\b(opening|intro|op)\b/.test(t)) return 'opening';
    if (/\b(ending|credits|ed)\b/.test(t)) return 'ending';
    return 'normal';
  }

  var VTT_TIME_RE = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{3})/;

  function toSec(h, m, s, ms) {
    return (h ? parseInt(h, 10) * 3600 : 0) + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
  }

  /** WebVTT text → [{start, end, title}] */
  function parseVTT(text) {
    var cues = [];
    var clean = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
    var blocks = clean.split(/\n\n+/);
    for (var b = 0; b < blocks.length; b++) {
      var lines = blocks[b].split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(VTT_TIME_RE);
        if (m) {
          cues.push({
            start: toSec(m[1], m[2], m[3], m[4]),
            end: toSec(m[5], m[6], m[7], m[8]),
            title: lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim()
          });
          break;
        }
      }
    }
    return cues;
  }

  /** Read embedded chapter tracks exposed by the browser (supporting browsers only) */
  function readEmbeddedChapters(video) {
    var tracks = video.textTracks;
    if (!tracks) return null;
    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i];
      if (t.kind === 'chapters' && t.cues && t.cues.length > 0) {
        var out = [];
        for (var j = 0; j < t.cues.length; j++) {
          out.push({ start: t.cues[j].startTime, end: t.cues[j].endTime, title: t.cues[j].text || '' });
        }
        return out;
      }
    }
    return null;
  }

  /* ================= Language packs =================
   * Default language is English. Pick another pack with `lang: 'ko'`,
   * override single strings with `labels: {...}`, or register a new
   * language with VideoPlayer.addLang(code, dict).
   * Supported placeholders: {sec}, {sign}, {detail}.
   */

  var LANGS = {
    en: {
      skipOpening: 'Skip Opening',
      skipEnding: 'Skip Ending',
      opening: 'Opening',
      ending: 'Ending',
      play: 'Play',
      pause: 'Pause',
      mute: 'Mute',
      unmute: 'Unmute',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      settings: 'Settings',
      playbackRate: 'Playback speed',
      autoSkip: 'Auto-skip opening/ending',
      showSkip: 'Show skip button',
      skipped: 'Skipped',
      volume: 'Volume',
      seekPosition: 'Seek position',
      seekFlash: '{sign}{sec}s',
      seekBack: '{sec}s back',
      seekForward: '{sec}s forward',
      loadError: 'Could not load the video ({detail})'
    },
    ko: {
      skipOpening: '오프닝 건너뛰기',
      skipEnding: '엔딩 건너뛰기',
      opening: '오프닝',
      ending: '엔딩',
      play: '재생',
      pause: '일시정지',
      mute: '음소거',
      unmute: '음소거 해제',
      fullscreen: '전체화면',
      exitFullscreen: '전체화면 종료',
      settings: '설정',
      playbackRate: '재생 속도',
      autoSkip: '오프닝/엔딩 자동 스킵',
      showSkip: '스킵 버튼 표시',
      skipped: '건너뛰기',
      volume: '볼륨',
      seekPosition: '재생 위치',
      seekFlash: '{sign}{sec}초',
      seekBack: '{sec}초 뒤로',
      seekForward: '{sec}초 앞으로',
      loadError: '영상을 불러올 수 없습니다. ({detail})'
    }
  };

  /** Fill {placeholders} in a label template */
  function tmpl(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? vars[k] : m;
    });
  }

  /* ================= Player ================= */

  function VideoPlayer(target, options) {
    options = options || {};
    this.options = Object.assign({
      src: null,
      poster: null,
      chaptersUrl: null,
      lang: 'en',
      autoplay: false,
      muted: false,
      loop: false,
      preload: 'metadata',
      seekStep: 10,
      keyboardSeek: 5,
      hideDelay: 2600,
      skipButtonDuration: 4000
    }, options);
    var baseLabels = LANGS[this.options.lang] || LANGS.en;
    this.options.labels = Object.assign({}, baseLabels, options.labels || {});

    var containerEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!containerEl) throw new Error('[VideoPlayer] container not found: ' + target);

    this._listeners = [];
    this.chapters = [];
    this.chaptersSource = null;
    this._sections = [];
    this._skipTarget = null;
    this._skipSegment = null;
    this._skipTimer = null;
    this._dragging = false;
    this._hoveringControls = false;
    this._focusInControls = false;
    this._lastVolume = 1;
    this._lastTap = { time: 0, side: null };
    this._tapAcc = { left: { last: 0, count: 0 }, right: { last: 0, count: 0 } };
    this._menuOpen = false;

    // Restore saved settings (localStorage)
    this._rate = 1;
    this._autoSkip = false;
    this._showSkip = true;
    try {
      var savedRate = parseFloat(global.localStorage.getItem('vp:rate'));
      if (savedRate > 0) this._rate = savedRate;
      this._autoSkip = global.localStorage.getItem('vp:autoSkip') === '1';
      if (global.localStorage.getItem('vp:showSkip') === '0') this._showSkip = false;
    } catch (e) {}

    this.isTouch = (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in global);

    this._build(containerEl);
    this._bind();
    this._initChapters();

    // Switch to compact mode based on player size (shrink UI when small)
    if (typeof ResizeObserver !== 'undefined') {
      var self = this;
      this._ro = new ResizeObserver(function () { self._updateSizeClass(); });
      this._ro.observe(this.container);
      this._updateSizeClass();
    }

    this._poke();
  }

  /** Shrink the UI when the player is small (adds vp--compact under 540px wide or 230px tall) */
  VideoPlayer.prototype._updateSizeClass = function () {
    var w = this.container.clientWidth;
    var h = this.container.clientHeight;
    this.container.classList.toggle('vp--compact', w < 540 || (h > 0 && h < 230));
    this._updateProgressUI();
  };

  VideoPlayer.parseVTT = parseVTT;
  VideoPlayer.classifyChapter = classifyChapter;
  VideoPlayer.formatTime = formatTime;
  VideoPlayer.LANGS = LANGS;

  /**
   * Register a language pack. Missing keys fall back to English.
   *   VideoPlayer.addLang('ja', { play: '再生', pause: '一時停止' });
   */
  VideoPlayer.addLang = function (code, dict) {
    LANGS[code] = Object.assign({}, LANGS.en, dict);
  };

  /** Translate a label key with {placeholders} (falls back to English, then the key) */
  VideoPlayer.prototype._txt = function (key, vars) {
    var s = this.options.labels[key];
    if (s == null) s = LANGS.en[key] || key;
    return tmpl(s, vars);
  };

  /* ---------- DOM setup ---------- */

  VideoPlayer.prototype._build = function (containerEl) {
    var o = this.options;
    var L = o.labels;
    var container, video;

    if (containerEl.tagName === 'VIDEO') {
      video = containerEl;
      container = document.createElement('div');
      video.parentNode.insertBefore(container, video);
      container.appendChild(video);
      this._wrapped = true;
    } else {
      container = containerEl;
      video = document.createElement('video');
      container.appendChild(video);
    }

    container.classList.add('vp', this.isTouch ? 'vp--touch' : 'vp--desktop', 'vp--paused');
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');

    video.classList.add('vp__video');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.controls = false;
    video.preload = o.preload;
    if (o.poster) video.poster = o.poster;
    if (o.autoplay) { video.autoplay = true; video.muted = true; }
    if (o.muted) video.muted = true;
    if (o.loop) video.loop = true;
    if (o.src && !video.getAttribute('src') && !video.querySelector('source')) video.src = o.src;

    video.insertAdjacentHTML('afterend',
      '<div class="vp__tap-layer">' +
        '<div class="vp__tap-zone vp__tap-zone--left"></div>' +
        '<div class="vp__tap-zone vp__tap-zone--right"></div>' +
      '</div>' +
      '<div class="vp__spinner"><div class="vp__spinner-ring"></div></div>' +
      '<button type="button" class="vp__center-play" aria-label="' + L.play + '">' + ICONS.play + '</button>' +
      '<div class="vp__seek-flash" aria-hidden="true"></div>' +
      '<button type="button" class="vp__skip-btn"><span class="vp__skip-label"></span>' + ICONS.skipNext + '</button>' +
      '<div class="vp__controls">' +
        '<div class="vp__progress" role="slider" aria-label="' + L.seekPosition + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="vp__progress-sections"></div>' +
          '<div class="vp__progress-handle"></div>' +
          '<div class="vp__progress-tooltip"></div>' +
        '</div>' +
        '<div class="vp__row">' +
          '<button type="button" class="vp__btn vp__btn--play" aria-label="' + L.play + '">' + ICONS.play + '</button>' +
          '<button type="button" class="vp__btn vp__btn--rewind" aria-label="' + tmpl(L.seekBack, { sec: o.seekStep }) + '">' + ICONS.rewind + '</button>' +
          '<button type="button" class="vp__btn vp__btn--forward" aria-label="' + tmpl(L.seekForward, { sec: o.seekStep }) + '">' + ICONS.forward + '</button>' +
          '<div class="vp__time"><span class="vp__time-current">0:00</span><span class="vp__time-sep">/</span><span class="vp__time-duration">0:00</span></div>' +
          '<div class="vp__spacer"></div>' +
          '<div class="vp__volume">' +
            '<button type="button" class="vp__btn vp__btn--volume" aria-label="' + L.mute + '">' + ICONS.volume + '</button>' +
            '<input class="vp__volume-slider" type="range" min="0" max="1" step="0.05" value="1" aria-label="' + L.volume + '" />' +
          '</div>' +
          '<button type="button" class="vp__btn vp__btn--settings" aria-label="' + L.settings + '" aria-haspopup="true" aria-expanded="false">' + ICONS.settings + '</button>' +
          '<button type="button" class="vp__btn vp__btn--fullscreen" aria-label="' + L.fullscreen + '">' + ICONS.fullscreen + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="vp__menu" role="menu">' +
        '<div class="vp__menu-handle"></div>' +
        '<div class="vp__menu-section">' +
          '<div class="vp__menu-title">' + L.playbackRate + '</div>' +
          '<div class="vp__menu-rates">' +
            [0.5, 0.75, 1, 1.25, 1.5, 2].map(function (rate) {
              return '<button type="button" class="vp__rate" data-rate="' + rate + '">' + rate + 'x</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="vp__menu-section vp__menu-toggle-row">' +
          '<span>' + L.autoSkip + '</span>' +
          '<button type="button" class="vp__switch vp__switch--auto-skip" role="switch" aria-checked="false" aria-label="' + L.autoSkip + '"><span class="vp__switch-knob"></span></button>' +
        '</div>' +
        '<div class="vp__menu-section vp__menu-toggle-row">' +
          '<span>' + L.showSkip + '</span>' +
          '<button type="button" class="vp__switch vp__switch--show-skip" role="switch" aria-checked="true" aria-label="' + L.showSkip + '"><span class="vp__switch-knob"></span></button>' +
        '</div>' +
      '</div>'
    );

    this.container = container;
    this.video = video;
    var q = function (sel) { return container.querySelector(sel); };
    this.refs = {
      tapLayer: q('.vp__tap-layer'),
      zoneL: q('.vp__tap-zone--left'),
      zoneR: q('.vp__tap-zone--right'),
      centerPlay: q('.vp__center-play'),
      seekFlash: q('.vp__seek-flash'),
      skipBtn: q('.vp__skip-btn'),
      skipLabel: q('.vp__skip-label'),
      controls: q('.vp__controls'),
      progress: q('.vp__progress'),
      sectionsWrap: q('.vp__progress-sections'),
      handle: q('.vp__progress-handle'),
      tooltip: q('.vp__progress-tooltip'),
      playBtn: q('.vp__btn--play'),
      rewindBtn: q('.vp__btn--rewind'),
      forwardBtn: q('.vp__btn--forward'),
      volume: q('.vp__volume'),
      volumeBtn: q('.vp__btn--volume'),
      volumeSlider: q('.vp__volume-slider'),
      fsBtn: q('.vp__btn--fullscreen'),
      settingsBtn: q('.vp__btn--settings'),
      menu: q('.vp__menu'),
      autoSkipSwitch: q('.vp__switch--auto-skip'),
      showSkipSwitch: q('.vp__switch--show-skip'),
      timeCur: q('.vp__time-current'),
      timeDur: q('.vp__time-duration')
    };
    this.refs.rateChips = Array.prototype.slice.call(container.querySelectorAll('.vp__rate'));

    var fsSupported = (document.fullscreenEnabled && container.requestFullscreen) ||
      container.webkitRequestFullscreen || video.webkitEnterFullscreen;
    if (!fsSupported) this.refs.fsBtn.style.display = 'none';

    this.refs.volumeSlider.value = video.muted ? 0 : video.volume;

    // Apply saved settings
    video.playbackRate = this._rate;
    this._updateRateChips();
    this._updateAutoSkipSwitch();
    this._updateShowSkipSwitch();

    // Mobile: move mute/settings buttons out of the control panel (top-right floating).
    // The settings menu goes to body so it can render as a viewport bottom sheet
    // (it would be clipped by the player overflow otherwise)
    if (this.isTouch) {
      container.appendChild(this.refs.volume);
      container.appendChild(this.refs.settingsBtn);
      this.refs.menu.classList.add('vp__menu--sheet'); // keep styling after moving to body via a dedicated class
      document.body.appendChild(this.refs.menu);
      // Backdrop for background dimming (mobile sheet only)
      var backdrop = document.createElement('div');
      backdrop.className = 'vp__menu-backdrop';
      this.refs.backdrop = backdrop;
      document.body.appendChild(backdrop);
    }
  };

  /* ---------- Event bindings ---------- */

  VideoPlayer.prototype._on = function (target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
  };

  VideoPlayer.prototype._bind = function () {
    var self = this;
    var o = this.options;
    var L = o.labels;
    var v = this.video;
    var c = this.container;
    var r = this.refs;

    /* Video state */
    this._on(v, 'play', function () {
      c.classList.add('vp--playing');
      c.classList.remove('vp--paused');
      r.playBtn.innerHTML = ICONS.pause;
      r.playBtn.setAttribute('aria-label', L.pause);
      r.centerPlay.innerHTML = ICONS.pause;
      r.centerPlay.setAttribute('aria-label', L.pause);
      self._poke();
    });
    function onPause() {
      c.classList.add('vp--paused');
      c.classList.remove('vp--playing');
      r.playBtn.innerHTML = ICONS.play;
      r.playBtn.setAttribute('aria-label', L.play);
      r.centerPlay.innerHTML = ICONS.play;
      r.centerPlay.setAttribute('aria-label', L.play);
      // While paused the overlay stays visible, so keep the skip button up
      if (self._skipSegment) self._showSkipButton();
      c.classList.remove('vp--idle');
      clearTimeout(self._hideTimer);
    }
    this._on(v, 'pause', onPause);
    this._on(v, 'ended', onPause);

    this._on(v, 'timeupdate', function () { self._onTimeUpdate(); });
    function onMeta() {
      r.timeDur.textContent = formatTime(v.duration);
      self._renderSections();
    }
    this._on(v, 'loadedmetadata', onMeta);
    this._on(v, 'durationchange', onMeta);
    this._on(v, 'progress', function () { self._updateBuffer(); });
    this._on(global, 'resize', function () { self._updateProgressUI(); });

    this._on(v, 'waiting', function () { c.classList.add('vp--loading'); });
    this._on(v, 'seeking', function () { c.classList.add('vp--loading'); });
    ['playing', 'canplay', 'seeked', 'pause'].forEach(function (ev) {
      self._on(v, ev, function () { c.classList.remove('vp--loading'); });
    });

    this._on(v, 'volumechange', function () {
      var vol = v.muted ? 0 : v.volume;
      r.volumeSlider.value = vol;
      r.volumeBtn.innerHTML = vol === 0 ? ICONS.mute : ICONS.volume;
      r.volumeBtn.setAttribute('aria-label', vol === 0 ? L.unmute : L.mute);
    });

    this._on(v, 'error', function () {
      if (!v.error) return;
      if (!self._errorEl) {
        self._errorEl = document.createElement('div');
        self._errorEl.className = 'vp__error';
        c.appendChild(self._errorEl);
      }
      self._errorEl.textContent = tmpl(L.loadError, { detail: v.error.message || 'code ' + v.error.code });
      self._errorEl.style.display = 'grid';
    });

    /* Control buttons */
    this._on(r.playBtn, 'click', function () { self.togglePlay(); });
    this._on(r.centerPlay, 'click', function (e) { e.stopPropagation(); self.togglePlay(); });
    this._on(r.rewindBtn, 'click', function () { self.seekBy(-o.seekStep); self._poke(); });
    this._on(r.forwardBtn, 'click', function () { self.seekBy(o.seekStep); self._poke(); });
    this._on(r.skipBtn, 'click', function () { self.skipSegment(); });
    this._on(r.fsBtn, 'click', function () { self.toggleFullscreen(); });
    this._on(r.volumeBtn, 'click', function () { self.toggleMute(); });
    this._on(r.volumeSlider, 'input', function () {
      v.volume = parseFloat(r.volumeSlider.value);
      v.muted = v.volume === 0;
      self._poke();
    });

    /* Settings menu */
    this._on(r.settingsBtn, 'click', function (e) {
      e.stopPropagation();
      self._toggleMenu();
    });
    this._on(r.menu, 'click', function (e) { e.stopPropagation(); self._poke(); });
    this.refs.rateChips.forEach(function (chip) {
      self._on(chip, 'click', function () { self._setRate(parseFloat(chip.dataset.rate)); });
    });
    this._on(r.autoSkipSwitch, 'click', function () { self._setAutoSkip(!self._autoSkip); });
    this._on(r.showSkipSwitch, 'click', function () { self._setShowSkip(!self._showSkip); });
    this._on(document, 'click', function () { self._closeMenu(); });

    /* Mobile bottom sheet: tap backdrop to close + drag down to close */
    if (this.isTouch && r.backdrop) {
      this._on(r.backdrop, 'click', function () { self._closeMenu(); });
      var startY = 0, curDy = 0, dragging = false, canDrag = false;
      this._on(r.menu, 'touchstart', function (e) {
        if (!self._menuOpen) return;
        dragging = true;
        canDrag = r.menu.scrollTop <= 0; // only pull-to-close when scrolled to the top
        startY = e.touches[0].clientY;
        curDy = 0;
        r.menu.style.transition = 'none';
        r.backdrop.style.transition = 'none';
      }, { passive: true });
      this._on(r.menu, 'touchmove', function (e) {
        if (!dragging || !canDrag) return;
        var dy = e.touches[0].clientY - startY;
        if (dy <= 0) return;
        if (e.cancelable) e.preventDefault();
        curDy = dy;
        r.menu.style.transform = 'translate(-50%, ' + dy + 'px)';
        r.backdrop.style.opacity = String(Math.max(0, 1 - dy / 220));
      }, { passive: false });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        r.menu.style.transition = '';
        r.backdrop.style.transition = '';
        if (curDy > 90) self._closeMenu();
        else {
          r.menu.style.transform = '';
          r.backdrop.style.opacity = '';
        }
      }
      this._on(r.menu, 'touchend', endDrag);
      this._on(r.menu, 'touchcancel', endDrag);
    }

    /* Keyboard */
    this._on(c, 'keydown', function (e) { self._onKeydown(e); });

    /* Auto-hide */
    this._on(c, 'mousemove', function () { self._poke(); });
    this._on(c, 'mouseleave', function () {
      clearTimeout(self._hideTimer);
      if (!v.paused && !v.ended && !self._dragging) {
        self._hideTimer = setTimeout(function () {
          c.classList.add('vp--idle');
          self._closeMenu();
        }, 500);
      }
    });
    this._on(r.controls, 'pointerenter', function () { self._hoveringControls = true; self._poke(); });
    this._on(r.controls, 'pointerleave', function () { self._hoveringControls = false; self._poke(); });
    this._on(r.controls, 'focusin', function () { self._focusInControls = true; self._poke(); });
    this._on(r.controls, 'focusout', function () { self._focusInControls = false; self._poke(); });

    /* Fullscreen state */
    function onFsChange() {
      var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      c.classList.toggle('vp--fullscreen', fs);
      r.fsBtn.innerHTML = fs ? ICONS.fullscreenExit : ICONS.fullscreen;
      r.fsBtn.setAttribute('aria-label', fs ? L.exitFullscreen : L.fullscreen);
      // Mobile fullscreen: anything outside body doesn't render,
      // so move the menu/backdrop inside the player
      if (self.isTouch && r.backdrop) {
        if (fs) { c.appendChild(r.menu); c.appendChild(r.backdrop); }
        else { document.body.appendChild(r.menu); document.body.appendChild(r.backdrop); }
      }
      if (fs && self.isTouch && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(function () {});
      } else if (!fs && screen.orientation && screen.orientation.unlock) {
        try { screen.orientation.unlock(); } catch (e) {}
      }
    }
    this._on(document, 'fullscreenchange', onFsChange);
    this._on(document, 'webkitfullscreenchange', onFsChange);

    /* Progress bar (unified pointer: mouse/touch/pen) */
    this._on(r.progress, 'pointerdown', function (e) {
      e.preventDefault();
      self._safeFocus();
      self._dragging = true;
      c.classList.add('vp--dragging');
      if (r.progress.setPointerCapture) {
        try { r.progress.setPointerCapture(e.pointerId); } catch (err) {}
      }
      self._seekFromEvent(e);
    });
    this._on(r.progress, 'pointermove', function (e) {
      if (self._dragging) self._seekFromEvent(e);
      if (!self.isTouch || self._dragging) self._updateTooltip(e);
    });
    function endDrag(e) {
      if (!self._dragging) return;
      self._dragging = false;
      c.classList.remove('vp--dragging');
      self._seekFromEvent(e);
      self._poke();
    }
    this._on(r.progress, 'pointerup', endDrag);
    this._on(r.progress, 'pointercancel', endDrag);

    /* Tap/click (per-platform branch) */
    if (this.isTouch) {
      this._on(r.tapLayer, 'touchend', function (e) { self._onTap(e); }, { passive: false });
    } else {
      this._on(r.tapLayer, 'click', function () { self.togglePlay(); });
      this._on(r.tapLayer, 'dblclick', function () { self.toggleFullscreen(); });
    }
  };

  /* ---------- Chapters ---------- */

  VideoPlayer.prototype._initChapters = function () {
    var self = this;
    var v = this.video;

    function tryEmbedded() {
      var cues = readEmbeddedChapters(v);
      if (cues && cues.length) self._applyChapters(cues, 'embedded');
    }

    if (v.readyState >= 1) tryEmbedded();
    this._on(v, 'loadedmetadata', tryEmbedded);
    this._on(v, 'loadeddata', tryEmbedded);
    if (v.textTracks && v.textTracks.addEventListener) {
      this._on(v.textTracks, 'addtrack', function () { setTimeout(tryEmbedded, 100); });
      this._on(v.textTracks, 'change', tryEmbedded);
    }

    if (this.options.chaptersUrl) {
      fetch(this.options.chaptersUrl)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (text) {
          var cues = parseVTT(text);
          if (cues.length) self._applyChapters(cues, 'vtt');
        })
        .catch(function (err) {
          console.warn('[VideoPlayer] chapter (WebVTT) load failed:', err.message || err);
        });
    }
  };

  VideoPlayer.prototype._applyChapters = function (cues, source) {
    if (this.chaptersSource === 'embedded' && source === 'vtt') return;
    this.chaptersSource = source;
    this.chapters = cues.map(function (cue) {
      return { start: cue.start, end: cue.end, title: cue.title, type: classifyChapter(cue.title) };
    }).sort(function (a, b) { return a.start - b.start; });
    this._renderSections();
    this._updateSkipButton();
  };

  /**
   * Split the progress bar into real per-segment pieces at opening/ending boundaries.
   * Each piece (.vp__section) is sized by time share via flex,
   * with transparent gaps (CSS gap) between pieces.
   */
  VideoPlayer.prototype._renderSections = function () {
    var wrap = this.refs.sectionsWrap;
    wrap.innerHTML = '';
    this._sections = [];
    var d = this.video.duration;
    if (!isFinite(d) || d <= 0) return;

    var pts = [0, d];
    this.chapters.forEach(function (c) {
      if (c.type === 'normal') return;
      if (c.start > 0.5 && c.start < d - 0.5) pts.push(c.start);
      if (c.end > 0.5 && c.end < d - 0.5) pts.push(c.end);
    });
    pts = pts.filter(function (v, i) { return pts.indexOf(v) === i; })
             .sort(function (a, b) { return a - b; });

    for (var i = 0; i < pts.length - 1; i++) {
      var share = pts[i + 1] - pts[i];
      var el = document.createElement('div');
      el.className = 'vp__section';
      el.style.flexGrow = String(share);
      el.innerHTML = '<div class="vp__section-buffered"></div><div class="vp__section-played"></div>';
      wrap.appendChild(el);
      this._sections.push({
        start: pts[i],
        end: pts[i + 1],
        dur: share,
        el: el,
        bufferedEl: el.querySelector('.vp__section-buffered'),
        playedEl: el.querySelector('.vp__section-played')
      });
    }
    this._updateProgressUI();
    this._updateBuffer();
  };

  /** Time → x (px, relative to .vp__progress) */
  VideoPlayer.prototype._timeToX = function (t) {
    var secs = this._sections;
    var base = this.refs.sectionsWrap.offsetLeft; // inner padding of the mobile box
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      if (t <= s.end || i === secs.length - 1) {
        return base + s.el.offsetLeft + clamp((t - s.start) / s.dur, 0, 1) * s.el.offsetWidth;
      }
    }
    return 0;
  };

  /** x (px, relative to .vp__progress) → time (points over a gap snap to the next piece) */
  VideoPlayer.prototype._xToTime = function (x) {
    var secs = this._sections;
    if (!secs.length) return 0;
    x -= this.refs.sectionsWrap.offsetLeft; // compensate the inner padding of the mobile box
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      var left = s.el.offsetLeft;
      var w = s.el.offsetWidth;
      if (x <= left + w || i === secs.length - 1) {
        if (x < left) return s.start;
        return s.start + clamp((x - left) / w, 0, 1) * s.dur;
      }
    }
    return secs[secs.length - 1].end;
  };

  /** Update each piece's fill and the handle position for the current time */
  VideoPlayer.prototype._updateProgressUI = function () {
    var v = this.video;
    var t = v.currentTime;
    var d = v.duration;
    this._sections.forEach(function (s) {
      s.playedEl.style.width = clamp((t - s.start) / s.dur, 0, 1) * 100 + '%';
    });
    this.refs.handle.style.left = this._timeToX(t) + 'px';
    if (isFinite(d) && d > 0) {
      this.refs.progress.setAttribute('aria-valuenow', String(Math.round((t / d) * 100)));
    }
  };

  VideoPlayer.prototype._chapterAt = function (t) {
    for (var i = 0; i < this.chapters.length; i++) {
      var c = this.chapters[i];
      if (t >= c.start && t < c.end) return c;
    }
    return null;
  };

  VideoPlayer.prototype._updateSkipButton = function () {
    var t = this.video.currentTime;
    var seg = null;
    for (var i = 0; i < this.chapters.length; i++) {
      var c = this.chapters[i];
      if (c.type !== 'normal' && t >= c.start && t < c.end) { seg = c; break; }
    }
    // Auto-skip: jump immediately on entering a segment (no button shown)
    if (seg && this._autoSkip) {
      this.video.currentTime = seg.end + 0.05;
      this._flash(seg.type === 'opening' ? this.options.labels.skipOpening : this.options.labels.skipEnding);
      seg = null;
    }
    // Hide the button when the skip-button toggle is OFF
    if (seg && !this._showSkip) seg = null;
    if (seg === this._skipSegment) return;
    this._skipSegment = seg;
    if (seg) {
      this._skipTarget = seg.end;
      this.refs.skipLabel.textContent =
        seg.type === 'opening' ? this.options.labels.skipOpening : this.options.labels.skipEnding;
      this._showSkipButton();
    } else {
      this._skipTarget = null;
      this._hideSkipButton();
    }
  };

  /** Show the skip button + auto-hide timer (stays up while paused) */
  VideoPlayer.prototype._showSkipButton = function () {
    var self = this;
    clearTimeout(this._skipTimer);
    this.refs.skipBtn.classList.add('vp--visible');
    if (!this.video.paused) {
      this._skipTimer = setTimeout(function () {
        self.refs.skipBtn.classList.remove('vp--visible');
      }, this.options.skipButtonDuration);
    }
  };

  VideoPlayer.prototype._hideSkipButton = function () {
    clearTimeout(this._skipTimer);
    this.refs.skipBtn.classList.remove('vp--visible');
  };

  /** Skip button click → jump to the end of the current opening/ending segment */
  VideoPlayer.prototype.skipSegment = function () {
    if (this._skipTarget == null) return;
    this.video.currentTime = this._skipTarget + 0.05;
    this._skipTarget = null;
    this._skipSegment = null;
    this._hideSkipButton();
    this._flash(this._txt('skipped'));
  };

  /* ---------- Playback state ---------- */

  VideoPlayer.prototype._onTimeUpdate = function () {
    this.refs.timeCur.textContent = formatTime(this.video.currentTime);
    this._updateProgressUI();
    this._updateBuffer();
    this._updateSkipButton();
  };

  VideoPlayer.prototype._updateBuffer = function () {
    var v = this.video;
    var d = v.duration;
    if (!isFinite(d) || d <= 0 || !this._sections.length) return;
    try {
      var b = v.buffered;
      var end = 0;
      for (var i = 0; i < b.length; i++) {
        if (b.start(i) <= v.currentTime && v.currentTime <= b.end(i)) { end = b.end(i); break; }
      }
      if (!end && b.length) end = b.end(b.length - 1);
      this._sections.forEach(function (s) {
        s.bufferedEl.style.width = clamp((end - s.start) / s.dur, 0, 1) * 100 + '%';
      });
    } catch (e) {}
  };

  /* ---------- Progress-bar seeking ---------- */

  VideoPlayer.prototype._seekFromEvent = function (e) {
    var rect = this.refs.progress.getBoundingClientRect();
    var x = clamp(e.clientX - rect.left, 0, rect.width);
    var d = this.video.duration;
    if (!isFinite(d) || d <= 0) return;
    this.video.currentTime = this._xToTime(x);
    this._updateProgressUI();
  };

  VideoPlayer.prototype._updateTooltip = function (e) {
    var rect = this.refs.progress.getBoundingClientRect();
    var x = clamp(e.clientX - rect.left, 0, rect.width);
    var d = this.video.duration;
    if (!isFinite(d) || d <= 0) return;
    var t = this._xToTime(x);
    var ch = this._chapterAt(t);
    var tip = this.refs.tooltip;
    var label = '';
    if (ch && ch.type === 'opening') label = ' · ' + this.options.labels.opening;
    else if (ch && ch.type === 'ending') label = ' · ' + this.options.labels.ending;
    tip.textContent = formatTime(t) + label;
    tip.style.left = clamp(x, 30, Math.max(30, rect.width - 30)) + 'px';
  };

  /* ---------- Keyboard ---------- */

  VideoPlayer.prototype._onKeydown = function (e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    var o = this.options;
    var handled = true;
    switch (e.key) {
      case 'Escape':
        if (this._menuOpen) this._closeMenu(); else handled = false;
        break;
      case ' ': case 'k': case 'K': this.togglePlay(); break;
      case 'ArrowLeft': this.seekBy(-o.keyboardSeek); break;
      case 'ArrowRight': this.seekBy(o.keyboardSeek); break;
      case 'j': case 'J': this.seekBy(-o.seekStep); break;
      case 'l': case 'L': this.seekBy(o.seekStep); break;
      case 'ArrowUp': this._adjustVolume(0.05); break;
      case 'ArrowDown': this._adjustVolume(-0.05); break;
      case 'm': case 'M': this.toggleMute(); break;
      case 'f': case 'F': this.toggleFullscreen(); break;
      case 'Home': this.seekTo(0); break;
      case 'End': this.seekTo(this.video.duration); break;
      default:
        if (/^[0-9]$/.test(e.key) && isFinite(this.video.duration)) {
          this.seekTo(this.video.duration * (parseInt(e.key, 10) / 10));
        } else {
          handled = false;
        }
    }
    if (handled) {
      e.preventDefault();
      this._poke();
    }
  };

  /* ---------- Touch: double-tap seek ---------- */

  /**
   * Skip programmatic focus on touch+fullscreen.
   * iOS Safari mistakes focus during fullscreen for a typing attempt and
   * shows a phishing warning ("looks like you're typing in fullscreen"),
   * while touch environments have no physical keyboard so focus is unneeded.
   * Desktop fullscreen (for keyboard shortcuts) still focuses as before.
   */
  VideoPlayer.prototype._safeFocus = function () {
    if (this.isTouch && (document.fullscreenElement || document.webkitFullscreenElement)) return;
    this.container.focus({ preventScroll: true });
  };

  VideoPlayer.prototype._onTap = function (e) {
    e.preventDefault();
    this._safeFocus();
    var rect = this.refs.tapLayer.getBoundingClientRect();
    var x = e.changedTouches[0].clientX - rect.left;
    var side = x < rect.width / 2 ? 'left' : 'right';
    var now = Date.now();
    var self = this;

    if (now - this._lastTap.time < 320 && this._lastTap.side === side) {
      clearTimeout(this._singleTapTimer);
      this._lastTap.time = 0;
      this._doubleTap(side);
    } else {
      this._lastTap = { time: now, side: side };
      this._singleTapTimer = setTimeout(function () { self._toggleControls(); }, 300);
    }
  };

  VideoPlayer.prototype._doubleTap = function (side) {
    var step = this.options.seekStep;
    this.seekBy(side === 'left' ? -step : step, true);

    var acc = this._tapAcc[side];
    var now = Date.now();
    acc.count = (now - acc.last < 900) ? acc.count + step : step;
    acc.last = now;

    var zone = side === 'left' ? this.refs.zoneL : this.refs.zoneR;
    var ripple = document.createElement('div');
    ripple.className = 'vp__ripple';
    ripple.innerHTML = '<span class="vp__ripple-count">' + this._txt('seekFlash', { sign: side === 'left' ? '-' : '+', sec: acc.count }) + '</span>';
    zone.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
    this._poke();
  };

  VideoPlayer.prototype._toggleControls = function () {
    if (this.container.classList.contains('vp--idle')) this._poke();
    else {
      clearTimeout(this._hideTimer);
      this.container.classList.add('vp--idle');
      this._closeMenu();
    }
  };

  /* ---------- Settings menu ---------- */

  VideoPlayer.prototype._toggleMenu = function () {
    if (this._menuOpen) this._closeMenu();
    else this._openMenu();
  };

  VideoPlayer.prototype._openMenu = function () {
    this._menuOpen = true;
    this.refs.menu.classList.add('vp--visible');
    if (this.refs.backdrop) this.refs.backdrop.classList.add('vp--visible');
    this.container.classList.add('vp--menu-open');
    this.refs.settingsBtn.setAttribute('aria-expanded', 'true');
    this._poke();
  };

  VideoPlayer.prototype._closeMenu = function () {
    if (!this._menuOpen) return;
    this._menuOpen = false;
    this.refs.menu.classList.remove('vp--visible');
    if (this.refs.backdrop) this.refs.backdrop.classList.remove('vp--visible');
    // Clear leftover inline styles from dragging
    this.refs.menu.style.transform = '';
    this.refs.menu.style.transition = '';
    if (this.refs.backdrop) {
      this.refs.backdrop.style.opacity = '';
      this.refs.backdrop.style.transition = '';
    }
    this.container.classList.remove('vp--menu-open');
    this.refs.settingsBtn.setAttribute('aria-expanded', 'false');
  };

  VideoPlayer.prototype._setRate = function (rate) {
    this._rate = rate;
    this.video.playbackRate = rate;
    try { global.localStorage.setItem('vp:rate', String(rate)); } catch (e) {}
    this._updateRateChips();
    this._flash(rate + 'x');
    this._poke();
  };

  VideoPlayer.prototype._setAutoSkip = function (on) {
    this._autoSkip = on;
    try { global.localStorage.setItem('vp:autoSkip', on ? '1' : '0'); } catch (e) {}
    this._updateAutoSkipSwitch();
    this._updateSkipButton(); // apply to the current segment immediately when enabling
    this._poke();
  };

  VideoPlayer.prototype._updateRateChips = function () {
    var self = this;
    this.refs.rateChips.forEach(function (chip) {
      chip.classList.toggle('vp--active', parseFloat(chip.dataset.rate) === self._rate);
    });
  };

  VideoPlayer.prototype._updateAutoSkipSwitch = function () {
    this.refs.autoSkipSwitch.setAttribute('aria-checked', String(this._autoSkip));
  };

  VideoPlayer.prototype._setShowSkip = function (on) {
    this._showSkip = on;
    try { global.localStorage.setItem('vp:showSkip', on ? '1' : '0'); } catch (e) {}
    this._updateShowSkipSwitch();
    this._updateSkipButton(); // hide immediately when disabling / show at once when enabling mid-segment
    this._poke();
  };

  VideoPlayer.prototype._updateShowSkipSwitch = function () {
    this.refs.showSkipSwitch.setAttribute('aria-checked', String(this._showSkip));
  };

  /* ---------- Controls show/hide ---------- */

  VideoPlayer.prototype._poke = function (delay) {
    var self = this;
    this.container.classList.remove('vp--idle');
    // Re-show the skip button inside an opening/ending segment (reset the timer)
    if (this._skipSegment) this._showSkipButton();
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(function () {
      if (!self.video.paused && !self.video.ended && !self._dragging &&
          !self._hoveringControls && !self._focusInControls && !self._menuOpen) {
        self.container.classList.add('vp--idle');
        self._closeMenu();
      }
    }, delay != null ? delay : this.options.hideDelay);
  };

  /* ---------- Feedback ---------- */

  VideoPlayer.prototype._flash = function (text) {
    var f = this.refs.seekFlash;
    f.textContent = text;
    f.classList.remove('vp--show');
    void f.offsetWidth;
    f.classList.add('vp--show');
  };

  /* ---------- Public API ---------- */

  VideoPlayer.prototype.play = function () {
    var p = this.video.play();
    if (p && p.catch) p.catch(function () {});
  };

  VideoPlayer.prototype.pause = function () { this.video.pause(); };

  VideoPlayer.prototype.togglePlay = function () {
    if (this.video.paused || this.video.ended) this.play();
    else this.video.pause();
  };

  VideoPlayer.prototype.seekTo = function (sec) {
    var d = this.video.duration;
    if (!isFinite(d) || d <= 0) return;
    this.video.currentTime = clamp(sec, 0, Math.max(0, d - 0.05));
  };

  VideoPlayer.prototype.seekBy = function (sec, silent) {
    var d = this.video.duration;
    if (!isFinite(d) || d <= 0) return;
    this.video.currentTime = clamp(this.video.currentTime + sec, 0, Math.max(0, d - 0.05));
    if (!silent) this._flash(this._txt('seekFlash', { sign: sec > 0 ? '+' : '', sec: sec }));
  };

  VideoPlayer.prototype.toggleMute = function () {
    var v = this.video;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      if (v.volume === 0) v.volume = this._lastVolume || 0.5;
    } else {
      this._lastVolume = v.volume;
      v.muted = true;
    }
  };

  VideoPlayer.prototype._adjustVolume = function (delta) {
    var v = this.video;
    v.muted = false;
    v.volume = clamp(v.volume + delta, 0, 1);
  };

  VideoPlayer.prototype.toggleFullscreen = function () {
    var c = this.container;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (c.requestFullscreen) {
      c.requestFullscreen();
    } else if (c.webkitRequestFullscreen) {
      c.webkitRequestFullscreen();
    } else if (this.video.webkitEnterFullscreen) {
      this.video.webkitEnterFullscreen(); // iOS Safari: fall back to native fullscreen
    }
    this._poke();
  };

  VideoPlayer.prototype.getChapters = function () { return this.chapters.slice(); };

  VideoPlayer.prototype.destroy = function () {
    this._listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    this._listeners = [];
    clearTimeout(this._hideTimer);
    clearTimeout(this._singleTapTimer);
    clearTimeout(this._skipTimer);
    if (this._ro) this._ro.disconnect();
    // Remove the settings menu/backdrop moved to body on mobile
    [this.refs.menu, this.refs.backdrop].forEach(function (elm) {
      if (elm && elm.parentNode && elm.parentNode !== this.container) {
        elm.parentNode.removeChild(elm);
      }
    }, this);
    if (this._wrapped) {
      var parent = this.container.parentNode;
      if (parent) {
        parent.insertBefore(this.video, this.container);
        parent.removeChild(this.container);
        this.video.classList.remove('vp__video');
      }
    } else {
      this.container.innerHTML = '';
      this.container.className = '';
    }
  };

  /* ================= Exports ================= */

  global.VideoPlayer = VideoPlayer;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VideoPlayer: VideoPlayer, parseVTT: parseVTT, classifyChapter: classifyChapter, formatTime: formatTime };
  }
})(typeof window !== 'undefined' ? window : this);
