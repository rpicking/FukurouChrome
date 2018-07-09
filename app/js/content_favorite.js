// EH/EX
function setupEhentai() {
    // create flags
    var style = document.createElement("style");
    style.innerHTML =
        ".eh_flag {overflow: visible; position: absolute; height: 35px; top: 0px; right: 0px; }" +
        ".eh_flag_small {height: 23px; border-radius: 5px; margin-left: 6px; position: relative;}" +
        ".itd {position: relative}" +
        ".it5 a {overflow: hidden; max-width: 652px; max-height: 30px; white-space: nowrap; text-overflow: ellipsis; display: block;}" +
        ".gtr0 .it5 a:hover {overflow: visible; white-space: normal; position: absolute; max-height: auto; max-width: 786px; z-index: 99999; background-color: #4f535b;}" +
        ".gtr1 .it5 a:hover {overflow: visible; white-space: normal; position: absolute; max-height: auto; max-width: 786px; z-index: 99999; background-color: #363940;}";

    document.head.appendChild(style);
    placeFlags(["gtr0", "gtr1", "id1"], eh_api_url);

    // last item in gallery returns to gallery page
    var cur_url = window.location.href;
    $("#i1").on("click", "#next, #i3 a", function(event) {
        event.preventDefault();
        checkPageNumber();
    });
}

// EH/EX redirects to gallery page if going next on the last page
function checkPageNumber() {
    var pages = document.getElementById("i4").getElementsByTagName("span");
    if (pages[0].innerText === pages[1].innerText) {
        var gal_url = document.getElementById("i5").getElementsByTagName("a")[0].href;
        window.location.href = gal_url;
    }
}

function parseEhentai(srcUrl, pageUrl, uid, apiUrl) {
    var results = [];
    var galleryUrl = "";

    var elem = document.getElementsByClassName("gm");
    if (elem.length != 0) {
        // currently on gallery page
        galleryUrl = document.URL;
    } else {
        // not currently on gallery page
        gal = document.getElementById("i5");
        if (gal) {
            // currently in gallery slideshow
            galleryUrl = gal.getElementsByClassName("sb")[0].getElementsByTagName("a")[0]
                .href;
            bestimg = document.getElementById("i7").getElementsByTagName("a");
            if (bestimg.length > 0) {
                srcUrl = bestimg[0].href; //update srcUrl to larger image
            }
            var pageUrl = document.URL;
            comicPage = pageUrl.substring(pageUrl.indexOf("-") + 1);
        } else {
            // not in gallery slideshow
            var images = document.getElementsByTagName("img");
            var target;
            for (var i = 0; i < images.length; ++i) {
                if (images[i].src === srcUrl) {
                    target = images[i];
                    break;
                }
            }
            galleryUrl = target.parentNode.href;
        }
    }

    payload = {
        srcUrl: srcUrl,
        pageUrl: pageUrl,
        galleryUrl: clean_url(galleryUrl),
        uid: uid
    };
    send_dl_message(payload);
}

