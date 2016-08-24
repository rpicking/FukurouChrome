//var xhr = new XMLHttpRequest();
//var url = "http://g.e-hentai.org/api.php"
//var params = {
//    "method": "gdata",
//    "gidlist": [
//        [782318, "2fb82c1c34"]
//    ],
//    "namespace": 1
//}
//xhr.open("POST", url, true);
//xhr.onreadystatechange = function () {
//    if (xhr.readyState == 4 && xhr.status == 200) {
//        console.log(xhr.responseText)
//    }
//}
//xhr.send(JSON.stringify(params))


//document.addEventListener("mousedown", function (event) {
//    if (event.button == 2) {
//        chrome.extension.sendRequest({ cmd: "create_menu" });
//    }
//}, true);

function parseEx() {
    var url = document.getElementById("i7").getElementsByTagName("a");
    if (url.length == 0) {
        return "";
    }
    return url[0].href;
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch(request.type) {
            case "parseEx":
                sendResponse(parseEx());
                break;
            default:
                console.error("unrecognised message: ", request);
        }
    });