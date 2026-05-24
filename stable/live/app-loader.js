
(function() {
    const unifiedHash = '7d9222e8';

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

    const cdnUrl = 'https://cdn.circuitauction.com/stable/live';
    const styleUrl = `${cdnUrl}/style-${unifiedHash}.css`;
    const versionJsUrl = `${cdnUrl}/version-${unifiedHash}.js`;
    const mainJsUrl = `${cdnUrl}/Main-${unifiedHash}.js`;
    const appJsUrl = `${cdnUrl}/app-${unifiedHash}.js`;
    const pusherJsUrl = `${cdnUrl}/pusher-${unifiedHash}.js`;

    // Load stylesheet
    loadStyle(styleUrl);

    // version.js sets window.APP_VERSION; load it first so the value
    // is on the global before app.js reads it for the Elm flag.
    loadScript(versionJsUrl, function() {
        console.log('version.js loaded');
        loadScript(mainJsUrl, function() {
            console.log('Main.js loaded');
            loadScript(appJsUrl, function() {
                console.log('app.js loaded');
                loadScript(pusherJsUrl, function() {
                    console.log('pusher.js loaded');
                    console.log('All scripts loaded');
                });
            });
        });
    });
})();
  