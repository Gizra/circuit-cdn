// app-loader.js
(function() {
  // Base URL for the assets.
  // Choose between stable and latest folder based on the URL or a specific variable
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

  // Helper function to get full URL (handles both relative and absolute paths)
  function getFullUrl(path) {
    // If path already starts with http:// or https://, return as-is
    if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) {
      return path;
    }
    // Otherwise, prepend baseUrl
    return baseUrl + path;
  }

  // Load manifest.json and then load assets as defined in it
  fetch(baseUrl + '/manifest.json')
    .then(function(response) {
      return response.json();
    })
    .then(function(manifest) {
      // Load main JS and CSS
      loadScript(getFullUrl(manifest['main.js']), true);
      loadStylesheet(getFullUrl(manifest['main.css']));

      var linkManifest = document.createElement('link');
      linkManifest.rel = 'manifest';
      linkManifest.href = baseUrl + '/manifest.json';
      document.head.appendChild(linkManifest);
    })
    .catch(function(error) {
      console.error('Failed to load the manifest or assets:', error);
    });
})();
