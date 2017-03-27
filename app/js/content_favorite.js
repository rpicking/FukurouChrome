//document.addEventListener("mousedown", function (event) {
//    if (event.button == 2) {
//        chrome.extension.sendRequest({ cmd: "create_menu" });
//    }
//}, true);


function parseEhentai(srcUrl, pageUrl, folder, apiUrl) {
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
        send_message(srcUrl, pageUrl, folder, comicLink, comicName, comicPage, artist);
    });
}


function parseTumblr(info, folder) {
    if (info.hasOwnProperty("frameUrl")) {
        $.get(info.frameUrl).then(html => {
            var srcUrl = $(html).find('source').attr('src');
            send_message(srcUrl, info.pageUrl, folder);
        });
    }
    else {
        send_message(info.srcUrl, info.pageUrl, folder);
    }
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

// Sends required info back to background for passing to host
function send_message(srcUrl, pageUrl, folder, comicLink, comicName, comicPage, artist) {
    var domain = extractDomain(pageUrl);
    chrome.runtime.sendMessage({
            "task": "save",
            "srcUrl": srcUrl,
            "pageUrl": pageUrl,
            "domain": domain,
            "folder": folder,
            "comicLink": comicLink,
            "comicName": comicName,
            "comicPage": comicPage,
            "artist": artist,
        }, function (response) { });
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

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendResponse({ "status": "Received" });

        if (request.info.pageUrl.indexOf("exhentai.org") > -1) {
            parseEhentai(request.info.srcUrl, request.info.pageUrl, request.folder, "https://exhentai.org/api.php");
        }
        else if (request.info.pageUrl.indexOf("e-hentai.org") > -1) {
            parseEhentai(request.srcUrl, request.pageUrl, request.folder, "https://api.ehentai.org/api.php");
        }
        else if (request.info.pageUrl.indexOf("tumblr.com") > -1) {
            parseTumblr(request.info, request.folder);
        }
        else {  // no custom processing
            send_message(request.info.srcUrl, request.info.pageUrl, request.folder);
        }
    });


// testing largest image
function getMaxImage() {
    var maxDimension = 0;
    var maxImage = null;

    var imgElems = document.getElementsByTagName('img');
    for (var index in imgElems) {
        var img = imgElems[index];
        var currDimension = img.width * img.height;
        if (currDimension > maxDimension) {
            maxDimension = currDimension;
            maxImage = img;
        }
    }
    if (maxImage)
        return maxImage.src;
    return null;
}

function start() {
    var url = document.URL;
    if (url.indexOf("e-hentai.org") > -1) {
        chrome.storage.local.get('redirectEH', function (item) {
            if (item.redirectEH) {
                var redirect = [
                        "e-hentai.org/g/",
                        "e-hentai.org/s/"
                ];

                for (var i = 0; i < redirect.length; ++i) {
                    if (url.indexOf(redirect[i]) > -1) {
                        url = url.replace("-", 'x');
                        window.location.href = url;
                        return;
                    }
                }
            }
        });
    }
}

start();
