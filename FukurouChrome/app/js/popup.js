//This is to communicate between popup.js and background.js (eventPage.js)
document.addEventListener('DOMContentLoaded', function () { });

streamResults = document.getElementById("extension");
htmlContent = chrome.extension.getBackgroundPage().getContent();
streamResults.innerHTML = htmlContent;