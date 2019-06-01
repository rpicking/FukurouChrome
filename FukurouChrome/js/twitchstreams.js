// start twitch portion of extension
function startTwitchMonitor() {
    var username = localStorage.username;
    if (!username) {
        return;
    }

    cleanLiveList();
    var follows =
        "https://api.twitch.tv/kraken/users/" + username + "/follows/channels?limit=100";

    fetch(follows, headers)
        .then(function(response) {
            if (response.status !== 200) {
                console.log(
                    "Looks like there was a problem. Status Code: " + response.status
                );
                return;
            }
            // get followed streamers
            response.json().then(function(streamer) {
                var followed = [];
                for (var i = 0; i < streamer.follows.length; ++i) {
                    var name = streamer.follows[i].channel.name;
                    var dispName = streamer.follows[i].channel.display_name;
                    followed.push(dispName);
                    getStreamData(name, dispName);
                }

                // check for non followed streams
                invalidStreams(followed);
            });
        })
        .catch(function(err) {
            console.log("Fetch Error :-S", err);
        });
}

function getStreamData(name, dispName) {
    var live = "https://api.twitch.tv/kraken/streams/" + name;
    fetch(live, headers)
        .then(function(response) {
            if (response.status !== 200) {
                d = new Date();
                console.log(
                    "Looks like there was a problem. " +
                        d.toLocaleString() +
                        " Status Code: " +
                        response.status
                );
                return;
            }
            // get online status and information
            response.json().then(function(data) {
                stream = data.stream;
                if (stream !== null) {
                    // stream is live
                    var name = stream.channel.display_name;
                    var viewers = stream.viewers;
                    var url = stream.channel.url;
                    var game = stream.game;
                    addStream(name, viewers, url, game);
                } else {
                    // stream is offline
                    for (var j = 0; j < games.length; ++j) {
                        var index = games[j].checkDuplicate(dispName);
                        if (index != -1) {
                            removeStream(j, index);
                        }
                    }
                    cleanLiveList();
                }
            });
        })
        .catch(function(er) {
            console.log("Fetch Error :-S", er);
        });
}

// games[]
//    Game.streams[]
//       Stream

function addStream(name, views, link, game) {
    game = game.toUpperCase();
    var index = 0;
    if (total == 0) {
        // no games
        games.push(new Game(game));
    } else {
        index = gameListPosition(game);
        if (index == -1) {
            // game not already in list - Add new game
            index = games.length;
            games.push(new Game(game));
            games.sort(compareGame);
            index = gameListPosition(game);
        }
    }

    // check and remove stream from old game (streamer changed game)
    for (var i = 0; i < games.length; ++i) {
        if (i != index) {
            var oldGame = games[i].checkDuplicate(name);
            if (oldGame > -1) {
                removeStream(i, oldGame);
            }
        }
    }

    var dup = games[index].checkDuplicate(name);
    if (dup == -1) {
        // if not duplicate
        games[index].streams.push(new Stream(name, views, link));
        streamCount += 1;
        updateBadge();
    } else {
        // update stream views
        games[index].updateStream(dup, views);
    }

    total = games.length;
}

function removeStream(gIndex, sIndex) {
    games[gIndex].streams.splice(sIndex, 1);
    if (games[gIndex].length == 0) {
        games.splice(gIndex, 1);
    }

    streamCount -= 1;
    updateBadge();
}

// checks all displayed streamers are still in followed
function invalidStreams(followed) {
    var remove = [];
    for (var i = 0; i < games.length; ++i) {
        //add invalid streams to remove
        for (var j = 0; j < games[i].streams.length; ++j) {
            if (followed.indexOf(games[i].streams[j].name) == -1) {
                remove.push([i, j]);
            }
        }
    }
    for (var i = 0; i < remove.length; ++i) {
        // delete all streams from content in remove
        removeStream(remove[i][0], remove[i][1]);
    }
}

function updateBadge() {
    if (streamCount > 9) {
        chrome.browserAction.setBadgeText({ text: "10+" });
    } else {
        chrome.browserAction.setBadgeText({ text: String(streamCount) });
    }
}

function cleanLiveList() {
    var dead = [];
    for (var i = 0; i < games.length; ++i) {
        if (games[i].streams.length == 0) {
            dead.push(i);
        }
    }
    for (var j = 0; j < dead.length; ++j) {
        removeGame(dead[j]);
    }
}

// removes previously live game from games list
function removeGame(index) {
    games.splice(index, 1);
    //this.games.sort(compareGame);
}

// returns position of game if found else return -1
function gameListPosition(game) {
    for (var i = 0; i < games.length; ++i) {
        if (!games[i].game.localeCompare(game)) {
            return i;
        }
    }
    return -1;
}

// creates html for all games in this.games
function createHTML() {
    var html = "";
    if (streamCount === 0) {
        // no current games
        html = '<p id="vacant"> No streams online</p>';
    } else {
        for (var i = 0; i < this.games.length; ++i) {
            //loop through games
            var game = games[i].game;
            html += '<div class="game">' + game + "<hr>";

            html += games[i].createHTML();
            html += "</div>";
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
Game.prototype.createHTML = function() {
    var html = "";

    this.streams.sort(compareViews);
    for (var i = 0; i < this.streams.length; ++i) {
        html +=
            '<a class="game stream" target="_blank" style="float:left" href="' +
            this.streams[i].link +
            '">' +
            '<img class="site" src="img/twitch.png">' +
            this.streams[i].name +
            '<span style="float:right;">' +
            this.streams[i].views +
            '</span><hr class="hr1"></a>';
    }

    return html;
};

// Returns position if match found else -1
Game.prototype.checkDuplicate = function(name) {
    //check for duplicate
    for (var i = 0; i < this.streams.length; ++i) {
        if (!this.streams[i].name.localeCompare(name)) {
            return i;
        }
    }
    return -1;
};

Game.prototype.updateStream = function(pos, views) {
    this.streams[pos].views = views;
};

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

var total = 0;
var streamCount = 0;
var games = [];
