//document.addEventListener("mousedown", function (event) {
//    if (event.button == 2) {
//        chrome.extension.sendRequest({ cmd: "create_menu" });
//    }
//}, true);


function parseEhentai(srcUrl, pageUrl, uid, apiUrl) {
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
    var id = [splitlink[4], splitlink[5]];
    var gdata = { "method": "gdata", "gidlist": [id], "namespace": 1 };
    send_req(apiUrl, gdata).then(function (response) {
        //console.log(response);
        comicName = response.gmetadata[0].title;
        len = response.gmetadata[0].tags.length;
        for (var i = 0; i < len; ++i) {
            if (response.gmetadata[0].tags[i].startsWith("artist:")) {  // tag is artist
                artist = response.gmetadata[0].tags[i]  
                artist = artist.substring(artist.indexOf(":") + 1); // remove artist: from tag
            }
        }
        payload = {
            "srcUrl": srcUrl,
            "pageUrl": pageUrl,
            "comicLink": comicLink,
            "comicName": comicName,
            "artist": artist,
            "uid": uid
        }
        send_message(payload);
    });
}


function parseTumblr(info, uid) {
    //console.log(info);
    var payload = {};
    var srcUrl = info.srcUrl;

    if (info.hasOwnProperty("linkUrl")) {
        isfile(info.linkUrl).then(function (file) {
            if (file) {
                srcUrl = info.linkUrl;
            }
            else {
                var larger_image = $('a[href="' + info.linkUrl + '"]').attr('data-big-photo');
                if (larger_image) {
                    srcUrl = larger_image;
                }
            }

            payload["srcUrl"] = srcUrl;
            payload["pageUrl"] = info.pageUrl;
            payload["uid"] = uid;
            send_message(payload);
        });
        return;
    } else if (info.hasOwnProperty("frameUrl")) {
        $.get(info.frameUrl).then(html => {
            srcUrl = $(html).find('source').attr('src');
            payload["srcUrl"] = srcUrl;
            payload["pageUrl"] = info.pageUrl;
            payload["uid"] = uid;
            send_message(payload);
        });
        return;
    }
    // default
    payload["srcUrl"] = srcUrl;
    payload["pageUrl"] = info.pageUrl;
    payload["uid"] = uid;
    send_message(payload);
}


function parsePixiv(info, uid) {
    //console.log(info);
    var payload = {
        "pageUrl": info.pageUrl,
        "uid": uid,
        "headers": { "Referer": info.pageUrl }
    };

    if (!info.hasOwnProperty("srcUrl")) {
        if (info.hasOwnProperty("linkUrl")) {   // side menu item
            var srcUrl = info.linkUrl.substring(info.linkUrl.indexOf("www.pixiv.net") + 13);    // remove domain
            payload['srcUrl'] = $('a[href="' + srcUrl + '"]').find('img').attr('src');

        }
        else {
            payload['srcUrl'] = $('.ui-modal-trigger').find('img').attr('src');
        }
    }
    else {
        payload['srcUrl'] = info.srcUrl;
    }

    send_message(payload);
}

