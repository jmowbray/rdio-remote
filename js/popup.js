document.addEventListener('DOMContentLoaded', function() {
    bindDomListeners();
    init();
});

function bindDomListeners() {
    $('.js-command-btn').on('click', handleCommandButtonClicked)
}

function handleCommandButtonClicked(buttonClickEvent) {
    var clickedButton = $(buttonClickEvent.currentTarget);
    sendButtonRequest(clickedButton);
}

function sendButtonRequest(button) {
    var currentSessionTabId = parseInt($('.js-current-rdio-tab-id').text());
    var command = $(button).data('command');

    chrome.tabs.sendMessage(currentSessionTabId, {command: command});
}

function init() {
    chrome.tabs.query({url: 'http://*.rdio.com/*'}, function(rdioTabs) {
        if(rdioTabs.length) {
            sendIsCurrentSessionRequestToAllRdioTabs(rdioTabs);
        } else {
            showNoRdioSessionFound();
        }
    });
}

function sendIsCurrentSessionRequestToAllRdioTabs(rdioTabs) {
    var sendTabMessageDeferreds = [];
    var allResponses;
    var atLeastOneIsCurrentSession;
    
    _.each(rdioTabs, function(rdioTab) {
        sendTabMessageDeferreds.push(sendTabMessageDeferred(rdioTab.id, 'isCurrentRdioSessionTab'));
    });

    $.when.apply($, sendTabMessageDeferreds).then(function() {
        allResponses = arguments;
        atLeastOneIsCurrentSession = _.contains(allResponses, true);
        
        if(!atLeastOneIsCurrentSession) {
            showNoRdioSessionFound();
        }
    });
}

function sendTabMessageDeferred(tabId, message) {
    var $deferred = $.Deferred();

    chrome.tabs.sendMessage(tabId, message, function(response) {
        response = response || false;
        $deferred.resolve(response); 
    });

    return $deferred.promise();
}

function showNoRdioSessionFound() {
    $('.js-main-wrapper').hide();
    $('.js-no-session-wrapper').show();
    $('.js-play-something-btn').on('click', openRdioInNewTab);
}

function openRdioInNewTab() {
    chrome.tabs.create({url: 'http://www.rdio.com', active: true});
}

chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(portMsgListener);
});

function portMsgListener(audioInfo, port) {
    if(port.name = 'rdio_remote') {
        $('.js-current-rdio-tab-id').text(port.sender.tab.id);
        updateDisplay(audioInfo);
    }
}

function updateDisplay(audioInfo) {
    var percentTimeElapsed = calculatePercentTimeElapsed(audioInfo.time, audioInfo.duration);
    $('.js-song-title').html(audioInfo.songTitle);
    $('.js-artist-title').text(audioInfo.artistTitle);
    $('.js-time').text(audioInfo.time);
    $('.js-duration').text(audioInfo.duration);
    $('.js-album-art').attr('src', audioInfo.albumArtUrl);
    $('.js-play').toggle(!audioInfo.currentlyPlaying);
    $('.js-pause').toggle(audioInfo.currentlyPlaying);
    $('.js-progress-bar').val(percentTimeElapsed);
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