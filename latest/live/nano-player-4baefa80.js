// Custom element wrapping NanoPlayer v5.
//
// Mounts a nanocosmos h5live player given a `streamname` attribute (a bintu
// streamname like "SbYkH-XATMg" — never a UUID). Two <nano-player> instances
// may live on the same page (desktop sidebar + mobile copy on the bidder
// sale view), so each instance gets its own unique target-div id.
//
// Lifecycle:
//   connectedCallback        — create target div + initial setup.
//   attributeChangedCallback — when streamname changes, destroy + re-setup.
//   disconnectedCallback     — destroy.
//
// Player config is fixed: every value is a deliberate latency / autoplay
// choice tuned for live auctioneering (fastadaptive + MoQ + single-entry
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
    }

    connectedCallback() {
      this._connected = true;

      // Create the target div the SDK mounts into. Same div is reused
      // across attribute changes — only the player instance is torn
      // down and rebuilt.
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

      this._setup();
    }

    disconnectedCallback() {
      this._connected = false;
      this._destroyPlayer();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name !== 'streamname') return;
      if (!this._connected) return;
      if (oldValue === newValue) return;

      // Streamname changed mid-session (sale switch). Tear down the
      // existing player and rebuild against the new stream.
      this._destroyPlayer();
      this._setup();
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
        // disconnectedCallback can still tear it down.
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

  if (!customElements.get('nano-player')) {
    customElements.define('nano-player', NanoPlayerElement);
  }
})();
