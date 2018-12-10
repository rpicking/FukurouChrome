// listen for click on notification popup
chrome.notifications.onClicked.addListener(function(id) {
    if (notificationId === id) {
        chrome.tabs.create({ url: notificationUrl });
    }
});

// listen for messages from other scripts
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    console.log("From tab: ", request);
    switch (request.task) {
        case "save":
            request.favicon_url = await getFaviconUrl(sender.tab.id);
            save_request(request);
            break;
        case "refresh_twitch":
            refreshTwitch();
            break;
        default:
            sendMessage(request);
            break;
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace !== "sync") return;

    if (changes.hasOwnProperty("downloads")) {
        var downloads = changes.downloads.newValue;
        if (downloads !== undefined) {
            for (var i = 0; i < downloads.length; ++i) {
                console.log("Sending to downloads: ", downloads[i]);
            }
        }
    }
});

function save_request(request) {
    if (!checkPort()) {
        console.log("Save for later")
        chrome.storage.sync.get(["downloads"], async function(result) {
            var downloads = result["downloads"] ? result["downloads"] : [];

            downloads.push(request);
            chrome.storage.sync.set({ downloads: downloads });
        });
        return;
    }

    sendDownload(request);
}

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
function sendDownload(payload) {
    var cookies = [];
    chrome.cookies.getAll({ url: payload.cookie_domain }, async function(sitecookies) {
        var cookieslength = sitecookies.length;
        for (var i = 0; i < cookieslength; ++i) {
            cookies.push([sitecookies[i].name, sitecookies[i].value]);
        }
        payload.cookies = cookies;
        delete payload.cookie_domain; // dont need to send domain to host

        sendMessage(payload);
    });
}

// returns current favicon_url for tab with id tab_id
async function getFaviconUrl(tab_id) {
    return new Promise(resolve => {
        chrome.tabs.get(tab_id, function(tab) {
            resolve(tab.favIconUrl);
        });
    });
}

// returns false if cannot create port
function checkPort() {
    if (port != null) return true;

    return connectPort();
}

function connectPort() {
    console.log("launching messenger");
    port = chrome.runtime.connectNative("vangard.fukurou.ext.msg");
    if (port == null) return false;
    port.onDisconnect.addListener(function() {
        port = null;
    });
    port.onMessage.addListener(function(msg) {
        receiveMessage(msg);
    });

    return true;
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
        case "sync": // --- SYNC ---
            //console.log(response);
            localStorage.folders = JSON.stringify(response.folders);

            // remove existing folders from context menu
            folders = response.folders;
            var menuLength = activeMenus.length;
            for (var i = 0; i < menuLength; ++i) {
                chrome.contextMenus.remove(activeMenus[i]);
            }

            // add current folders to context menu
            activeMenus = [];
            for (var i = 0; i < response.folders.length; ++i) {
                createMenu(response.folders[i].name, response.folders[i].uid);
            }
            createDefaultMenus();
            break;

        case "edit": // --- EDIT ---
            if (response.type === "success") {
                status = "";
                sendMessage({ task: "sync" });
            } else {
                status = "failure";
                console.log("edit failure");
                console.log(response);
            }
            break;

        case "delete": // --- DELETE ---
            var opt = {
                type: "basic",
                title: "Fukurou Downloader",
                message: "",
                iconUrl: "img/icon-512.png"
            };

            if (response.type === "success") {
                sendMessage({ task: "sync" });

                opt.message =
                    'Successfully deleted folder "' +
                    response.name +
                    '" with uid: ' +
                    response.uid;
                opt.isClickable = false;
                chrome.notifications.create(opt);
                var audio = new Audio("audio/success-chime.mp3");
                audio.play();
            } else {
                opt.message = "Failed to delete folder";
                chrome.notifications.create(opt);
                var audio = new Audio("audio/error-chime.wav");
                audio.play();
                console.log("delete failure");
                console.log(response);
            }
            break;
        // currently unused
        case "save": // --- SAVE ---
            var opt = {
                type: "basic",
                title: "Fukurou Downloader",
                message: "",
                iconUrl: "img/icon-512.png"
            };

            if (response.type === "success") {
                notificationUrl = response.pageUrl;

                opt.message = response.filename + " added to " + response.folder;
                opt.isClickable = true;
                chrome.notifications.create(opt, function(id) {
                    notificationId = id;
                });
                var audio = new Audio("audio/success-chime.mp3");
                audio.play();
            } else {
                // download failed
                opt.message = "File failed to download. Reason: " + response.type;
                chrome.notifications.create(opt);
                var audio = new Audio("audio/error-chime.wav");
                audio.play();
            }
            break;
        case "resend": // --- RESEND ---
            if (!response.hasOwnProperty("srcUrl")) {
                console.log("No srcUrl for requested resend", response);
                return;
            }
            console.log("Resending: ", response);
            response.task = response.type;
            delete response.type;
            sendMessage(response);
            break;
        case "none":
            // do nothing
            break;
        // --- DEFAULT ---
        default:
            console.log("Task not implemented or present");
            console.log(response);
    }
}