function parseTumblr(info, uid) {
    var payload = {};
    var srcUrl = info.srcUrl;
    var pageUrl = info.pageUrl;
    console.log(info);

    if (info.hasOwnProperty("linkUrl")) {
        link_parts = info.linkUrl.split("/");
        link_type = link_parts[link_parts.length - 2];
        if (link_type !== "post") {
            var image = $('*[src="' + info.srcUrl + '"]');

            // not in an iframe
            if (!image.length) image = hovered.path[0];
            else image = image[0];

            var pin_url = image.getAttribute("data-pin-url");
            if (pin_url) {
                pageUrl = pin_url;
            }
            var title = image.getAttribute("data-pin-description");
            if (title) {
                payload["title"] = title;
            }

            // not clicking on a modal on dashboard
            if (info.linkUrl.indexOf("dashboard") === -1) {
                check_if_file(info.linkUrl).then(function(isFile) {
                    srcUrl = info.linkUrl;
                    if (!isFile) {
                        // larger file modal
                        var larger_image = $('a[href="' + info.linkUrl + '"]').attr(
                            "data-big-photo"
                        );
                        if (larger_image) {
                            srcUrl = larger_image;
                        } else {
                            // link is to page containing navigation header and image
                            // this type is only used on images (confirmation needed)
                            var urlSplit = srcUrl.split("/").pop();
                            if (urlSplit.match(/^\S+\.[a-zA-Z0-9]{1,4}$/)) {
                                // modal non data-big-photo
                                srcUrl = info.srcUrl;
                            } else {
                                $.get(info.linkUrl).then(data => {
                                    srcUrl = $(data)
                                        .find("#content-image")
                                        .attr("data-src");

                                    // no content-image tag page with image (enlargable) with menu bar at top (go back and notifications/follow)
                                    if (!srcUrl) {
                                        srcUrl = $(data)
                                            .find("main img")
                                            .attr("src");
                                    }

                                    console.log("media with menu bar on top");
                                    payload["srcUrl"] = srcUrl;
                                    payload["pageUrl"] = pageUrl;
                                    payload["uid"] = uid;
                                    send_dl_message(payload);
                                });
                                return;
                            }
                        }
                    }

                    console.log("linkUrl is to file");
                    payload["srcUrl"] = srcUrl;
                    payload["pageUrl"] = pageUrl;
                    payload["uid"] = uid;
                    send_dl_message(payload);
                });
                return;
            }
        }
    } else if (info.hasOwnProperty("frameUrl")) {
        $.get(info.frameUrl).then(data => {
            srcUrl = $(data)
                .find("source")
                .attr("src");

            console.log("frameUrl");
            payload["srcUrl"] = srcUrl;
            payload["pageUrl"] = pageUrl;
            payload["uid"] = uid;
            send_dl_message(payload);
        });
        return;
    }

    // video on dashboard/page (not its own)
    if (hovered.fromElement) {
        var video_parent = hovered.fromElement.parentElement;
        var video = video_parent.getElementsByTagName("video")[0];
        if (video) {
            var source = video.getElementsByTagName("source")[0];

            console.log("video");
            payload["poster"] = video.poster;
            payload["srcUrl"] = source.src;
            payload["pageUrl"] = pageUrl;
            payload["uid"] = uid;
            send_dl_message(payload);
            return;
        }
    }

    // default
    console.log("default");
    payload["srcUrl"] = srcUrl;
    payload["pageUrl"] = pageUrl;
    payload["uid"] = uid;
    send_dl_message(payload);
}

$(function() {
    var frames = document.getElementsByTagName("iframe");
    for (var i = 0; i < frames.length; ++i) {
        id = frames[i].getAttribute("id");
        if (id && id !== "ga_target") {
            frames[i].contentWindow.document.addEventListener(
                "contextmenu",
                function(e) {
                    hovered = e;
                },
                true
            );
        }
    }

    return;
});

document.addEventListener(
    "contextmenu",
    function(e) {
        hovered = e;
    },
    true
);

var hovered;

function parsePixiv(info, uid) {
    //console.log(info);
    var payload = {
        pageUrl: info.pageUrl,
        uid: uid,
        headers: { Referer: info.pageUrl }
    };

    if (!info.hasOwnProperty("srcUrl")) {
        if (info.hasOwnProperty("linkUrl")) {
            // side menu item
            var srcUrl = info.linkUrl.substring(
                info.linkUrl.indexOf("www.pixiv.net") + 13
            ); // remove domain
            payload["srcUrl"] = $('a[href="' + srcUrl + '"]')
                .find("img")
                .attr("src");
        } else {
            payload["srcUrl"] = $(".ui-modal-trigger")
                .find("img")
                .attr("src");
        }
    } else {
        payload["srcUrl"] = info.srcUrl;
    }

    send_dl_message(payload);
}

function parseTsumino(info, uid) {
    var payload = {
        pageUrl: info.pageUrl,
        uid: uid,
        srcUrl: info.srcUrl
    };

    var buttons = document.getElementsByClassName("button-stack");
    var title = "";
    for (var i = 0; i < buttons.length; ++i) {
        if (buttons[i].textContent == "RETURN") {
            title = buttons[i].href;
        }
    }

    if (title) {
        title = title.substring(title.lastIndexOf("/") + 1);

        var pageNum = info.pageUrl.split("/");
        pageNum = pageNum[pageNum.length - 1];
        anchorPos = pageNum.indexOf("#");

        if (anchorPos > -1) {
            pageNum = pageNum.substring(anchorPos + 1);
        }
        pageNum = ("000" + pageNum).substr(-3);
    }
    payload["filename"] = title + " - " + pageNum;
    send_dl_message(payload);
}

