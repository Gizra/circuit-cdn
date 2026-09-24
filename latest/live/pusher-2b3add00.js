// One Pusher connection for all the channels of the current page. A single
// socket keeps the events of the sale channel and of the user channel in
// the order Pusher sends them, and gives the app one connection state to
// watch instead of one per channel.
var pusherInstance = null;
var pingTimer = null;
var pingSentAt = null;

// Detect a half-open socket quickly: ping after 30s without traffic and give
// up on the pong after 10s, so a dead connection is noticed in about 40s
// instead of the library's ~2 minutes default. Pusher may lower the
// activity timeout further, never raise it.
var PUSHER_ACTIVITY_TIMEOUT_MS = 30000;
var PUSHER_PONG_TIMEOUT_MS = 10000;

// Round trip measurement of the WebSocket itself, independent of the
// backend: a `pusher:ping` is answered by `pusher:pong`.
var PUSHER_PING_INTERVAL_MS = 20000;

elmApp.ports.pusherLogout.subscribe(function() {

  // Unbind existing channels.
  unbindPusherChannels();

});

elmApp.ports.pusherLogin.subscribe(function(config) {

    // Unbind existing channels.
    unbindPusherChannels();

    var pusher = new Pusher(config.key, {
        cluster: config.cluster,
        authEndpoint: config.authEndpoint,
        activityTimeout: PUSHER_ACTIVITY_TIMEOUT_MS,
        pongTimeout: PUSHER_PONG_TIMEOUT_MS
    });
    pusherInstance = pusher;

    pusher.connection.bind('error', function(error) {
        // Pusher emits several error shapes: protocol errors carry
        // `{ data: { code, message } }` directly on the error,
        // wrapped WebSocket errors nest it under `error.error`, and
        // low-level connection errors may have neither. The Elm
        // port expects { code : Maybe Int, message : Maybe String },
        // so anything else must collapse to null.
        var details = (error && error.error) || error || {};
        var data = details.data || {};
        elmApp.ports.pusherError.send({
            message: typeof data.message === 'string' ? data.message : null,
            code: typeof data.code === 'number' ? data.code
                : (typeof details.code === 'number' ? details.code : null)
        });
    });

    pusher.connection.bind('state_change', function(states) {
        elmApp.ports.pusherState.send({
            previous: states.previous,
            current: states.current,
            socketId: pusher.connection.socket_id || null
        });
    });

    // Measure the socket round trip with the protocol's own ping/pong.
    pusher.connection.bind('message', function(message) {
        if (message && message.event === 'pusher:pong' && pingSentAt !== null) {
            elmApp.ports.pusherPong.send(performance.now() - pingSentAt);
            pingSentAt = null;
        }
    });

    pusher.connection.bind('connected', function() {
        clearInterval(pingTimer);
        pingTimer = setInterval(function() {
            if (pusher.connection.state !== 'connected') {
                return;
            }
            pingSentAt = performance.now();
            pusher.send_event('pusher:ping', {});
        }, PUSHER_PING_INTERVAL_MS);
    });

    // Bind channels specified at config.
    config.channelNames.forEach(function(channelName) {
        var channel = pusher.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', function() {
            elmApp.ports.pusherChannelState.send({
                channel: channelName,
                status: 'subscribed',
                code: null,
                message: null
            });
        });

        channel.bind('pusher:subscription_error', function(error) {
            // pusher-js 7+ passes { type, error, status }; older versions
            // passed the HTTP status as a number.
            var status = (error && typeof error.status === 'number') ? error.status
                : (typeof error === 'number' ? error : null);
            var message = (error && (error.error || error.type)) || null;
            elmApp.ports.pusherChannelState.send({
                channel: channelName,
                status: 'error',
                code: status,
                message: typeof message === 'string' ? message : null
            });
        });

        // Every event of the channel goes to Elm, not only the names in
        // config.eventNames: the bridge numbers ALL the events it sends on a
        // channel (`data._cseq`), and Elm counts the missed ones from that
        // numbering, so an unbound event would look like a lost one. Elm
        // routes the names its pages know and only records the others.
        channel.bind_global(function(eventName, data) {
            if (typeof eventName !== 'string' || eventName.indexOf('pusher:') === 0 || eventName.indexOf('pusher_internal:') === 0) {
                // Protocol events (subscription succeeded, member added...).
                return;
            }

            if (eventName == 'force_reload') {
                // Reload a page, after a random delay -- so all the reloading clients will
                // not hit the server on the exact same time.
                var seconds = Math.floor((Math.random() * 20) + 1);
                setTimeout(function() {
                    location.reload();
                }, seconds * 1000);
                return;
            }

            if (data === null || typeof data !== 'object') {
                // Not a JSON object payload (nothing the app decodes): keep the
                // envelope shape Elm expects.
                data = { value: data };
            }

            // Add a local timestamp of this specific client.
            data.clientTimestamp = Date.now();

            var event = {
                eventType: eventName,
                channel: channelName,
                data: data
            };

            // Uncomment to debug.
            // console.log(data, eventName);

            elmApp.ports.pusherIncomingEvents.send(event);
        });
    });

});

// Drop the socket and connect again; pusher-js re-subscribes the channels
// on its own. Elm asks for this when it has decided the connection is
// unhealthy (see Pusher.Health).
elmApp.ports.pusherReconnect.subscribe(function() {
    if (pusherInstance) {
        pusherInstance.disconnect();
        pusherInstance.connect();
    }
});

// A tab coming back from the background may hold a socket the browser
// starved or dropped. Ask it right away: a ping makes pusher-js notice a
// dead socket within its pong timeout (10s) instead of the activity
// timeout (40s), and a socket already known to be down is reconnected.
// No teardown of a live socket -- hundreds of phones unlock at once.
document.addEventListener('visibilitychange', function() {
    if (document.hidden || !pusherInstance) {
        return;
    }
    if (pusherInstance.connection.state === 'connected') {
        pingSentAt = performance.now();
        pusherInstance.send_event('pusher:ping', {});
    } else {
        pusherInstance.connect();
    }
});

function unbindPusherChannels() {
    clearInterval(pingTimer);
    pingTimer = null;
    pingSentAt = null;
    if (pusherInstance) {
        pusherInstance.disconnect();
        pusherInstance = null;
    }
}
