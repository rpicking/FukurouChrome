//This is to communicate between popup.js and background.js (eventPage.js)
//document.addEventListener('DOMContentLoaded', function () { });
var htmlContent = '';
streamResults = document.getElementById("extension");
console.log("WUT");
console.log(htmlContent);
console.log(chrome.extension.getBackgroundPage().content);
htmlContent = chrome.extension.getBackgroundPage().htmlContent;
console.log(htmlContent);
console.log("TESTY");
streamResults.innerHTML = htmlContent;