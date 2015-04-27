/**
*
* This is the script that executed on every single page while the extension is running.
*
*/
var commandButtonSelectors = {
    prev: 'button.prev',
    playpause: 'button.play_pause',
    next: 'button.next'
};

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if(request === 'lookingForCurrentRdioTab' && isCurrentRdioTab()) {
        sendResponse(true);
        openPortAndSendAudioInfo();
    }

    if(request.command) {
        handleCommand(request.command);
    }
});

function handleCommand(commandString) {
    var $commandButton = $(commandButtonSelectors[commandString]);
    $commandButton.click();
}

function openPortAndSendAudioInfo() {
    var port = chrome.runtime.connect({name: 'rdio_remote'});

    port.postMessage(getCurrentAudioInfo());
    var intervalId = setInterval(function() {
        port.postMessage(getCurrentAudioInfo());
    }, 1000);

    port.onDisconnect.addListener(function(disconnectedPort){
        clearInterval(intervalId);
    });
}

function getCurrentAudioInfo() {
    var response = {current: isCurrentRdioTab()};
    var songTitle;
    var artistTile;

    if(response.current) {
        response.songTitle = $('.player_bottom .song_title').text();
        response.artistTitle = $('.drag_container .artist_title').text();
        response.time = $('.player_bottom .time').text();
        response.duration = $('.player_bottom .duration').text();
        response.albumArtUrl = $('.player_bottom .right_controls .queue_art')[0].src;
        response.currentlyPlaying = $('.player_bottom .play_pause').hasClass('playing');
        //response.backgroundImageUrl = $('.buffer_a, loaded').css('background-image').replace('url(','').replace(')','');
    }

    return response;
}

function isCurrentRdioTab() {
    var isCurrentRdioTab = false;
    var hasPlayerBottom;
    var hasRemoteControls;
    if(location.host === 'www.rdio.com') {
        hasPlayerBottom = $('.player_bottom').length > 0;
        hasRemoteControls = $('.remote_controls').is(':visible');
        isCurrentRdioTab = hasPlayerBottom && !hasRemoteControls;
    }
    return isCurrentRdioTab;
}

