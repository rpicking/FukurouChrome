var online = [];
var htmlContent = '';

function setHTML() {
    console.log(htmlContent)
}


function start() {
    var follows = "https://api.twitch.tv/kraken/users/VangardMk/follows/channels?limit=100"
    var games = "https://api.twitch.tv/kraken/games/top"
    htmlContent = '';
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
                                            console.log(stream);
                                            index = online.indexOf(stream.channel.name);
                                            if (index == -1) { // not already displayed
                                                online.push(name);
                                                createStreamElement(stream);
                                                console.log(online);
                                            }
                                        }
                                        else {      // check to remove offline streamers

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


function createStreamElement(stream) {
    htmlContent += '<a class="extension stream" target="_blank" style="float:left" href="' + stream.channel.url + '">' + stream.channel.display_name + '<span style="float:right;">' + stream.viewers + '</span></a>';
    
}


function getContent() {
    return htmlContent;
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

    this.games[index].streams.push(new Stream(name, views, link));
    this.total += 1;
}

Content.prototype.searchGame = function (game) {
    for (var i = 0; i < this.total; ++i) {
        if (this.games[i].game == game) {
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
            html += '<div class="game">' + this.games[i].game + '<hr>';

            html += this.games[i].createHTML();
            html += '</div>';
        }
    }

    return html;
}


// class for game
function Game(game) {
    this.game = game.toUpperCase();
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


// class for stream
function Stream(name, views, link) {
    this.name = name;
    this.views = views;
    this.link = link;
}

// sort by views
function compareViews(a, b) {
    if (a.views < b.views) {
        return -1;
    }
    if (a.views > b.views) {
        return 1;
    }

    return 0;
}



start()
setInterval(start, 30000)