// "cleans" url string removing fragments and queries
function clean_url(url) {
    url = url.split("?")[0]; // remove queries
    url = url.split('"')[0]; // remove fragment
    return url;
}

// returns true if url leads to a file
function check_if_file(url) {
    return new Promise(function(resolve, reject) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("HEAD", url);
        xhttp.onreadystatechange = function() {
            if (this.readyState == this.DONE) {
                var test = this.getResponseHeader("Content-Type");
                if (test === null || test.indexOf("text/html") > -1) {
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
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", apiUrl, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                resolve(JSON.parse(xhr.responseText));
            }
        };
        xhr.send(JSON.stringify(data));
    });
}

// Sends required download info back to background for passing to host
function send_dl_message(payload) {
    hovered = null;
    //console.log(payload);

    payload["cookie_domain"] = extractDomain(payload.pageUrl);
    payload["domain"] = window.location.hostname;
    payload["task"] = "save";
    chrome.runtime.sendMessage(payload, function(response) {});
}

// returns domain name from url
function extractDomain(url) {
    var preIndex = url.indexOf("://") + 3;
    var searchIndex = url.substring(preIndex).indexOf("/");
    if (searchIndex > -1) {
        url = url.slice(0, preIndex + searchIndex);
    }
    searchIndex = url.substring(preIndex).indexOf(":");
    if (searchIndex > -1) {
        url = url.slice(0, preIndex + searchIndex);
    }
    return url;
}

// MESSAGES FROM BACKGROUND PAGE
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //console.log(request);
    sendResponse({ status: "Received" });
    if (request.task === "download") {
        var pageUrl = request.info.pageUrl;
        if (pageUrl.indexOf("exhentai.org") > -1) {
            parseEhentai(
                request.info.srcUrl,
                request.info.pageUrl,
                request.uid,
                ex_api_url
            );
        } else if (pageUrl.indexOf("e-hentai.org") > -1) {
            parseEhentai(request.srcUrl, request.pageUrl, request.uid, eh_api_url);
        } else if (pageUrl.indexOf("tumblr.com") > -1) {
            parseTumblr(request.info, request.uid);
        } else if (pageUrl.indexOf("pixiv.net") > -1) {
            parsePixiv(request.info, request.uid);
        } else if (pageUrl.indexOf("tsumino.com") > -1) {
            parseTsumino(request.info, request.uid);
        } else {
            // no custom processing
            var payload = {};
            if (request.info.hasOwnProperty("srcUrl")) {
                payload["srcUrl"] = request.info.srcUrl;
            } else {
                if (request.info.hasOwnProperty("linkUrl")) {
                    payload["srcUrl"] = request.info.linkUrl;
                } else {
                    payload["srcUrl"] = request.info.srcUrl;
                }
            }
            payload["pageUrl"] = request.info.pageUrl;
            payload["uid"] = request.uid;
            send_dl_message(payload);
        }
    }
});

// testing largest image
function getMaxImage() {
    var maxDimension = 0;
    var maxImage = null;

    var imgElems = document.getElementsByTagName("img");
    for (var index in imgElems) {
        var img = imgElems[index];
        var currDimension = img.width * img.height;
        if (currDimension > maxDimension) {
            maxDimension = currDimension;
            maxImage = img;
        }
    }
    if (maxImage) return maxImage.src;
    return null;
}

