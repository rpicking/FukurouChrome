//This is to communicate between popup.js and background.js (eventPage.js)
//document.addEventListener('DOMContentLoaded', function () { });

function init() {
    var streamResults = document.getElementById("streams");
    streamResults.innerHTML = chrome.extension.getBackgroundPage().createHTML();
}

document.addEventListener('DOMContentLoaded', function () {
    var refresh = document.getElementById("refresh");
    refresh.addEventListener('click', function () {
        chrome.extension.getBackgroundPage().start();
        refresh.className = 'rotate';
        setTimeout(function () {
            location.reload();
        }, 1000);
    });

    var upload = document.getElementById("cloudsync");
    upload.addEventListener('click', function () {
        /*chrome.windows.getAll({ "populate": true, "windowTypes": ['normal'] }, function (openWindows) {
            chrome.extension.getBackgroundPage().uploadWindows(openWindows);
        });*/
        var windowId = chrome.windows.getLastFocused({ "populate": true, "windowTypes": ['normal'] }, function (window) {
            chrome.extension.getBackgroundPage().uploadWindow(window);
        });
    });

    var open = document.getElementById("open");
    open.addEventListener('click', function () {
        chrome.storage.sync.get('windows', function (obj) {
            var testWindows = JSON.parse(obj.windows);
            for (var i in testWindows) {
                var buildArray = [];
                for (var j in testWindows[i]) {
                    buildArray.push(testWindows[i][j].url);
                }
                chrome.windows.create({ 'url': buildArray, 'state': 'maximized' });
            }
        });
    });
});

init();
