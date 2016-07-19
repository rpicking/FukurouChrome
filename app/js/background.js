var content = new Content();

function start() {
    var username = localStorage.username;
    if (!username) {
        return;
    }

    content.clean();

    var follows = "https://api.twitch.tv/kraken/users/" + username + "/follows/channels?limit=100"
    var games = "https://api.twitch.tv/kraken/games/top"

    fetch(follows)
        .then(
            function (response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
                        response.status);
                    return;
                }
                // get followed streamers
                response.json().then(function (streamer) {
                    for (var i = 0; i < streamer.follows.length; ++i) {
                        var name = streamer.follows[i].channel.name;
                        var dispName = streamer.follows[i].channel.display_name;
                        getStreamData(name, dispName);
                    }
                });
            }
        )
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}


function getStreamData(name, dispName) {
    var live = "https://api.twitch.tv/kraken/streams/" + name;
    fetch(live)
        .then(
            function (response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
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
                        for (var j = 0; j < content.total; ++j) {
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
        if (index == -1) {   // game not already in list
            index = this.games.length;
            this.games.push(new Game(game));
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

Content.prototype.removeGame = function (index) {
    this.games.splice(index, 1);
}

Content.prototype.searchGame = function (game) {
    for (var i = 0; i < this.total; ++i) {
        if (!this.games[i].game.localeCompare(game)) {
            return i;
        }
    }
    return -1;
}

// creates html for all games in this.games
Content.prototype.createHTML = function () {
    var html = '';

    if (this.total == 0) {  // no current games
        html = '<p id="vacant"> No streams online</p>';
    }
    else {
        for (var i = 0; i < this.total; ++i) {  //loop through games
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


function init() {
    chrome.browserAction.setBadgeBackgroundColor({ color: [14, 45, 199, 255] });
    chrome.browserAction.setBadgeText({ text: "0" });
}

init()
start()
setInterval(start, 30000)