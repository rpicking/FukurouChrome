//This is to communicate between popup.js and background.js (eventPage.js)
//document.addEventListener('DOMContentLoaded', function () { });


var htmlContent = '';
var streamResults = document.getElementById("extension");
htmlContent = chrome.extension.getBackgroundPage().content.createHTML();
streamResults.innerHTML = htmlContent;
