//This is to communicate between popup.js and background.js (eventPage.js)
//document.addEventListener('DOMContentLoaded', function () { });


var htmlContent = '';
var streamResults = document.getElementById("extension");
htmlContent = chrome.extension.getBackgroundPage().content.createHTML();
streamResults.innerHTML = htmlContent;
//var streamCount = chrome.extension.getBackgroundPage().content.streamCount;
//if(streamCount > 9) {
//    chrome.browserAction.setBadgeText({ text: "10+" });
//}
//else {
//    chrome.browserAction.setBadgeText({ text: String(streamCount) });
//}

