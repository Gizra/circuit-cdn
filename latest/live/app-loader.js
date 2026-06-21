
(function() {
    const unifiedHash = '33d7e27e';

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        script.onerror = function() {
            console.error('Failed to load script:', src);
        };
        document.head.appendChild(script);
    }

    function loadStyle(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onerror = function() {
            console.error('Failed to load stylesheet:', href);
        };
        document.head.appendChild(link);
    }

    const cdnUrl = 'https://cdn.circuitauction.com/latest/live';
    const styleUrl = `${cdnUrl}/style-${unifiedHash}.css`;
    const versionJsUrl = `${cdnUrl}/version-${unifiedHash}.js`;
    const mainJsUrl = `${cdnUrl}/Main-${unifiedHash}.js`;
    const appJsUrl = `${cdnUrl}/app-${unifiedHash}.js`;
    const pusherJsUrl = `${cdnUrl}/pusher-${unifiedHash}.js`;
    const nanoPlayerJsUrl = `${cdnUrl}/nano-player-${unifiedHash}.js`;
    // The nanocosmos SDK is loaded statically from index-cdn.html (in
    // <head>) so window.NanoPlayer is already defined by the time this
    // loader fetches the nano-player.js wrapper.

    // Load stylesheet
    loadStyle(styleUrl);

    function bootApp() {
        // version.js sets window.APP_VERSION; load it first so the value
        // is on the global before app.js reads it for the Elm flag.
        loadScript(versionJsUrl, function() {
            console.log('version.js loaded');
            loadScript(mainJsUrl, function() {
                console.log('Main.js loaded');
                // Register the <nano-player> custom element BEFORE app.js
                // boots Elm — once Elm renders any <nano-player> nodes
                // they need the element to be defined or they won't
                // upgrade. The nanocosmos SDK is already on window from
                // the static <script> in <head>.
                loadScript(nanoPlayerJsUrl, function() {
                    console.log('nano-player.js loaded');
                    loadScript(appJsUrl, function() {
                        console.log('app.js loaded');
                        loadScript(pusherJsUrl, function() {
                            console.log('pusher.js loaded');
                            console.log('All scripts loaded');
                        });
                    });
                });
            });
        });
    }

    // Don't start the script chain until the parser has settled. The
    // chain ends with app.js, which boots Elm — without this gate, under
    // slow networks Elm can render <nano-player> against an unsettled
    // DOM and the custom-element upgrade gets skipped.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootApp);
    } else {
        bootApp();
    }
})();
  