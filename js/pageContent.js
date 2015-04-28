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
    
    if(request === 'isActiveRdioSessionTab') {
        handleIsActiveRdioSessionRequest(sendResponse);
    }

    if(request.command) {
        handleCommandRequest(request.command);
    }

    if(request === 'playHereInstead') {
        handlePlayHereInsteadRequest();
    }
});

function handleIsActiveRdioSessionRequest(sendResponseCallback) {
    var currentSessionStatus = getCurrentSessionStatus();
    if(currentSessionStatus.isActiveRdioSession) {
        connectToExtensionAndSendAudioInfo();
    }
    sendResponseCallback(currentSessionStatus);
}

function handleCommandRequest(commandString) {
    var $commandButton = $(commandButtonSelectors[commandString]);
    $commandButton.click();
}

function handlePlayHereInsteadRequest() {
    var $playHereInsteadButton = $('.remote_controls span.blue.button.has_icon');
    var $playPausebutton = $(commandButtonSelectors.playpause);
    $playHereInsteadButton.click();
    $playPauseButton.click();
    connectToExtensionAndSendAudioInfo();
}

function connectToExtensionAndSendAudioInfo() {
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
    var response = {active: isActiveRdioSessionTab()};
    var songTitle;
    var artistTile;

    if(response.active) {
        response.songTitle = $('.player_bottom .song_title').text();
        response.artistTitle = $('.drag_container .artist_title').text();
        response.time = $('.player_bottom .time').text();
        response.duration = $('.player_bottom .duration').text();
        response.albumArtUrl = $('.player_bottom .right_controls .queue_art')[0].src;
        response.currentlyPlaying = $('.player_bottom .play_pause').hasClass('playing');
        response.backgroundImageUrl = getBackgroundImageUrl();
    }

    return response;
}

function getBackgroundImageUrl() {
    var $loadedBackgroundElement = $('.buffer_a').hasClass('loaded') ? $('.buffer_a') : $('.buffer_b');
    var backgroundImageUrl = $loadedBackgroundElement.css('background-image').replace('url(','').replace(')','');
    return backgroundImageUrl
}

function getCurrentSessionStatus() {
    var isRdioSession = $('.player_bottom').length > 0;
    var isPlayingElsewhere = $('.remote_controls').is(':visible');
    var isActiveRdioSession = isRdioSession && !isPlayingElsewhere;    
    
    var sessionStatus = {
        isRdioSession: isRdioSession,
        isPlayingElsewhere: isPlayingElsewhere,
        isActiveRdioSession: isActiveRdioSession
    };

    return sessionStatus;
}

function isActiveRdioSessionTab() {
    return getCurrentSessionStatus().isActiveRdioSession === true;    
}