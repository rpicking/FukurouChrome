
(function () {
    "use strict";

    var usernameInput;
    var save;

    function saveSettings() {
        localStorage.username = usernameInput.value;

        chrome.extension.getBackgroundPage().start();

        var indicator = document.getElementById("indicator");
        indicator.style.opacity = 1;

        setTimeout(function () {
            indicator.style.opacity = 0;
        }, 4000);
    }

    function start() {
        var username = localStorage.username;
        usernameInput = document.getElementById("username");

        if (username) {
            usernameInput.value = username;
        }
        
        save = document.getElementById("saveButton");
        save.onclick = saveSettings;
    }

    start();
}());
