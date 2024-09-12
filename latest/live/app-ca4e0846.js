// Get the selected language from the query param, or from the local storage.
// When both empty, English is set as default in App.Utils.decodeLanguageCode.
const urlParams = new URLSearchParams(window.location.search);
const languageCode = urlParams.get('language') || localStorage.getItem('languageCode') || '';

var elmApp = Elm.Main.fullscreen({
    accessToken: localStorage.getItem('bs_access_token') || '',
    hostname: window.location.hostname,
    languageCode: languageCode,
    // Pass the location, which might have an `origin` query string, that
    // indicates the base url of the host, in case the app is loaded as an
    // IFrame.
    parentBaseUrl: window.location.href
});

elmApp.ports.saveAccessToken.subscribe(function(accessToken) {
    localStorage.setItem('bs_access_token', accessToken);
});

elmApp.ports.clearAccessToken.subscribe(function() {
    localStorage.removeItem('bs_access_token');
});


Offline.on('down', function() {
    elmApp.ports.offline.send(true);
});

Offline.on('up', function() {
    elmApp.ports.offline.send(false);
});

var sendSignalOnUserLoggedIn = false;

elmApp.ports.userTryLogin.subscribe(function() {
    sendSignalOnUserLoggedIn = true;
});

elmApp.ports.userLoggedIn.subscribe(function(uuid) {
    if (!!sendSignalOnUserLoggedIn) {
        // Indicate top window to reload, only if the user has tried to login themself.
        // That is, we are not in the middle of a page refresh where we already have a valid
        // access token.
        var message = {
            cmd: 'userLoggedIn',
            uuid: uuid
        };
        window.top.postMessage(message, '*');
    }
});

elmApp.ports.userLoggedOut.subscribe(function() {
    // Indicate top window to reload.
    var message = {
        cmd: 'userLoggedOut'
    };
    window.top.postMessage(message, '*');
});

elmApp.ports.delayedReload.subscribe(function() {
    // Reload a page, after a random delay -- so all the reloading clients will
    // not hit the server on the exact same time.
    var seconds = Math.floor((Math.random() * 20) + 1);
    setTimeout(function() {
        location.reload();
    }, seconds * 1000);
});

elmApp.ports.immediateReload.subscribe(function() {
    // Reload a page with no delay.
    location.reload();
});

elmApp.ports.focus.subscribe(function(id) {
    // @todo: For some reason we don't get the ID from Elm. For now however we
    // need to use it only on a single input, so we hardcode the value.
    id = 'opening-price-input';
    var doFocus = function(selector, id) {
        var element = document.querySelector(selector);
        if (!element) {
            // Element doesn't exist yet.
            return false;
        }

        element.focus();
    };
    waitForElement('#' + id, doFocus, id);
});

elmApp.ports.playSoundOnLiveBid.subscribe(function () {
  // Invoking this multiple times in a row sometimes "fakes" the play action
  // in Chrome, it claims to play the sound when it actually doesn't.
  // Wrapping it with a `setTimeout()` somehow solves this bug in most cases,
  // even with 1 ms delay as we do.
  setTimeout(function () {
    // Only the Auctioneer has the audio.
    var audio = document.getElementById('place-bid-audio');
    if (!!audio) {
      var playPromise = audio.play();
      if (playPromise === undefined) {
        // The `play()` might return either a Promise or void.
        return;
      }
      playPromise.then(function () {
        // Autoplay started!
      }).catch(function (error) {
        // Autoplay was prevented.
        console.log('FAILED to play the sound', error);
      });
    }
  }, 1);
});

elmApp.ports.loadBackofficeCSS.subscribe(function(backendOfficeUrl) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = backendOfficeUrl + '/css/live.css';
  document.head.appendChild(link);
});

window.onmessage = function(e) {
    if (e.data.hasOwnProperty('eventName') && e.data.eventName == 'resetUserBlock') {
        // Feed the siteName back to Elm.
        elmApp.ports.resetUserBlock.send(e.data.siteName);
    }
};


/**
 * Wait for selector to appear before invoking related functions.
 */
function waitForElement(selector, fn, model, tryCount) {

    // Repeat the timeout only maximum 5 times, which sohuld be enough for the
    // element to appear.
    tryCount = tryCount || 5;
    --tryCount;
    if (tryCount == 0) {
        return;
    }

    setTimeout(function() {

        var result = fn.call(null, selector, model, tryCount);
        if (!result) {
            // Element still doesn't exist, so wait some more.
            waitForElement(selector, fn, model, tryCount);
        }
    }, 50);
}
