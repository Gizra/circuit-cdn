
(function() {
    const unifiedHash = 'b02e89b7';

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
    const mainJsUrl = `${cdnUrl}/Main-${unifiedHash}.js`;
    const appJsUrl = `${cdnUrl}/app-${unifiedHash}.js`;
    const pusherJsUrl = `${cdnUrl}/pusher-${unifiedHash}.js`;

    // Load stylesheet
    loadStyle(styleUrl);

    // Load scripts in order
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
})();
  