var pusherConnections = [];

elmApp.ports.pusherLogout.subscribe(function() {

  // Unbind existing channels.
  unbindPusherChannels();

});

elmApp.ports.pusherLogin.subscribe(function(config) {

    // Unbind existing channels.
    unbindPusherChannels();

    // Bind channels specified at config.
    config.channelNames.forEach(function(channelName) {
        var pusher = new Pusher(config.key, {
            cluster: config.cluster,
            authEndpoint: config.authEndpoint
        });

        pusherConnections.push(pusher);

        pusher.connection.bind('error', function(error) {
            elmApp.ports.pusherError.send({
                message: error.error.data.message ? error.error.data.message : null,
                code: error.error.code ? error.error.code : null
            });
        });

        pusher.connection.bind('state_change', function(states) {
            elmApp.ports.pusherState.send(states.current);
        });

        if (!pusher.channel(channelName)) {
            var channel = pusher.subscribe(channelName);

            config.eventNames.forEach(function(eventName) {
                channel.bind(eventName, function(data) {
                    // Add a local timestamp of this specific client.
                    data.clientTimestamp = Date.now();

                    var event = {
                        eventType: eventName,
                        data: data
                    };

                    // Uncomment to debug.
                    // console.log(data, eventName);

                    if (eventName == 'force_reload') {
                        // Reload a page, after a random delay -- so all the reloading clients will
                        // not hit the server on the exact same time.
                        var seconds = Math.floor((Math.random() * 20) + 1);
                        setTimeout(function() {
                            location.reload();
                        }, seconds * 1000);

                    } else {
                        elmApp.ports.pusherIncomingEvents.send(event);
                    }

                });
            });
        }
    });

});

function unbindPusherChannels() {
  while (pusherConnections.length > 0) {
    channel = pusherConnections.pop();
    channel.disconnect();
  }
}
