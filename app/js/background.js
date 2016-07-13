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

start()
setInterval(start, 30000)