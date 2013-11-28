/* global $ */
/* global window */
/* global console */
/* global LZString */

var LZString = require('lz-string');


module.exports = function(opts) {
    'use strict';
    var ops = opts || {};
    var SERVER_URL = opts.url || '';
    var USE_COMPRESSION = opts.useCompression || true;
    var DELAY = opts.delay || 5000;

    var start = new Date();

    var APP_START_FAILED = "I'm sorry, the app can't start right now.";
    var log = function(message) {

        $('#loading').append("<p>" + message + "</p>");


        if (window.console) {
            if (message) {
                window.console.log(message);
            }
        }
    };

    var getVersion = function(appString) {
        var searchTerm = "process.env.VERSION='";
        var startPos = appString.indexOf(searchTerm) + searchTerm.length;
        var endPos = appString.indexOf("'", startPos);
        var version = appString.substring(startPos, endPos);
        return version;
    };

    var refreshAppFromServer = function(serverURL, confirm, callback) {
        log('getting app from server: ' + serverURL);

        $.ajax({
            url: serverURL + 'app.html',
            success: function(appString) {
                log('got app from server, caching it');
                try {
                    var downloadedVersion = getVersion(appString);
                    if (localStorage.app) //if is an update not first download
                    {
                        var currentVersion = localStorage.appVersion;
                        if (currentVersion >= downloadedVersion) {
                            log('app not updated');
                            callback();
                        } else {
                            log('updating from ' + currentVersion + ' to ' + downloadedVersion);
                            saveAppToStorage(appString, downloadedVersion);
                            var shouldReload;
                            var end = new Date();
                            var timeTakenMilliseconds = end - start;
                            log('It took ' + timeTakenMilliseconds + ' milliseconds to download');
                            if (confirm && timeTakenMilliseconds > 1000) {
                                shouldReload = window.confirm('A new version has been downloaded\nTo upgrade to ' + downloadedVersion + " now click ok, otherwise click cancel to apply the update the next time the app is launched.");
                            } else {
                                shouldReload = true;
                            }

                            if (shouldReload) {
                                window.location.reload();
                            } else {
                                callback();
                            }
                        }

                    } else {
                        saveAppToStorage(appString, downloadedVersion);
                        callback();
                    }
                } catch (error) {
                    log('error caching');
                    callback(error);
                    return;
                }
            },
            error: function(e) {
                console.error(e);
                log('failed to get app from server');
                callback(e);
            },
            dataType: 'html'
        });
    };


    var saveAppToStorage = function(app, version) {
        var appString;
        if (USE_COMPRESSION) {
            appString = LZString.compressToUTF16(JSON.stringify(app));
        } else {
            appString = JSON.stringify(app);
        }
        localStorage.app = null;
        localStorage.app = appString;
        localStorage.appVersion = version;
        localStorage.appCompressed = USE_COMPRESSION;
        localStorage.appSize = appString.length;
        log('Saved new app to storage. version:' + version + ' length :' + appString.length);
    };

    var getAppFromStorage = function() {
        var decompressedString;
        if (localStorage.appCompressed) {
            decompressedString = LZString.decompressFromUTF16(localStorage.app);
        } else {
            decompressedString = localStorage.app;
        }

        return JSON.parse(decompressedString);
    };

    var checkForNewApp = function(confirm, callback) {
        refreshAppFromServer(SERVER_URL, confirm, function(error) {
            callback(error);
        });
    };

    var main = function(callback) {
        try {
            if (localStorage.app) {
                log('starting cached app');
                checkForNewApp(true, function(error) {
                    if (error) {
                        log(error);
                    }
                });
                startApp(callback);
            } else {
                log('no cached app, getting from local site');
                checkForNewApp(false, function(error) {
                    if (error) {
                        log(error);
                        callback(error);
                    } else {
                        startApp(callback);
                    }
                });
            }
        } catch (error) {
            callback(error);
        }
    };

    var startApp = function(callback) {
        log('starting app');
        var appString = getAppFromStorage();
        try {
            $('body').empty();
            $('body').append(appString);
            //document.innerHTML = appString;
            log('appended');
        } catch (e) {
            callback(e);
            return;
        }
        callback();
    };

    setTimeout(function() {
        main(function(error) {
            if (error) {
                if (error.message) {
                    log(error.message);
                } else {
                    log('there was an error, no message');
                }
                return;
            }
        });
    }, DELAY);
};
