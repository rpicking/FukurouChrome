// listen for click on notification popup
chrome.notifications.onClicked.addListener(function (id) {
    if (notificationId === id) {
        chrome.tabs.create({ url: notificationUrl });
    }
});

// listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    //console.log(request);
    switch (request.task) {
        case "save":
            sendDownload(request, sender.tab.id);
            break;
        default:
            sendMessage(request);
            break;
    }
});

/*  
Sends download url and optional parameters to fukurou host
task: save
srcUrl: url to item that is being downloaded
pageUrl: url of the page that item downloaded from
domain: domain of pageUrl
folder: name in folder file will be downloaded to
comicLink: *OPTIONAL* url of comic that item is from
comicName: *OPTIONAL* name of comic
comicPage: *OPTIONAL* page number of item
artist: *OPTIONAL* artist/artists parent manga
cookies: cookies from domain
*/
function sendDownload(payload, tab_id) {
    var cookies = [];
    chrome.cookies.getAll({ 'url': payload.cookie_domain }, function (sitecookies) {
        var cookieslength = sitecookies.length;
        for (var i = 0; i < cookieslength; ++i) {
            cookies.push([sitecookies[i].name, sitecookies[i].value]);
        }
        payload.cookies = cookies;
        delete payload.cookie_domain;  // dont need to send domain to host

        chrome.tabs.get(tab_id, function (tab) {
            payload['favicon_url'] = tab.favIconUrl;
            sendMessage(payload);
        });
    });
}

function connectPort() {
    console.log("launching messenger")
    port = chrome.runtime.connectNative('vangard.fukurou.ext.msg');
    port.onDisconnect.addListener(function () {
        port = null;
    });
    port.onMessage.addListener(function (msg) {
        receiveMessage(msg);
    });
}

/*
Sends message to host with payload
Sent messages must have task key
Response must include task and type keys
    task = task of original message
    type = success, failure, or crash
*/    
function receiveMessage(response) {
    //console.log("Message Received:");
    //console.log(response);
    switch (response.task) {
        case 'sync':    // --- SYNC ---
            //console.log(response);
            localStorage.folders = JSON.stringify(response.folders);

            //clean "old" menus
            folders = response.folders;
            var menuLength = activeMenus.length;
            for (var i = 0; i < menuLength; ++i) {
                chrome.contextMenus.remove(activeMenus[i]);
            }

            activeMenus = [];
            for (var i = 0; i < response.folders.length; ++i) {
                createMenu(response.folders[i].name, response.folders[i].uid);
            }
            createDefaultMenus();
            break;

        case 'edit':    // --- EDIT ---
            if (response.type === "success") {
                status = "";
                sendMessage({ 'task': 'sync' });
            }
            else {
                status = "failure";
                console.log('edit failure');
                console.log(response);
            }
            break;

        case 'delete':  // --- DELETE ---
            var opt = {
                type: "basic",
                title: "Fukurou Downloader",
                message: "",
                iconUrl: "img/icon-512.png",
            }

            if (response.type === "success") {
                sendMessage({ 'task': 'sync' });

                opt.message = 'Successfully deleted folder "' + response.name + '" with uid: ' + response.uid;
                opt.isClickable = false;
                chrome.notifications.create(opt);
                var audio = new Audio('audio/success-chime.mp3');
                audio.play();
            }
            else {
                opt.message = "Failed to delete folder";
                chrome.notifications.create(opt);
                var audio = new Audio('audio/error-chime.wav');
                audio.play();
                console.log('delete failure');
                console.log(response);
            }
            break;

        case 'save':    // --- SAVE ---
            var opt = {
                type: "basic",
                title: "Fukurou Downloader",
                message: "",
                iconUrl: "img/icon-512.png",
            }

            if (response.type === 'success') {
                notificationUrl = response.pageUrl;

                opt.message = response.filename + " added to " + response.folder;
                opt.isClickable = true;
                chrome.notifications.create(opt, function (id) {
                    notificationId = id;
                });
                var audio = new Audio('audio/success-chime.mp3');
                audio.play();
            }
            else {  // download failed
                opt.message = "File failed to download. Reason: " + response.type;
                chrome.notifications.create(opt);
                var audio = new Audio('audio/error-chime.wav');
                audio.play();
            }
            break;
        case 'resend':  // --- RESEND ---
            response.task = response.type
            delete response.type
            sendMessage(response);
            break;
            // --- DEFAULT ---
        default:
            console.log('Task not implemented or present')
            console.log(response);
    }
}

// send message to fukurou host application
function sendMessage(payload) {
    //console.log(payload);
    if (port == null) {
        connectPort();
    }
    port.postMessage(payload);
}

// creates menu item
function createMenu(folder, uid) {
    var id = chrome.contextMenus.create({
        title: "Add to: " + folder,
        contexts: ["all"],
        onclick: function (info) {
            //console.log(info);
            processDownload(info, uid);
        }
    });
    activeMenus.push(id);
}