// send message to fukurou host application
function sendMessage(payload) {
    if (payload.task === "save") {
        if (!payload.hasOwnProperty("srcUrl") || !payload.hasOwnProperty("pageUrl")) {
            console.log("download doesn't have all required information", payload);
            return;
        }
    }

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
        onclick: function(info) {
            //console.log(info);
            processDownload(info, uid);
        }
    });
    activeMenus.push(id);
}

// folder: folder name that item will be downloaded to (setup in host)
// send message to content script for further processing
function processDownload(info, uid) {
    sendMessageToTab({ task: "download", info: info, uid: uid });
}

// send message to currently active tab
function sendMessageToTab(payload) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, payload, function(response) {
            // do nothing because have specific method for catching all message to background
        });
    });
}

// returns domain name from url
function extractDomain(url) {
    var preIndex = url.indexOf("://") + 3;
    var searchIndex = url.substring(preIndex).indexOf("/");
    if (searchIndex > -1) {
        url = url.slice(0, preIndex + searchIndex);
    }
    searchIndex = url.substring(preIndex).indexOf(":");
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
                title: tab.title,
                url: tab.url
            });
        }
        windows.push(tabs);
    }
    var jsonString = JSON.stringify(windows);
    chrome.storage.sync.clear();
    chrome.storage.sync.set({ windows: jsonString });
}

// upload all open tab urls in window to sync
function uploadWindow(window) {
    var windows = [];
    var tabs = [];
    for (var i in window.tabs) {
        var tab = window.tabs[i];

        tabs.push({
            title: tab.title,
            url: tab.url
        });
    }
    windows.push(tabs);

    var jsonString = JSON.stringify(windows);
    chrome.storage.sync.clear();
    chrome.storage.sync.set({ windows: jsonString });
}

// Listener waiting for new tab to be complete
// if tabid is in popupImage array then sendmessage to open image
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status != "complete") return;

    for (var i = 0; i < popupImages.length; ++i) {
        if (tabId == popupImages[i].id && !popupImages[i].middleman) {
            chrome.tabs.sendMessage(tabId, {
                task: "popupImage",
                url: popupImages[i].url
            });
            popupImages.splice(i, 1);
            return;
        }
    }
});

// opens url in new tab/window/incognito based on setting
function openUrl(url, srcUrl) {
    chrome.storage.local.get("contextOpenType", function(item) {
        if (item.contextOpenType == 1) {
            // new tab
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.create({ url: url, index: tabs[0].index + 1 }, function(tab) {
                    if (!srcUrl) {
                        // find item
                        for (var i = 0; i < popupImages.length; ++i) {
                            // change tabid
                            if (popupImages[i].id === tabs[0].id) {
                                popupImages[i].id = tab.id;
                                popupImages[i].middleman = false;
                                break;
                            }
                        }
                    } else {
                        popupImages.push({
                            id: tab.id,
                            url: srcUrl,
                            middleman: true
                        });
                    }
                });
            });
        } else if (item.contextOpenType == 2) {
            // new window
            chrome.windows.create({ url: url, focused: true });
        } else if (item.contextOpenType == 3) {
            // new incognito window
            chrome.windows.create({ url: url, focused: true, incognito: true });
        } else {
            // contextOpenType == 0 or not set
            window.location.href = request.url;
        }
    });
}

