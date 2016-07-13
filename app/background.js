var online = [];
var htmlContent = '';

function setHTML() {
    console.log(htmlContent)
}

function start() {
    var follows = "https://api.twitch.tv/kraken/users/VangardMk/follows/channels?limit=100"
    var games = "https://api.twitch.tv/kraken/games/top"
    var htmlContent = '';
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
                                        //console.log(data)
                                        stream = data.stream
                                        if (stream !== null) {     // channel is live
                                            createStreamElement(stream)
                                        }
                                    });
                                }
                            )
                            .catch(function (er) {
                                console.log('Fetch Error :-S', er);
                            });
                    }
                    console.log("FUCK YOU");
                });
                console.log("THIS SUX");
            }
        )
        .catch(function (err) {
            console.log('Fetch Error :-S', err);
        });
}


function createStreamElement(stream) {
    htmlContent += '<a class="extension stream" target="_blank" style="float:left" href="' + stream.channel.url + '">' + stream.channel.display_name + '<span style="float:right;">' + stream.viewers + '</span></a>';
}

start()
var streamResults = document.getElementById('extension');
//setInterval(start, 30000)