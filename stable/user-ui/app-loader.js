// app-loader.js
(function() {
  var baseUrl = 'https://cdn.circuitauction.com/stable/user-ui';

  // Function to dynamically load scripts
  function loadScript(src, defer) {
    var script = document.createElement('script');
    script.src = src;
    script.defer = defer;
    document.head.appendChild(script);
  }

  // Function to dynamically load stylesheets
  function loadStylesheet(href) {
    var link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  // Load manifest.json and then load assets as defined in it
  fetch(baseUrl + 'manifest.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(manifest) {
      // Load main JS and CSS
      loadScript(baseUrl + manifest['main.js'], true);
      loadStylesheet(baseUrl + manifest['main.css']);

      // Other assets can be loaded similarly
      // Example: Favicon, apple-touch-icon, etc.
      var linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.href = baseUrl + 'favicon.ico';
      document.head.appendChild(linkIcon);

      var linkAppleIcon = document.createElement('link');
      linkAppleIcon.rel = 'apple-touch-icon';
      linkAppleIcon.href = baseUrl + 'logo192.png';
      document.head.appendChild(linkAppleIcon);

      var linkManifest = document.createElement('link');
      linkManifest.rel = 'manifest';
      linkManifest.href = baseUrl + 'manifest.json';
      document.head.appendChild(linkManifest);
    })
    .catch(function(error) {
      console.error('Failed to load the manifest or assets:', error);
    });
})();