function redirectEH(settings, url) {
    var redirect = []; // array containing redirect url patterns

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
        redirect.push([
            "upload.e-hentai.org/manage.php",
            "https://exhentai.org/upload/manage.php"
        ]);
    }

    for (var i = 0; i < redirect.length; ++i) {
        if (url.indexOf(redirect[i][0]) > -1) {
            if (redirect[i][1] === "") {
                url = url.replace("-", "x");
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

    // modal popup
    modal = document.createElement("div");
    modal.setAttribute(
        "style",
        "display: none; position: fixed; z-index: 1; left: 0; right: 0; top: 0; width:100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.4);"
    );

    modalContent = document.createElement("div");
    modalContent.setAttribute(
        "style",
        "background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%;"
    );
    modal.appendChild(modalContent);

    close = document.createElement("span");
    close.innerHTML = "&times;";
    close.setAttribute(
        "style",
        "color: #aaa; float: right; font-size: 28px; font-weight: bold;"
    );
    close.onclick = function() {
        modal.style.display = "none";
        clearInterval(countdown);
    };
    modalContent.appendChild(close);

    text = document.createElement("p");
    modalContent.appendChild(text);

    document.body.appendChild(modal);

    modal.style.display = "block";

    if (wait === undefined) {
        wait = 3; // default wait time in seconds
    }
    if (wait > 0) {
        text.innerText = "Redirecting to EX in " + wait;
    } else {
        text.innerText = "Redirecting to EX";
    }

    var countdown = setInterval(function() {
        wait--;
        if (wait < 0) {
            clearInterval(countdown);
            window.location.href = destination;
        } else {
            console.log("wait here for " + wait + " more seconds");
            text.innerText = "Redirecting to EX in " + wait;
        }
    }, 1000);
}

// places flags on galleries based on language
function placeFlags(classes, apiUrl) {
    var api_max_length = 25;
    var elems = classes.map(function(x) {
        return Array.prototype.slice.call(document.getElementsByClassName(x));
    });
    var all = elems[0];
    for (var i = 1; i < elems.length; ++i) {
        all = all.concat(elems[i]);
    }

    var gidlist = [];
    // max length of api requests 25
    for (var i = 0; i < all.length; i += api_max_length) {
        gidlist.push(all.slice(i, i + api_max_length));
    }

    gidlist.forEach(function(elems) {
        var ids = elems.map(function(e) {
            var anchor = e.getElementsByClassName("it5")[0];
            if (!anchor) {
                // not in list view
                anchor = e.getElementsByClassName("id3")[0];
            }
            anchor = anchor.firstElementChild.href.split("/");
            return [anchor[4], anchor[5]];
        });
        var gdata = { method: "gdata", gidlist: ids, namespace: 1 };
        send_req(apiUrl, gdata).then(function(response) {
            //console.log(response);
            elems.forEach(function(e, i, _) {
                var language = "";
                var tags = response.gmetadata[i].tags;
                for (var j = 0; j < tags.length; ++j) {
                    var parts = tags[j].split(":");
                    if (
                        parts[0] === "language" &&
                        parts[1] != "translated" &&
                        parts[1] != "rewrite"
                    ) {
                        language = parts[1];
                        break;
                    } else if (parts[0] === "reclass") {
                        response.gmetadata[i].reclass = parts[1];
                    }
                }
                if (!language) {
                    if (
                        response.gmetadata[i].category === "Western" ||
                        response.gmetadata[i].reclass === "western"
                    ) {
                        language = "english";
                    } else if (
                        response.gmetadata[i].category === "Manga" ||
                        response.gmetadata[i].category === "Doujinshi" ||
                        response.gmetadata[i].reclass === "manga" ||
                        response.gmetadata[i].reclass === "doujinshi"
                    ) {
                        language = "japanese";
                    }
                } else if (language == "text cleaned") {
                    return;
                }
                placeFlag(e, language);
            });
        });
    });
}

function placeFlag(e, language) {
    if (!language || language === "speechless") {
        return;
    }

    var flag = document.createElement("img");
    flag.classList.add("eh_flag");
    flag.src = chrome.extension.getURL("flags/" + language + ".svg");

    var target = e.querySelector(".id3 > a");

    if (!target) {
        target = e.querySelector(".itd");
        flag.classList.add("eh_flag_small");
    }

    target.appendChild(flag);
}

var eh_api_url = "https://e-hentai.org/api.php";
var ex_api_url = "https://exhentai.org/api.php";

$(document).ready(function() {
    var url = document.URL;
    if (url.indexOf("e-hentai.org") > -1) {
        setupEhentai();

        // redirect to ex based on setting
        chrome.storage.local.get(null, function(item) {
            if (item.redirectEH) {
                redirectEH(item, url);
            }
        });
        return;
    } else if (url.indexOf("exhentai.org") > -1) {
        setupEhentai();
        return;
    }

    // tumblr video volume control
    // get all iframes
    // send request getting document for iframes
    // set volume of <video> to default
    // on play show volume
});
