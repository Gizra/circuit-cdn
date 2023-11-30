  // app-loader.js
  (function() {
    // URL of your CDN / server hosting the manifest and build files
    var baseUrl = 'https://cdn.circuitauction.com/stable/user-ui/';

    // Fetch the manifest file
    fetch(baseUrl + 'manifest.json')
      .then(function(response) {
        return response.json();
      })
      .then(function(manifest) {
        // Dynamically load the main JavaScript file
        var mainScript = document.createElement('script');
        mainScript.src = baseUrl + manifest['main.js']; // Adjust depending on how your manifest structure looks
        mainScript.async = true;
        document.body.appendChild(mainScript);

        // Similarly, you can load other assets like CSS here
        // For example, if you have a main CSS file:
        var mainCss = document.createElement('link');
        mainCss.href = baseUrl + manifest['main.css']; // Adjust for your manifest
        mainCss.rel = 'stylesheet';
        document.head.appendChild(mainCss);
      })
      .catch(function(error) {
        console.error('Failed to load the manifest or main script:', error);
      });
  })();
