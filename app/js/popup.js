//This is to communicate between popup.js and background.js (eventPage.js)
//document.addEventListener('DOMContentLoaded', function () { });

function init() {
    console.log("im here");
    var htmlContent = '';
    var streamResults = document.getElementById("streams");
    htmlContent = chrome.extension.getBackgroundPage().content.createHTML();
    streamResults.innerHTML = htmlContent;
}

document.addEventListener('DOMContentLoaded', function () {
    var refresh = document.getElementById("refresh");
    refresh.addEventListener('click', function () {
        chrome.extension.getBackgroundPage().start();
        setTimeout(function () {
            location.reload();
        }, 1000);
    });
});

init();