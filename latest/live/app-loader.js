
(function() {
    const unifiedHash = 'bb22368b';

    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }

    function loadStyle(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    const cdnUrl = 'https://cdn.circuitauction.com/stable/live';
    const mainJsUrl = `${cdnUrl}/Main-${unifiedHash}.js`;
    const styleUrl = `${cdnUrl}/style-${unifiedHash}.css`;
    const pusherUrl = `${cdnUrl}/pusher-${unifiedHash}.js`;
    const appJsUrl = `${cdnUrl}/app-${unifiedHash}.js`;

    loadStyle(styleUrl);

    loadScript(mainJsUrl, function() {
        loadScript(pusherUrl, function() {
            loadScript(appJsUrl, function() {
                const app = Elm.Main.init({
                    node: document.getElementById('elm-app-container')
                });
            });
        });
    });
})();
  