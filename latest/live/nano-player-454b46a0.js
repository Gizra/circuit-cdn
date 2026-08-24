// Custom element wrapping NanoPlayer v5.
//
// Mounts a nanocosmos h5live player given a `streamname` attribute (a bintu
// streamname like "SbYkH-XATMg" — never a UUID). Two <nano-player> instances
// may live on the same page (desktop sidebar + mobile copy on the bidder
// sale view), so each instance gets its own unique target-div id.
//
// Visibility-gated mount: the bidder Sale view renders both copies into the
// DOM unconditionally; CSS `display: none` hides the inactive one based on
// viewport width. We mount the underlying NanoPlayer only while the host
// element is actually visible — otherwise both players initialize and we
// get double audio when one is unmuted. Visibility is observed via
// IntersectionObserver: a `display: none` element reports
// `isIntersecting: false`, and CSS-driven flips re-fire the observer.
//
// Lifecycle:
//   connectedCallback        — create target div, start observing.
//   IntersectionObserver     — setup when visible, destroy when hidden.
//   attributeChangedCallback — destroy current player; rebuild iff visible.
//   disconnectedCallback     — destroy + stop observing.
//
// Player config is fixed: every value is a deliberate latency / autoplay
// choice tuned for live auctioneering (balancedadaptive + MoQ + single-entry
// ABR-disabled).

(function () {
  'use strict';

  // NanoPlayer constructor takes a DOM id string, so each instance needs
  // its own unique inner-div id.
  let instanceCounter = 0;

  const buildConfig = (streamname) => ({
    source: {
      defaults: { service: 'bintu' },
      entries: [
        { h5live: { rtmp: { streamname: streamname } } }
      ]
    },
    playback: {
      autoplay: true,
      automute: true,
      muted: false,
      faststart: true,
      latencyControlMode: 'balancedadaptive',
      enableMediaOverQuic: true
    },
    style: {
      width: 'auto',
      height: 'auto',
      displayMutedAutoplay: true
    }
  });

  class NanoPlayerElement extends HTMLElement {
    static get observedAttributes() {
      return ['streamname'];
    }

    constructor() {
      super();
      this._player = null;
      this._targetId = null;
      this._connected = false;
      this._observer = null;
      this._isVisible = false;
    }

    connectedCallback() {
      this._connected = true;

      // Create the target div the SDK mounts into. Same div is reused
      // across visibility flips and attribute changes — only the player
      // instance is destroyed and rebuilt.
      //
      // Inline width/height: NanoPlayer's `style: { width: 'auto', height:
      // 'auto' }` sizes the player to its container, so the target div
      // must itself fill <nano-player>. The host element gets its
      // dimensions from CSS (aspect-ratio + width: 100%). Inlining here
      // keeps the requirement co-located with the element creation; no
      // dependency on the global stylesheet being loaded first.
      instanceCounter += 1;
      this._targetId = 'nano-player-target-' + instanceCounter;
      const target = document.createElement('div');
      target.id = this._targetId;
      target.style.width = '100%';
      target.style.height = '100%';
      this.appendChild(target);

      this._observer = new IntersectionObserver((entries) => {
        // Use the latest entry — under rapid layout changes the callback
        // can be invoked with multiple coalesced entries.
        const visible = entries[entries.length - 1].isIntersecting;
        if (visible === this._isVisible) return;
        this._isVisible = visible;
        if (visible) {
          this._setup();
        } else {
          this._destroyPlayer();
        }
      });
      this._observer.observe(this);
    }

    disconnectedCallback() {
      this._connected = false;
      if (this._observer) {
        this._observer.disconnect();
        this._observer = null;
      }
      this._destroyPlayer();
      this._isVisible = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name !== 'streamname') return;
      if (!this._connected) return;
      if (oldValue === newValue) return;

      // Stream changed mid-session. Drop the current player; if we're
      // currently visible, rebuild against the new stream. If hidden,
      // the visibility observer will rebuild when we become visible
      // (and read the now-current attribute via _setup).
      this._destroyPlayer();
      if (this._isVisible) {
        this._setup();
      }
    }

    _setup() {
      const streamname = this.getAttribute('streamname');
      if (!streamname) return;

      if (typeof NanoPlayer === 'undefined') {
        console.error('nano-player: NanoPlayer SDK not loaded');
        return;
      }

      try {
        const player = new NanoPlayer(this._targetId);
        // Hold the reference before setup() resolves so a fast
        // disconnectedCallback or visibility flip can still tear it down.
        this._player = player;
        player.setup(buildConfig(streamname)).catch((error) => {
          console.error('nano-player: setup failed', error);
        });
      } catch (error) {
        console.error('nano-player: constructor failed', error);
      }
    }

    _destroyPlayer() {
      if (!this._player) return;
      try {
        this._player.destroy();
      } catch (error) {
        console.error('nano-player: destroy failed', error);
      }
      this._player = null;
    }
  }

  // Defining the custom element only after the document is parsed avoids
  // a race seen via the CDN app-loader: under slow network, app.js (which
  // boots Elm and renders <nano-player>) can finish before the parser has
  // settled, and the element slips through Elm's DOM patcher without ever
  // triggering an upgrade. Wait for DOMContentLoaded, then define +
  // explicitly upgrade anything already in the tree as a belt-and-braces
  // catch for elements Elm inserted while we were waiting.
  function registerNanoPlayer() {
    if (!customElements.get('nano-player')) {
      customElements.define('nano-player', NanoPlayerElement);
    }
    if (typeof customElements.upgrade === 'function' && document.body) {
      customElements.upgrade(document.body);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerNanoPlayer);
  } else {
    registerNanoPlayer();
  }
})();
