//document.addEventListener("mousedown", function (event) {
//    if (event.button == 2) {
//        chrome.extension.sendRequest({ cmd: "create_menu" });
//    }
//}, true);


function parseEx(srcUrl, pageUrl, domain, apiUrl) {
    var results = [];
    var comicLink = "";
    var comicName = "";
    var comicPage = "";
    var artist = "";

    var elem = document.getElementsByClassName("gm");
    if (elem.length != 0) {   // currently on gallery page
        comicLink = document.URL;
    }
    else {  // not currently on gallery page
        gal = document.getElementById("i5");
        if (gal) { // currently in gallery slideshow
            comicLink = gal.getElementsByClassName('sb')[0].getElementsByTagName("a")[0].href;
            bestimg = document.getElementById("i7").getElementsByTagName('a');
            if (bestimg.length > 0) {
                srcUrl = bestimg[0].href;  //update srcUrl to larger image
            }
            var pageUrl = document.URL;
            comicPage = pageUrl.substring(pageUrl.indexOf("-") + 1);
        }
        else {  // not in gallery slideshow
            var images = document.getElementsByTagName("img");
            var target;
            for (var i = 0; i < images.length; ++i) {
                if (images[i].src === srcUrl) {
                    target = images[i];
                    break;
                }
            }
            comicLink = target.parentNode.href;
        }
    }
    // get comicName
    var splitlink = comicLink.split('/');
    var id = [splitlink[4], splitlink[5]];;
    var gdata = { "method": "gdata", "gidlist": [id], "namespace": 1 };
    send_req(apiUrl, gdata).then(function (response) {
        comicName = response.gmetadata[0].title;
        len = response.gmetadata[0].tags.length;
        for (var i = 0; i < len; ++i) {
            if (response.gmetadata[0].tags[i].startsWith("artist:")) {  // tag is artist
                artist = response.gmetadata[0].tags[i]  
                artist = artist.substring(artist.indexOf(":") + 1); // remove artist: from tag
            }
        }
        send_message(srcUrl, pageUrl, domain, comicLink, comicName, comicPage, artist);
    });
}

// Makes request to apiUrl with package data
function send_req(apiUrl, data) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) {
                resolve(JSON.parse(xhr.responseText));
            }
        }
        xhr.send(JSON.stringify(data));
    });
}

// Sends required info back to background for passing to download app
function send_message(srcUrl, pageUrl, domain, comicLink, comicName, comicPage, artist) {
    chrome.runtime.sendMessage({
            "srcUrl": srcUrl,
            "pageUrl": pageUrl,
            "domain": domain,
            "comicLink": comicLink,
            "comicName": comicName,
            "comicPage": comicPage,
            "artist": artist,
        }, function (response) {

    });
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendResponse({ "status": "Received" });
        switch(request.type) {
            case "parseEx":
                parseEx(request.srcUrl, request.pageUrl, request.domain, "https://exhentai.org/api.php");
                break;
            case "parseG.e":
                parseEx(request.srcUrl, request.pageUrl, request.domain, "http://g.ehentai.org/api.php");
                break;
            default:
                console.error("unrecognised message: ", request);
        }
    });