// returns true if url leads to a file
function isfile(url) {
    return new Promise(function (resolve, reject) {
        var xhttp = new XMLHttpRequest();
        xhttp.open('HEAD', url);
        xhttp.onreadystatechange = function () {
            if (this.readyState == this.DONE) {
                var test = this.getResponseHeader("Content-Type");
                if ((test === null) || (test.indexOf("text/html") > -1)) {
                    resolve(false);
                }
                resolve(true);
            }
        };
        xhttp.send();
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

// Sends required info back to background for passing to host
function send_message(payload) {
    payload['cookie_domain'] = extractDomain(payload.pageUrl);
    payload['domain'] = window.location.hostname;
    payload['task'] = 'save';
    //console.log(payload);
    chrome.runtime.sendMessage(payload, function (response) { });
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

// messages from Background
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        sendResponse({ "status": "Received" });

        if (request.info.pageUrl.indexOf("exhentai.org") > -1) {
            parseEhentai(request.info.srcUrl, request.info.pageUrl, request.uid, ex_api_url);
        }
        else if (request.info.pageUrl.indexOf("e-hentai.org") > -1) {
            parseEhentai(request.srcUrl, request.pageUrl, request.uid, eh_api_url);
        }
        else if (request.info.pageUrl.indexOf("tumblr.com") > -1) {
            parseTumblr(request.info, request.uid);
        }
        else if (request.info.pageUrl.indexOf("pixiv.net") > -1) {
            parsePixiv(request.info, request.uid);
        }
        else {  // no custom processing
            var payload = {};
            payload["srcUrl"] = request.info.srcUrl;
            payload["pageUrl"] = request.info.pageUrl;
            payload["uid"] = request.uid;
            send_message(payload);
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

function redirectEH(settings, url) {
    var redirect = [];  // array containing redirect url patterns

    // redirect EH fjorded/removed galleries/images
    if (settings.redirectEH_un) {
        //console.log(document.title);
        if (document.title.indexOf("Gallery Not Available") > -1) {
            redirectPage(url.replace("-", "x"), 0);
            return;
        }
    }
    // redirect EH Galleries
    if (settings.redirectEH_g) {
        redirect.push(["e-hentai.org/g/", ""]);
    }
    // redirect EH Images
    if (settings.redirectEH_i) {
        redirect.push(["e-hentai.org/s/", ""]);
    }
    // redirect EH Settings
    if (settings.redirectEH_s) {
        redirect.push(["e-hentai.org/uconfig.php", ""]);
    }
    // redirect EH Torrents
    if (settings.redirectEH_t) {
        redirect.push(["e-hentai.org/torrents.php", ""]);
    }
    // redirect EH Favorites
    if (settings.redirectEH_f) {
        redirect.push(["e-hentai.org/favorites.php", ""]);
    }
    // redirect EH My Galleries
    if (settings.redirectEH_my) {
        redirect.push(["upload.e-hentai.org/manage.php", "https://exhentai.org/upload/manage.php"]);
    }

    for (var i = 0; i < redirect.length; ++i) {
        if (url.indexOf(redirect[i][0]) > -1) {
            if (redirect[i][1] === "") {
                url = url.replace("-", 'x');
            } else {
                url = redirect[i][1];
            }
                        
            redirectPage(url);
            return;
        }
    }
}

// redirects current window to destination
function redirectPage(destination, wait) {
    console.log("Redirecting");
    if(wait === undefined) {
        wait = 3;   // default wait time in seconds
    }
    var countdown = setInterval(function () {
        wait--;
        if (wait < 0) {
            clearInterval(countdown);
            window.location.href = destination;
        } else {
            console.log('wait here for ' + count + ' more seconds');
        }
    }, 1000);
}

// places flags on galleries based on language
function placeFlags(classes, apiUrl) {
    var api_max_length = 25;
    var elems = classes.map(function (x) {
        return Array.prototype.slice.call(document.getElementsByClassName(x));
    });
    var all = elems[0];
    for (var i = 1; i < elems.length; ++i) {
        all = all.concat(elems[i]);
    }

    var gidlist = [];
    // max length of api requests 25
    for (var i = 0; i < all.length; i += api_max_length) {
        gidlist.push(all.slice(i, i + api_max_length))
    }

    gidlist.forEach(function (elems) {
        var ids = elems.map(function (e) {
            var anchor = (e.getElementsByClassName('it5')[0]);
            if (!anchor) {  // not in list view
                anchor = (e.getElementsByClassName('id3')[0]);
            }
            anchor = anchor.firstElementChild.href.split('/');
            return [anchor[4], anchor[5]];
        });
        var gdata = { "method": "gdata", "gidlist": ids, "namespace": 1 };
        send_req(apiUrl, gdata).then(function (response) {
            //console.log(response);
            elems.forEach(function (e, i, _) {
                var language = '';
                var tags = response.gmetadata[i].tags;
                for (var j = 0; j < tags.length; ++j) {
                    var parts = tags[j].split(":");
                    if ((parts[0] === 'language') && (parts[1] != 'translated') && (parts[1] != 'rewrite')) {
                        language = parts[1];
                        break;
                    }
                    else if (parts[0] === 'reclass') {
                        response.gmetadata[i].reclass = parts[1];
                    }
                }
                if (!language) {
                    if ((response.gmetadata[i].category === 'Western') ||
                        (response.gmetadata[i].reclass === 'western')) {
                        language = 'english';
                    }
                    else if ((response.gmetadata[i].category === 'Manga') ||
                        (response.gmetadata[i].category === 'Doujinshi') ||
                        (response.gmetadata[i].reclass === 'manga') ||
                        (response.gmetadata[i].reclass === 'doujinshi')) {
                        language = 'japanese';
                    }
                }
                placeFlag(e, language);
            });
        });
    });
}


function placeFlag(e, language) {
    if (!language || (language === 'speechless')) {
        return;
    }

    var flag = document.createElement('img');
    flag.classList.add('eh_flag');
    flag.src = chrome.extension.getURL("flags/" + language + ".svg");

    var target = e.querySelector('.id3 > a');

    if (!target) {
        target = e.querySelector('.itd');
        flag.classList.add('eh_flag_small');
    }

    target.appendChild(flag);
}

function start() {
    var url = document.URL;
    if (url.indexOf("e-hentai.org") > -1) {
        chrome.storage.local.get(null, function (item) {
            if (item.redirectEH) {
                redirectEH(item, url);
            }
        });

        placeFlags(["gtr0", "gtr1", "id1"], eh_api_url);
        return;
    }
    else if (url.indexOf("exhentai.org") > -1) {
        placeFlags(["gtr0", "gtr1", "id1"], ex_api_url);
        return;
    }
}

var eh_api_url = "https://e-hentai.org/api.php";
var ex_api_url = "https://exhentai.org/api.php";
var style = document.createElement('style');
style.innerHTML = '.eh_flag {overflow: visible; position: absolute; height: 35px; top: 0px; right: 0px; }' +
                    '.eh_flag_small {height: 23px; border-radius: 5px; margin-left: 6px; position: relative;}' +
                    '.itd {position: relative}' +
                    '.it5 a {overflow: hidden; max-width: 652px; max-height: 30px; white-space: nowrap; text-overflow: ellipsis; display: block;}' +
                    '.gtr0 .it5 a:hover {overflow: visible; white-space: normal; position: absolute; max-height: auto; max-width: 786px; z-index: 99999; background-color: #4f535b;}' +
                    '.gtr1 .it5 a:hover {overflow: visible; white-space: normal; position: absolute; max-height: auto; max-width: 786px; z-index: 99999; background-color: #363940;}';
document.head.appendChild(style);

$(document).ready(function () {
    // tumblr video volume control
    // get all iframes
    // send request getting document for iframes
    // set volume of <video> to default
    // on play show volume 
});

start();