// folder: folder name that item will be downloaded to (setup in host)
// send message to content script for further processing
function processDownload(info, uid) {
    sendMessageToTab({ "task": "download", "info": info, "uid": uid });
}

// send message to currently active tab
function sendMessageToTab(payload) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, payload, function (response) {
            // do nothing because have specific method for catching all message to background

        });
    });
}

// returns domain name from url
function extractDomain(url) {
    var preIndex = url.indexOf("://") + 3;
    var searchIndex = url.substring(preIndex).indexOf('/');
    if (searchIndex > -1) {
        url = url.slice(0, preIndex + searchIndex);
    }
    searchIndex = url.substring(preIndex).indexOf(':');
    if (searchIndex > -1) {
        url = url.slice(0, preIndex + searchIndex);
    }
    return url;
}

function uploadWindows(openWindows) {
    var windows = [];
    for (var i = 0; i < openWindows.length; ++i) {
        var tabs = [];
        for (var j = 0; j < openWindows[i].tabs.length; ++j) {
            var tab = openWindows[i].tabs[j];
            tabs.push({
                "title": tab.title,
                "url": tab.url
            });
        }
        windows.push(tabs);
    }
    var jsonString = JSON.stringify(windows);
    chrome.storage.sync.clear();
    chrome.storage.sync.set({ 'windows': jsonString });
}

// upload all open tab urls in window to sync
function uploadWindow(window) {
    var windows = [];
    var tabs = [];
    for (var i in window.tabs) {
        var tab = window.tabs[i];

        tabs.push({
            "title": tab.title,
            "url": tab.url
        });
    }
    windows.push(tabs);

    var jsonString = JSON.stringify(windows);
    chrome.storage.sync.clear();
    chrome.storage.sync.set({ 'windows': jsonString });
}

function createDefaultMenus() {
    // manga processing 
    chrome.contextMenus.create({ type: 'separator', contexts: ['all'], documentUrlPatterns: supportedSites });

    activeMenus.push(chrome.contextMenus.create({
        title: 'Download Manga',
        contexts: ['all'],
        documentUrlPatterns: supportedSites,
        onclick: function (info) {
            //console.log(info);
            payload = {
                "task": "saveManga",
                "url": info.pageUrl
            }
            sendMessage(payload);
        }
    }));
    
    // text searching
    chrome.contextMenus.create({ type: 'separator', contexts: ['selection'] });

    activeMenus.push(chrome.contextMenus.create({
        title: 'Sadpanda Search',
        contexts: ['selection'],
        onclick: function (info) {
            var url = "https://exhentai.org/?f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1" +
                "&f_cosplay=1&f_asianporn=1&f_misc=1&f_search=" + info.selectionText + "&f_sh=on&f_apply=Apply+Filter";
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));
    activeMenus.push(chrome.contextMenus.create({
        title: 'nhentai.net Search',
        contexts: ['selection'],
        onclick: function (info) {
            var url = "https://nhentai.net/search/?q=" + info.selectionText
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));


    // image searching
    chrome.contextMenus.create({ type: 'separator', contexts: ['image'] });

    activeMenus.push(chrome.contextMenus.create({
        title: 'SauceNAO Search',
        contexts: ['image'],
        onclick: function (info) {
            var url = "http://saucenao.com/search.php?db=999&url=" + info.srcUrl;
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));
    activeMenus.push(chrome.contextMenus.create({
        title: 'IQDB Search',
        contexts: ['image'],
        onclick: function (info) {
            var url = "http://iqdb.org/?url=" + info.srcUrl;
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));
    activeMenus.push(chrome.contextMenus.create({
        title: 'TinEye Search',
        contexts: ['image'],
        onclick: function (info) {
            var url = "http://tineye.com/search/?url=" + info.srcUrl;
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));
    activeMenus.push(chrome.contextMenus.create({
        title: 'Google Image Search',
        contexts: ['image'],
        onclick: function (info) {
            var url = "http://www.google.com/searchbyimage?image_url=" + info.srcUrl;
            sendMessageToTab({ "task": "openUrl", "url": url });
        }
    }));
}

function init() {
    chrome.browserAction.setBadgeBackgroundColor({ color: [14, 45, 199, 255] });
    chrome.browserAction.setBadgeText({ text: "0" });

    // connect to host messenger
    connectPort();
    
    sendMessage({ 'task': 'sync' });
}

// -------------------------------------------------
// Start Extension
// -------------------------------------------------

var notificationId = null;
var notificationUrl = null;
var folders = [];
var status = "";
var port = null;
var activeMenus = [];
var supportedSites = ["*://hentai.cafe/*"];

var headers = { 'method': 'GET', 'headers': { 'Client-ID': 'b71k7vce5w1szw9joc08sdo4r19wqb1' } };

init();
startTwitchMonitor();

setInterval(startTwitchMonitor, 60000);
