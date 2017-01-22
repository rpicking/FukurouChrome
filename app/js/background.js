/*chrome.contextMenus.create({
    title: 'Request Sync',
    contexts: ['all'],
    onclick: function (info) {
        chrome.runtime.sendNativeMessage('vangard.fukurou.ext.msg', {
            "task": 'sync',
        }, function (response) {
            console.log(response);
            for (var item in response.folders) {
                console.log(item);
                console.log(response.folders[item].path);
            }
            //var len = response.folders
            // response processing goes here
            // success? failure?
        });
    }
});
chrome.contextMenus.create({ type: 'separator' }); */

// listen for messages from content_favorite content script
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendDownload(request.srcUrl, request.pageUrl, request.domain, request.folder, request.comicLink, request.comicName, request.comicPage, request.artist);
    });


// srcUrl: url to download item
// pageUrl: url to download item was gotten from
// folder: folder name that item will be downloaded to (setup in host)
function processDownload(info, folder) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { "info": info, "folder": folder }, function (response) {
            // reponse processing goes here
        });
    });
}

// creates menu item
function createMenu(folder) {
    var id = chrome.contextMenus.create({
        title: "Add to: " + folder,
        contexts: ["all"],
        onclick: function (info) {
            if (info.mediaType == undefined) {
                console.log('not media');
            }
            processDownload(info, folder);
        }
    });
    activeMenus.push(id);
}

