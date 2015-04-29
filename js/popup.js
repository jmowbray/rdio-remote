document.addEventListener('DOMContentLoaded', function() {
    bindDomListeners();
    init();
});

function bindDomListeners() {
    $('.js-command-btn').on('click', handleCommandButtonClicked);
    $('.js-album-art').on('click', handleAlbumArtClicked);
    $('.js-play-here-btn').on('click', handlePlayHereInsteadButtonClicked)
}

function handleCommandButtonClicked(buttonClickEvent) {
    var clickedButton = $(buttonClickEvent.currentTarget);
    sendButtonRequest(clickedButton);
}

function handleAlbumArtClicked(imgClickEvent) {
    makeActiveSessionTabActive();
}

function makeActiveSessionTabActive() {
    var activeSessionTabId = parseInt($('.js-active-rdio-tab-id').text());
    chrome.tabs.update(activeSessionTabId, {active: true}, function(activeSessionTab) {
        chrome.windows.update(activeSessionTab.windowId, {focused: true});
    });
}

function handlePlayHereInsteadButtonClicked(buttonClickEvent) {
    sendPlayHereInsteadRequest();
}

function sendPlayHereInsteadRequest() {
    var activeSessionTabId = parseInt($('.js-active-rdio-tab-id').text());
    chrome.tabs.sendMessage(activeSessionTabId, 'playHereInsteadRequest');
}

function sendButtonRequest(button) {
    var activeSessionTabId = parseInt($('.js-active-rdio-tab-id').text());
    var command = $(button).data('command')

    chrome.tabs.sendMessage(activeSessionTabId, {command: command});
}

function init() {
    chrome.tabs.query({url: '*://*.rdio.com/*'}, function(rdioTabs) {
        if(rdioTabs.length) {
            sendIsActiveSessionRequestToAllRdioTabs(rdioTabs);
        } else {
            showNoRdioSessionFound();
        }
    });
}

function sendIsActiveSessionRequestToAllRdioTabs(rdioTabs) {
    var sendTabMessageDeferreds = [];
    var allSessionStatuses;
    var atLeastOneIsActiveSession;
    var firstPlayElsewhereTab;
    
    _.each(rdioTabs, function(rdioTab) {
        sendTabMessageDeferreds.push(sendTabMessageDeferred(rdioTab.id, 'isActiveRdioSessionTab'));
    });

    $.when.apply($, sendTabMessageDeferreds).then(function() {
        allSessionStatuses = arguments;
        console.log('all', allSessionStatuses);
        atLeastOneIsActiveSession = _.findWhere(allSessionStatuses, {isActiveRdioSession: true});
        firstPlayElsewhereTab = _.findWhere(allSessionStatuses, {isPlayingElsewhere: true});

        if(!atLeastOneIsActiveSession) {
            if(firstPlayElsewhereTab) {
                showPlayingElsewhere(firstPlayElsewhereTab.tabId);
            } else {
                showNoRdioSessionFound();
            }
        }
    });
}

function sendTabMessageDeferred(tabId, message) {
    var $deferred = $.Deferred();

    chrome.tabs.sendMessage(tabId, message, function(response) {
        response = response || {};
        response.tabId = tabId;
        $deferred.resolve(response); 
    });

    return $deferred.promise();
}

function showActiveSessionInfo() {
    $('.js-no-session-wrapper').hide();
    $('.js-active-session-wrapper').show();
}

function showNoRdioSessionFound() {
    $('.js-active-session-wrapper').hide();
    $('.js-play-here-btn').hide();
    $('.js-no-session-message').text('No active Rdio sessions were detected.');
    $('.js-no-session-wrapper').show();
    $('.js-play-something-btn').show();
    $('.js-play-something-btn').on('click', openOrGoToRdioTab);
}

function showPlayingElsewhere(tabId) {
    $('.js-active-session-wrapper').hide();
    $('.js-play-something-btn').hide();
    $('.js-play-here-btn').show();
    $('.js-no-session-message').text('Rdio is playing elsewhere but can be controlled from here.');
    $('.js-no-session-wrapper').show();
    $('.js-active-rdio-tab-id').text(tabId);
}

function openOrGoToRdioTab() {    
    var firstRdioTab;
    chrome.tabs.query({url: '*://*.rdio.com/*'}, function(rdioTabs) {
        if(rdioTabs.length) {
            firstRdioTab = rdioTabs[0];
            chrome.tabs.update(firstRdioTab.id, {active: true});
        } else {
            chrome.tabs.create({url: 'http://www.rdio.com', active: true});
        }
    });
}

chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(portMsgListener);
});

function portMsgListener(audioInfo, port) {
    if(port.name = 'rdio_remote') {
        $('.js-active-rdio-tab-id').text(port.sender.tab.id);
        showActiveSessionInfo();
        updateActiveSessionDisplay(audioInfo);
    }
}

function updateActiveSessionDisplay(audioInfo) {
    var percentTimeElapsed = calculatePercentTimeElapsed(audioInfo.time, audioInfo.duration);
    $('.js-song-title').html(audioInfo.songTitle);
    $('.js-artist-title').text(audioInfo.artistTitle);
    $('.js-time').text(audioInfo.time);
    $('.js-duration').text(audioInfo.duration);
    $('.js-album-art').attr('src', audioInfo.albumArtUrl);
    $('.js-play').toggle(!audioInfo.currentlyPlaying);
    $('.js-pause').toggle(audioInfo.currentlyPlaying);
    $('.js-progress-completed').css('width', Math.round(percentTimeElapsed) + '%');
    $('.js-progress-remaining').css('width', 100 - Math.round(percentTimeElapsed) + '%');
    $('.js-rdio-background').css('background-image', 'url(' + audioInfo.backgroundImageUrl + ')');
}

function calculatePercentTimeElapsed(time, duration) {
    var totalTimeInSeconds = parseTimeParts(duration).totalSeconds;
    var playedTimeInSeconds = parseTimeParts(time).totalSeconds;
    var percentPlayed = (playedTimeInSeconds / totalTimeInSeconds) * 100;

    return percentPlayed;
}

function parseTimeParts(colonDelimitedTime) {
    var timePartsArray = colonDelimitedTime.split(':');
    var secondsIndex = timePartsArray.length - 1;
    var minutesIndex = secondsIndex - 1;
    var hoursIndex = minutesIndex - 1;

    var seconds = parseInt(timePartsArray[secondsIndex]) || 0;
    var minutes = parseInt(timePartsArray[minutesIndex]) || 0;
    var hours = parseInt(timePartsArray[hoursIndex]) || 0;
    var totalSeconds = seconds + (minutes * 60) + (hours * 3600);

    return {seconds: seconds, minutes: minutes, hours: hours, totalSeconds: totalSeconds};
 }