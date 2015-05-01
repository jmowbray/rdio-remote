/**
*
* This is the script that executed on every single page while the extension is running.
*
*/
var commandButtonSelectors = {
    prev: '.left_controls button.prev',
    playpause: '.left_controls button.play_pause',
    next: '.left_controls button.next',
    shuffle: '.shuffle',
    repeat: '.repeat'
};

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    
    if(request === 'isActiveRdioSessionTab') {
        handleIsActiveRdioSessionRequest(sendResponse);
    }

    if(request.command) {
        handleCommandRequest(request.command);
    }

    if(request === 'playHereInsteadRequest') {
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
    var $playPauseButton = $(commandButtonSelectors.playpause);
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
    var shuffleAndRepeatInfo;

    if(response.active) {
        response.songTitle = $('.player_bottom .song_title').text();
        response.artistTitle = $('.drag_container .artist_title').text();
        response.time = $('.player_bottom .time').text();
        response.duration = $('.player_bottom .duration').text();
        response.albumArtUrl = $('.player_bottom .right_controls .queue_art')[0].src;
        response.currentlyPlaying = $('.player_bottom .play_pause').hasClass('playing');
        response.backgroundImageUrl = getBackgroundImageUrl();

        shuffleAndRepeatInfo = getShuffleAndRepeatInfo();
        response.shuffle = shuffleAndRepeatInfo.shuffle;
        response.repeat = shuffleAndRepeatInfo.repeat;
    }

    return response;
}

function getShuffleAndRepeatInfo() {
    var shuffleControl = $(commandButtonSelectors.shuffle);
    var shuffleOpacity = shuffleControl.is(':visible') ? shuffleControl.css('opacity') : 0;
    var repeatControl = $(commandButtonSelectors.repeat);
    var repeatOpacity = repeatControl.is(':visible') ? repeatControl.css('opacity') : 0;
    var isRepeatOne = repeatControl.hasClass('one');

    var shuffleInfo = {opacity: shuffleOpacity};
    var repeatInfo = {opacity: repeatOpacity, isRepeatOne: isRepeatOne};

    return {shuffle: shuffleInfo, repeat: repeatInfo};
}

function getBackgroundImageUrl() {
    var $loadedBackgroundElement = $('.buffer_a').hasClass('loaded') ? $('.buffer_a') : $('.buffer_b');
    var backgroundImageUrl = $loadedBackgroundElement.css('background-image').replace('url(','').replace(')','');
    return backgroundImageUrl
}

function getCurrentSessionStatus() {
    var isRdioSession = $('.player_bottom').length > 0;
    var isPlayingElsewhere = $('.remote_controls').is(':visible');
    var noTrack = $('.no_track_text').length > 0 && $('.no_track_text').is(':visible');
    var isActiveRdioSession = isRdioSession && !isPlayingElsewhere && !noTrack;       
    
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