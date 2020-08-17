/**
 * This part is responsible for loading and saving player state.
 * State includes:
 * - Current time
 * - Playback rate
 * - Volume
 * - Muted
 *
 * State is loaded after VideoJs player is fully initialized.
 * State is saved at certain events.
 */

var PlayerState = function(player, playerState) {
    'use strict';
    console.log('init player state');
    var xblockUsageId = getXblockUsageId();
    var completionPublished = false;

    /** Create hashmap with all transcripts */
    var getTranscipts = function(transcriptsData) {
        var result = {};
        transcriptsData.forEach(function(transcript) {
            result[transcript.lang] = {
                label: transcript.label,
                url: transcript.url
            };
        });
        return result;
    };

    var transcripts = getTranscipts(playerState.transcripts);

    /** Restore default or previously saved player state */
    var setInitialState = function(state) {
        var stateCurrentTime = state.currentTime;
        var playbackProgress = localStorage.getItem('playbackProgress');
        if (playbackProgress) {
            playbackProgress = JSON.parse(playbackProgress);
            if (playbackProgress[window.videoPlayerId]) {
                stateCurrentTime = playbackProgress[window.videoPlayerId];
            }
        }
        if (stateCurrentTime > 0) {
            player.currentTime(stateCurrentTime);
        }
        player.volume(state.volume);
        player.muted(state.muted);
        player.playbackRate(state.playbackRate);
        player.captionsLanguage = state.captionsLanguage;  // eslint-disable-line no-param-reassign
        // To switch off transcripts and captions state if doesn`t have transcripts with current captions language
        if (!transcripts[player.captionsLanguage]) {
            player.captionsEnabled = player.transcriptsEnabled = false; // eslint-disable-line no-param-reassign
        } else {
            player.transcriptsEnabled = state.transcriptsEnabled; // eslint-disable-line no-param-reassign
            player.captionsEnabled = state.captionsEnabled; // eslint-disable-line no-param-reassign
        }
    };

    function isEnded(duration, currentTime) { 
        return duration - currentTime <= 0.05;
    }

    /**
     * Save player state by posting it in a message to parent frame.
     * Parent frame passes it to a server by calling VideoXBlock.save_state() handler.
     */
    var saveState = function() {
        var playerObj = this;
        var transcriptUrl = getDownloadTranscriptUrl(transcripts, playerObj);

        var newState = {
            volume: playerObj.volume(),
            currentTime: isEnded(playerObj.duration(), playerObj.currentTime())? 0 : playerObj.currentTime(),
            playbackRate: playerObj.playbackRate(),
            muted: playerObj.muted(),
            transcriptsEnabled: playerObj.transcriptsEnabled,
            captionsEnabled: playerObj.captionsEnabled,
            captionsLanguage: playerObj.captionsLanguage
        };
        if (JSON.stringify(newState) !== JSON.stringify(playerState)) {
            console.log('Starting saving player state');  // eslint-disable-line no-console
            playerState = newState; // eslint-disable-line no-param-reassign
            parent.postMessage(
                {
                    action: 'saveState',
                    info: newState,
                    xblockUsageId: xblockUsageId,
                    downloadTranscriptUrl: transcriptUrl || '#'
                },
                document.location.protocol + '//' + document.location.host
            );
        }
    };

    /**
     *  Save player progress in browser's local storage.
     *  We need it when user is switching between tabs.
     */
    var updateProgress = function(duration, currentTime) {
        if (!duration || duration === 0) {
            return;
        }
        var playerObj = this;
        var transcriptUrl = getDownloadTranscriptUrl(transcripts, playerObj);
        if (completionPublished === false && currentTime >= 5) {
            parent.postMessage(
                {
                    action: 'publishCompletion',
                    info: {
                        completion: 1.0
                    },
                    xblockUsageId: xblockUsageId,
                    downloadTranscriptUrl: transcriptUrl || '#'
                },
                document.location.protocol + '//' + document.location.host
            );
            completionPublished = true;
        }
    };

    var saveProgressToLocalStore = function() {
        var playerObj = this;
        var duration = this.duration();
        var currentTime = playerObj.currentTime();
        var playbackProgress;
        playbackProgress = JSON.parse(localStorage.getItem('playbackProgress') || '{}');
        playbackProgress[window.videoPlayerId] = isEnded(duration, currentTime) ? 0 : currentTime;
        updateProgress.call(this, duration, playerObj.currentTime());
        localStorage.setItem('playbackProgress', JSON.stringify(playbackProgress));
        
    };

    setInitialState(playerState);

    player.on('timeupdate', saveProgressToLocalStore);
    player.on('volumechange', saveState);
    player.on('ratechange', saveState);
    player.on('play', saveState);
    player.on('pause', saveState);
    player.on('ended', saveState);
    player.on('transcriptstatechanged', saveState);
    player.on('captionstatechanged', saveState);
    player.on('languagechange', saveState);
};

domReady(function() {
    'use strict';
    videojs(window.videoPlayerId).ready(function() {
        PlayerState(this, window.playerStateObj);
    });
});
