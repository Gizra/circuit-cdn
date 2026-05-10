// Get the selected language from the query param, or from the local storage.
// When both empty, English is set as default in App.Utils.decodeLanguageCode.
const urlParams = new URLSearchParams(window.location.search);
const languageCode = urlParams.get('language') || localStorage.getItem('languageCode') || '';

// `<meta id="circuit-setup">` carries the configured hostname/sitename for the
// serverless /get-config call. The meta hostname can differ from
// window.location.hostname (e.g. backoffice.ddev.site → test-americana...).
const circuitSetupMeta = document.getElementById('circuit-setup');
const siteName = (circuitSetupMeta && circuitSetupMeta.getAttribute('site')) || '';
const metaHostname = (circuitSetupMeta && circuitSetupMeta.getAttribute('hostname')) || window.location.hostname;
if (!siteName) {
    console.error('Circuit config - No site name found in the DOM.');
}

var elmApp = Elm.Main.fullscreen({
    accessToken: localStorage.getItem('bs_access_token') || '',
    hostname: window.location.hostname,
    metaHostname: metaHostname,
    siteName: siteName,
    languageCode: languageCode,
    // Pass the location, which might have an `origin` query string, that
    // indicates the base url of the host, in case the app is loaded as an
    // IFrame.
    parentBaseUrl: window.location.href
});

// Keep the clerk-page keyboard shortcuts (Space / arrows) responsive
// when focus drifts off the page. Three failure modes are covered:
//   1. Form submitted via Enter — the input/button retains focus.
//   2. The focused input is removed from the DOM by a re-render
//      (e.g., placing a bid hides the "Change Opening Price" form,
//      so focus drops to <body>).
//   3. User clicks empty space outside any focusable element.
// The keydown listener lives on #app, so once focus moves off #app's
// subtree, keydowns stop bubbling to it and Space/arrows no longer
// fire (Space then scrolls the page instead of placing a bid). We
// bounce focus back to #app in all three cases.
function returnFocusToApp() {
    setTimeout(function () {
        var app = document.getElementById('app');
        if (!app) return;
        var active = document.activeElement;
        // Already on #app or a descendant — nothing to do.
        if (active && (active === app || app.contains(active))) return;
        // Focus is on body / html / null — pull it back to #app so
        // page-level keydowns keep firing.
        if (!active || active === document.body || active === document.documentElement) {
            app.focus();
        }
    }, 0);
}

document.addEventListener('submit', function () {
    var active = document.activeElement;
    if (active && active !== document.body) {
        active.blur();
    }
    returnFocusToApp();
});

// focusout fires when any element loses focus to a new target. By the
// time the setTimeout in returnFocusToApp runs, document.activeElement
// has settled — we only act if it's body / html / null.
document.addEventListener('focusout', returnFocusToApp);

// Pre-anchor focus to #app on every shortcut keystroke. Without this,
// pressing Space while focus is on a form input that subsequently gets
// removed by Elm's re-render (e.g., placing a bid hides the
// "Change Opening Price" form) leaves activeElement on <body>, and
// the next Space never bubbles to #app — it scrolls the page instead.
//
// We can't wait for the re-render to settle and then refocus
// (focusout doesn't reliably fire for removed elements; setTimeout(0)
// runs before Elm's rAF render so activeElement still looks fine).
// Doing it synchronously inside the capture-phase keydown handler is
// race-free: the event's propagation path was already determined at
// dispatch time, so calling app.focus() now doesn't disturb this
// keystroke (it still bubbles to #app and the bid is placed) — it
// just re-anchors focus for the *next* keystroke.
//
// Only triggers for the keys we actually own. Arrow keys are only
// re-anchored when focus is outside a form field, so cursor
// navigation inside inputs (left/right within text, up/down in
// number/textarea) keeps working. Space is always re-anchored because
// our shortcut policy is "Space always places the bid, even from
// within an input".
var SHORTCUT_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
var FORM_FIELD_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

// Mirror the App/View.elm decoder rules: re-anchor focus to #app only
// for keys that actually fire a shortcut from the current target.
//   - Right / Left: always re-anchor (cycle status from anywhere).
//   - Space: re-anchor only outside a form field, OR when the focused
//     input is #opening-price-input. Every other input keeps Space as
//     a regular typed space — paused/public message, jump-to-lot,
//     edit winning bidder, custom-bid amount.
//   - Up / Down: re-anchor only outside a form field (cursor /
//     number-stepper behaviour stays intact inside inputs).
function shouldAnchorAppFocusFor(code, activeEl) {
    var tag = (activeEl && activeEl.tagName) || '';
    var inFormField = FORM_FIELD_TAGS.indexOf(tag) !== -1;
    if (code === 'ArrowLeft' || code === 'ArrowRight') return true;
    if (code === 'Space') {
        return !inFormField || (activeEl && activeEl.id === 'opening-price-input');
    }
    // ArrowUp / ArrowDown
    return !inFormField;
}

document.addEventListener('keydown', function (e) {
    if (SHORTCUT_KEYS.indexOf(e.code) === -1) return;
    var app = document.getElementById('app');
    if (!app) return;
    if (document.activeElement === app) return;
    if (!shouldAnchorAppFocusFor(e.code, document.activeElement)) return;
    app.focus();
}, true);

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

var cssLoaded = false;
elmApp.ports.loadBackofficeCSS.subscribe(function(backendOfficeUrl) {
  if (cssLoaded) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = backendOfficeUrl + '/css/live.css';
  document.head.appendChild(link);
  cssLoaded = true;
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

// Handle browser detection ports
if (elmApp.ports.getUserAgent) {
    elmApp.ports.getUserAgent.subscribe(function() {
        const userAgent = navigator.userAgent;
        elmApp.ports.receiveUserAgent.send(userAgent);
    });
}

// Send browser info immediately when the app starts
if (elmApp.ports.receiveUserAgent) {
    elmApp.ports.receiveUserAgent.send(navigator.userAgent);
}