/*  Sends download url and optional parameters to fukurou host
srcUrl: url to item that is being downloaded
pageUrl: url of the page that item downloaded from
domain: domain of pageUrl
folder: name in folder file will be downloaded to
comicLink: *OPTIONAL* url of comic that item is from
comicName: *OPTIONAL* name of comic
comicPage: *OPTIONAL* page number of item
artist: *OPTIONAL* artist/artists parent manga
cookies: cookies from pageUrl domain
*/
function sendDownload(srcUrl, pageUrl, domain, folder, comicLink, comicName, comicPage, artist) {
    comicLink = comicLink || '';  // set default parameters PRE ES2015?
    comicName = comicName || '';
    comicPage = comicPage || '';
    artist = artist || '';
    console.log(srcUrl);
    var cookies = [];
    chrome.cookies.getAll({ 'url': domain }, function (sitecookies) {
        var cookieslength = sitecookies.length;
        for (var i = 0; i < cookieslength; ++i) {
            cookies.push([sitecookies[i].name, sitecookies[i].value]);
        }
        chrome.runtime.sendNativeMessage('vangard.fukurou.ext.msg', {
            "task": "save",
            "folder": folder, // name of saved folder in config
            "srcUrl": srcUrl,
            "pageUrl": pageUrl,
            "comicLink": comicLink,
            "comicName": comicName,
            "comicPage": comicPage,
            "artist": artist,
            "cookies": cookies
        }, function (response) {
            // response processing goes here
            // success? failure?
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

// send message requesting folders from host, and create context menus for each
function syncHost() {
    chrome.runtime.sendNativeMessage('vangard.fukurou.ext.msg', {
        "task": 'sync',
    }, function (response) {
        localStorage.folders = response.folders;
        //clean "old" menus
        var menuLength = activeMenus.length;
        for (var i = 0; i < menuLength; ++i) {
            chrome.contextMenus.remove(activeMenus[i]);
        }
        activeMenus = [];
        // Order created is order appears in context menu
        for (var item in response.folders) {
            //console.log(item);
            //console.log(response.folders[item].path);
            createMenu(item);
        }
    });
}


// start twitch portion of extension
function start() {
    var username = localStorage.username;
    if (!username) {
        return;
    }

    content.clean();
    var follows = "https://api.twitch.tv/kraken/users/" + username + "/follows/channels?limit=100";

    fetch(follows, headers)
        .then(
            function (response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
                        response.status);
                    return;
                }
                // get followed streamers
                response.json().then(function (streamer) {
                    var followed = [];
                    for (var i = 0; i < streamer.follows.length; ++i) {
                        var name = streamer.follows[i].channel.name;
                        var dispName = streamer.follows[i].channel.display_name;
                        followed.push(dispName);
                        getStreamData(name, dispName);
                    }

                    // check for non followed streams
                    content.invalidCheck(followed);
                });
            }
        )
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}


function getStreamData(name, dispName) {
    var live = "https://api.twitch.tv/kraken/streams/" + name;
    fetch(live, headers)
        .then(
            function (response) {
                if (response.status !== 200) {
                    d = new Date();
                    console.log('Looks like there was a problem. ' + d.toLocaleString() + ' Status Code: ' +
                        response.status);
                    return;
                }
                // get online status and information
                response.json().then(function (data) {
                    stream = data.stream;
                    if (stream !== null) {     // stream is live
                        var name = stream.channel.display_name;
                        var viewers = stream.viewers;
                        var url = stream.channel.url;
                        var game = stream.game;
                        content.addStream(name, viewers, url, game);
                    }
                    else {  // stream is offline
                        for (var j = 0; j < content.games.length; ++j) {
                            var index = content.games[j].checkDuplicate(dispName);
                            if (index != -1) {
                                content.removeStream(j, index);
                            }
                        }
                    }
                });
            }
        )
        .catch(function (er) {
            console.log('Fetch Error :-S', er);
        });
}


// Class for stream data asked for by popup
// Content.games[]
//    Game.streams[]
//       Stream
function Content() {
    this.total = 0;
    this.streamCount = 0;
    this.games = [];
}

Content.prototype.addStream = function (name, views, link, game) {
    game = game.toUpperCase();
    var index = 0;
    if (this.total == 0) {     // no games
        this.games.push(new Game(game));
    }
    else {
        index = this.searchGame(game);
        if (index == -1) {   // game not already in list - Add new game
            index = this.games.length;
            this.games.push(new Game(game));
            this.games.sort(compareGame);
            index = this.searchGame(game);
        }
    }

    // check and remove stream from old game (streamer changed game)
    for (var i = 0; i < this.games.length; ++i) {
        if (i != index) {
            var oldGame = this.games[i].checkDuplicate(name);
            if (oldGame > -1) {
                this.removeStream(i, oldGame);
            }
        }
    }

    var dup = this.games[index].checkDuplicate(name);
    if (dup == -1) {  // if not duplicate
        this.games[index].streams.push(new Stream(name, views, link));
        this.streamCount += 1;
        this.updateBadge();
    }
    else {  // update stream views
        this.games[index].updateStream(dup, views);
    }

    this.total = this.games.length;
}

Content.prototype.removeStream = function (gIndex, sIndex) {
    this.games[gIndex].streams.splice(sIndex, 1);
    if (this.games[gIndex].length == 0) {
        this.games.splice(gIndex, 1);
    }

    this.streamCount -= 1;
    this.updateBadge();
}

// checks all displayed streamers are still in followed
Content.prototype.invalidCheck = function (followed) {
    var remove = [];
    for (var i = 0; i < this.games.length; ++i) {   //add invalid streams to remove
        for (var j = 0; j < this.games[i].streams.length; ++j) {
            if (followed.indexOf(this.games[i].streams[j].name) == -1) {
                remove.push([i, j]);
            }
        }
    }
    for (var i = 0; i < remove.length; ++i) {   // delete all streams from content in remove
        this.removeStream(remove[i][0], remove[i][1]);
    }
}

Content.prototype.updateBadge = function () {
    if(this.streamCount > 9) {
        chrome.browserAction.setBadgeText({ text: "10+" });
    }
    else {
        chrome.browserAction.setBadgeText({ text: String(this.streamCount) });
    }
}

Content.prototype.clean = function () {
    var dead = [];
    for (var i = 0; i < this.games.length; ++i) {
        if (this.games[i].streams.length == 0) {
            dead.push(i);
        }
    }
    for (var j = 0; j < dead.length; ++j) {
        this.removeGame(dead[j]);
    }
}

// removes game
Content.prototype.removeGame = function (index) {
    this.games.splice(index, 1);
    //this.games.sort(compareGame);
}

// returns position of game if found else return -1
Content.prototype.searchGame = function (game) {
    for (var i = 0; i < this.games.length; ++i) {
        if (!this.games[i].game.localeCompare(game)) {
            return i;
        }
    }
    return -1;
}

// creates html for all games in this.games
Content.prototype.createHTML = function () {
    var html = '';
    if (this.streamCount == 0) {  // no current games
        html = '<p id="vacant"> No streams online</p>';
    }
    else {
        for (var i = 0; i < this.games.length; ++i) {  //loop through games
            var game = this.games[i].game;
            html += '<div class="game">' + game + '<hr>';

            html += this.games[i].createHTML();
            html += '</div>';
        }
    }

    return html;
}


// class for game
function Game(game) {
    this.game = game;
    this.streams = [];
}

// creates html for all streams in this.streams
Game.prototype.createHTML = function () {
    var html = '';

    this.streams.sort(compareViews);
    for (var i = 0; i < this.streams.length; ++i) {
        html += '<a class="game stream" target="_blank" style="float:left" href="' + this.streams[i].link + '">' + '<img class="site" src="img/twitch.png">' + this.streams[i].name + '<span style="float:right;">' + this.streams[i].views + '</span><hr class="hr1"></a>';
    }

    return html;
}

// Returns position if match found else -1
Game.prototype.checkDuplicate = function(name) {
    //check for duplicate
    for (var i = 0; i < this.streams.length; ++i) {
        if (!this.streams[i].name.localeCompare(name)) {
            return i;
        }
    }
    return -1;
}

Game.prototype.updateStream = function (pos, views) {
    this.streams[pos].views = views;
}

// class for stream
function Stream(name, views, link) {
    this.name = name;
    this.views = views;
    this.link = link;
}

// sort by views
function compareViews(a, b) {
    if (a.views < b.views) {
        return 1;
    }
    if (a.views > b.views) {
        return -1;
    }
    return 0;
}

// sort alphabetically by game name
function compareGame(a, b) {
    if (a.game < b.game) {
        return -1;
    }
    if (a.game > b.game) {
        return 1;
    }
    return 0;
}

function init() {
    chrome.browserAction.setBadgeBackgroundColor({ color: [14, 45, 199, 255] });
    chrome.browserAction.setBadgeText({ text: "0" });
    syncHost()
}


// Start Extension
var content = new Content();
var activeMenus = [];
var headers = { method: 'GET', headers: { 'Client-ID': 'b71k7vce5w1szw9joc08sdo4r19wqb1' } }
init();
start();
setInterval(start, 60000);