function createDefaultMenus() {
    // manga processing
    chrome.contextMenus.create({
        type: "separator",
        contexts: ["all"],
        documentUrlPatterns: supportedSites
    });

    activeMenus.push(
        chrome.contextMenus.create({
            title: "Download Manga",
            contexts: ["all"],
            documentUrlPatterns: supportedSites,
            onclick: function(info) {
                //console.log(info);
                payload = {
                    task: "saveManga",
                    url: info.pageUrl
                };
                sendMessage(payload);
            }
        })
    );

    // text searching
    chrome.contextMenus.create({ type: "separator", contexts: ["selection"] });

    activeMenus.push(
        chrome.contextMenus.create({
            title: "Sadpanda Search",
            contexts: ["selection"],
            onclick: function(info) {
                console.log(info.selectionText);

                //var url = 'https://exhentai.org/';
                var params = {
                    f_doujinshi: 1,
                    f_manga: 1,
                    f_artistcg: 1,
                    f_gamecg: 1,
                    f_western: 1,
                    "f_non-h": 1,
                    f_imageset: 1,
                    f_cosplay: 1,
                    f_asianporn: 1,
                    f_misc: 1,
                    f_search: info.selectionText,
                    f_sh: "on",
                    f_apply: "Apply Filter"
                };

                console.log(params);
                var test = encodeURIComponent(JSON.stringify(params));
                var url = "https://exhentai.org/?" + $.param(params);
                openUrl(url, false);
            }
        })
    );
    activeMenus.push(
        chrome.contextMenus.create({
            title: "Hentai.cafe Search",
            contexts: ["selection"],
            onclick: function(info) {
                var params = { s: info.selectionText };
                var url = "https://hentai.cafe/?" + $.param(params);
                openUrl(url, false);
            }
        })
    );
    activeMenus.push(
        chrome.contextMenus.create({
            title: "nhentai.net Search",
            contexts: ["selection"],
            onclick: function(info) {
                var params = { q: info.selectionText };
                var url = "https://nhentai.net/search/?" + $.param(params);
                openUrl(url, false);
            }
        })
    );

    // image searching
    chrome.contextMenus.create({ type: "separator", contexts: ["image"] });

    activeMenus.push(
        chrome.contextMenus.create({
            title: "SauceNAO Search",
            contexts: ["image"],
            onclick: function(info) {
                var params = {
                    db: 999,
                    url: info.srcUrl
                };
                var url = "http://saucenao.com/search.php?" + $.param(params);
                openUrl(url, info.srcUrl);
            }
        })
    );
    activeMenus.push(
        chrome.contextMenus.create({
            title: "IQDB Search",
            contexts: ["image"],
            onclick: function(info) {
                var params = { url: info.srcUrl };
                var url = "http://iqdb.org/?" + $.param(params);
                openUrl(url, info.srcUrl);
            }
        })
    );
    activeMenus.push(
        chrome.contextMenus.create({
            title: "TinEye Search",
            contexts: ["image"],
            onclick: function(info) {
                var params = { url: info.srcUrl };
                var url = "http://tineye.com/search/?" + $.param(params);
                openUrl(url, info.srcUrl);
            }
        })
    );
    activeMenus.push(
        chrome.contextMenus.create({
            title: "Google Image Search",
            contexts: ["image"],
            onclick: function(info) {
                var params = { image_url: info.srcUrl };
                var url = "http://www.google.com/searchbyimage?" + $.param(params);
                openUrl(url, info.srcUrl);
            }
        })
    );
}

function refreshTwitch() {
    startTwitchMonitor();
}

function init() {
    chrome.browserAction.setBadgeBackgroundColor({ color: [14, 45, 199, 255] });
    chrome.browserAction.setBadgeText({ text: "0" });

    // connect to host messenger
    connectPort();

    sendMessage({ task: "sync" });
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
var popupImages = [];

var headers = {
    method: "GET",
    headers: { "Client-ID": "b71k7vce5w1szw9joc08sdo4r19wqb1" }
};

init();
startTwitchMonitor();

setInterval(startTwitchMonitor, 60000);
