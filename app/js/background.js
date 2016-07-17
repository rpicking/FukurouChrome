var content = new Content();

function start() {
    console.log("START");
    console.log(content);
    var follows = "https://api.twitch.tv/kraken/users/VangardMk/follows/channels?limit=100"
    var games = "https://api.twitch.tv/kraken/games/top"

    fetch(follows)
        .then(
            function (response) {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
                        response.status);
                    return;
                }
                response.json().then(function (streamer) {
                    for (var i = 0; i < streamer.follows.length; ++i) {
                        var name = streamer.follows[i].channel.name;
                        var live = "https://api.twitch.tv/kraken/streams/" + name;

                        fetch(live)
                            .then(
                                function (response) {
                                    if (response.status !== 200) {
                                        console.log('Looks like there was a problem. Status Code: ' +
                                            response.status);
                                        return;
                                    }
                                    response.json().then(function (data) {
                                        stream = data.stream;
                                        if (stream !== null) {     // channel is live
                                            var name = stream.channel.display_name;
                                            var viewers = stream.viewers;
                                            var url = stream.channel.url;
                                            var game = stream.game;
                                            content.addStream(name, viewers, url, game);
                                        }
                                    });
                                }
                            )
                            .catch(function (er) {
                                console.log('Fetch Error :-S', er);
                            });
                    }
                });
            }
        )
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}


// Class for stream data asked for by popup
// Content.games
//    Game.streams
//       Stream
function Content() {
    this.total = 0;
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
            console.log("SOMETHINGS FUCKY");
            index = this.games.length;
            this.games.push(new Game(game));
        }
    }

    if (!this.games[index].checkDuplicate(name)) {  // if no duplicate
        this.games[index].streams.push(new Stream(name, views, link));
    }

    this.total = this.games.length;
}

Content.prototype.searchGame = function (game) {
    for (var i = 0; i < this.total; ++i) {
        console.log(i);
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
            console.log(i);
            console.log(this.games[i]);
            var game = this.games[i].game;
            html += '<div class="game">' + game + '<hr>';

            html += this.games[i].createHTML();
            html += '</div>';
        }
    }

    return html;
}

Content.prototype.clear = function () {
    for (var i = 0; i < this.games.length; ++i) {
        this.games[i].clear();
    }
    this.games.splice(0, this.games.length);
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
        html += '<a class="game stream" target="_blank" style="float:left" href="' + this.streams[i].link + '">' + this.streams[i].name + '<span style="float:right;">' + this.streams[i].views + '</span><hr class="hr1"></a>';
    }

    return html;
}

// Returns true if match found
Game.prototype.checkDuplicate = function(name) {
    //check for duplicate
    for (var i = 0; i < this.streams.length; ++i) {
        if (!this.streams[i].name.localeCompare(name)) {
            return true;
        }
    }
    return false;
}

Game.prototype.clear = function () {
    this.streams.splice(0, this.streams.length);
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



start()
setInterval(start, 30000)