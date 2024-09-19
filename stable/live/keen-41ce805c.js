var client = null;

elmApp.ports.keenConnect.subscribe(function(data) {
    var env = data[0];
    var config = data[1];
    client = new Keen({
        projectId: config.projectId,
        writeKey: config.writeKey
    });


    // Sale page.

    // Record an event.
    var recordEvent = function(eventName, data) {
        // Add the enviorment.
        data.env = env;
        client.recordEvent(eventName, data);
    }

    elmApp.ports.keenPlaceBid.subscribe(function(data) {
        recordEvent('keenPlaceBid', data);
    });

    elmApp.ports.keenPlaceBidMouseEnter.subscribe(function(data) {
        recordEvent('placeBidMouseEnter', data);
    });

    elmApp.ports.keenPlaceBidMouseLeave.subscribe(function(data) {
        recordEvent('placeBidMouseLeave', data);
    });

    elmApp.ports.keenSliderNextItem.subscribe(function(data) {
        recordEvent('keenSliderNextItem', data);
    });

    elmApp.ports.keenSliderPreviousItem.subscribe(function(data) {
        recordEvent('keenSliderPreviousItem', data);
    });

});
