(function() {
    //"use strict";

    var save;

    function saveSettings() {
        var indicator = document
            .getElementById("saveSettings")
            .getElementsByTagName("span")[0];
        indicator.classList.add("glyphicon", "glyphicon-refresh", "spinning");

        // redirect EHentai
        var redirectEH = document.getElementById("redirectEH").checked;
        chrome.storage.local.get("redirectEH", function(item) {
            if (redirectEH != item.redirectEH) {
                chrome.storage.local.set({ redirectEH: redirectEH });
            }
        });
        // redirect EH fjorded/removed Galleries/Images
        var redirectEH_un = document.getElementById("redirectEH_un").checked;
        chrome.storage.local.get("redirectEH_un", function(item) {
            if (redirectEH_g != item.redirectEH_un) {
                chrome.storage.local.set({ redirectEH_un: redirectEH_un });
            }
        });
        // redirect EH Galleries
        var redirectEH_g = document.getElementById("redirectEH_g").checked;
        chrome.storage.local.get("redirectEH_g", function(item) {
            if (redirectEH_g != item.redirectEH_g) {
                chrome.storage.local.set({ redirectEH_g: redirectEH_g });
            }
        });
        // redirect EH Images
        var redirectEH_i = document.getElementById("redirectEH_i").checked;
        chrome.storage.local.get("redirectEH_i", function(item) {
            if (redirectEH_i != item.redirectEH_i) {
                chrome.storage.local.set({ redirectEH_i: redirectEH_i });
            }
        });
        // redirect EH Settings
        var redirectEH_s = document.getElementById("redirectEH_s").checked;
        chrome.storage.local.get("redirectEH_s", function(item) {
            if (redirectEH_s != item.redirectEH_s) {
                chrome.storage.local.set({ redirectEH_s: redirectEH_s });
            }
        });
        // redirect EH Torrents
        var redirectEH_t = document.getElementById("redirectEH_t").checked;
        chrome.storage.local.get("redirectEH_t", function(item) {
            if (redirectEH_t != item.redirectEH_t) {
                chrome.storage.local.set({ redirectEH_t: redirectEH_t });
            }
        });
        // redirect EH Favorites
        var redirectEH_f = document.getElementById("redirectEH_f").checked;
        chrome.storage.local.get("redirectEH_f", function(item) {
            if (redirectEH_f != item.redirectEH_f) {
                chrome.storage.local.set({ redirectEH_f: redirectEH_f });
            }
        });
        // redirect EH My Galleries
        var redirectEH_my = document.getElementById("redirectEH_my").checked;
        chrome.storage.local.get("redirectEH_my", function(item) {
            if (redirectEH_my != item.redirectEH_my) {
                chrome.storage.local.set({ redirectEH_my: redirectEH_my });
            }
        });

        // Context Menu Opening Type
        var contextOpenType = $("#contextOpeningDropdown option:selected").val();
        chrome.storage.local.get("contextOpenType", function(item) {
            if (contextOpenType != item.contextOpenType) {
                chrome.storage.local.set({ contextOpenType: contextOpenType });
            }
        });

        // twitch username
        var twitchnameInput = document.getElementById("twitch-username");
        var username = twitchnameInput.value;
        if (username != localStorage.username) {
            localStorage.username = username;
            chrome.extension.getBackgroundPage().start();
        }

        // build name/order change message
        var edit_folders = [];
        var folders = chrome.extension.getBackgroundPage().folders;

        $("#folderList").sortable("refreshPositions");
        var idsInOrder = $("#folderList").sortable("toArray");

        loop1: for (var i = 0; i < idsInOrder.length; ++i) {
            var uid = idsInOrder[i].replace("item-", "");
            var new_name = document
                .getElementById(idsInOrder[i])
                .getElementsByTagName("div")[0].innerText;

            loop2: for (var j = 0; j < folders.length; ++j) {
                if (uid === folders[j].uid) {
                    var tmp = { uid: uid };
                    var push_check = false;
                    if (new_name != folders[j].name) {
                        tmp["name"] = new_name;
                        push_check = true;
                    }
                    if (i != j) {
                        tmp["order"] = i + 1; // ordering starts at 1 not 0 in db FIXME
                        push_check = true;
                    }
                    if (push_check) {
                        edit_folders.push(tmp);
                    }
                    break loop2;
                }
            }
        }
        if (edit_folders.length === 0) {
            setTimeout(function() {
                indicator.classList.remove("spinning", "glyphicon-refresh");
                indicator.classList.add("glyphicon-ok");
                setTimeout(function() {
                    indicator.classList.remove("glyphicon-ok", "glyphicon");
                }, 4000);
            }, 1000);
            return;
        }

        var payload = {
            task: "edit",
            folders: JSON.stringify(edit_folders)
        };
        sendMessage(payload);

        checkStatus("edit");
    }

    // loads settings onto page
    function start() {
        // host check
        var hostStatus = document.getElementById("hostStatus");
        if (chrome.extension.getBackgroundPage().port === null) {
            hostStatus.classList.add("glyphicon", "glyphicon-remove");
        } else {
            hostStatus.classList.add("glyphicon", "glyphicon-ok");
        }

        // twitch.tv username
        var username = localStorage.username;
        var twitchnameInput = document.getElementById("twitch-username");

        if (username) {
            twitchnameInput.value = username;
        }

        // redirect from EH
        chrome.storage.local.get(null, function(item) {
            if (item.redirectEH) {
                document.getElementById("redirectEH").click();
                // redirect fjorded/removed galleries/images
                if (item.redirectEH_un) {
                    document.getElementById("redirectEH_un").click();
                }
                // redirect EH Galleries
                if (item.redirectEH_g) {
                    document.getElementById("redirectEH_g").click();
                }
                // redirect EH Images
                if (item.redirectEH_i) {
                    document.getElementById("redirectEH_i").click();
                }
                // redirect EH Settings
                if (item.redirectEH_s) {
                    document.getElementById("redirectEH_s").click();
                }
                // redirect EH Torrents
                if (item.redirectEH_t) {
                    document.getElementById("redirectEH_t").click();
                }
                // redirect EH Favorites
                if (item.redirectEH_f) {
                    document.getElementById("redirectEH_f").click();
                }
                // redirect EH My Galleries
                if (item.redirectEH_my) {
                    document.getElementById("redirectEH_my").click();
                }
            }

            if (item.contextOpenType) {
                $("select[name=contextOpening]").val(item.contextOpenType);
                //$('.selectpicker').selectpicker('refresh');
            }
        });

        // setup save button
        save = document.getElementById("saveSettings");
        save.onclick = saveSettings;

        // populate list with folders
        var folders = chrome.extension.getBackgroundPage().folders;
        for (var i = 0; i < folders.length; ++i) {
            addElement(folders[i]["name"], folders[i]["uid"]);
        }
    }

    start();
})();

// global variables
var curName = null;

$("#folderList").sortable({
    cancel: ".fixed",
    axis: "y"
});

// activate tabs
$("#main-region a").click(function(e) {
    e.preventDefault();
    $(this).tab("show");
});

// activate tooltips
$("span").tooltip();

// As you are using jQuery 1.6 'live' allows you to bind events to elements that do not exist yet
$("body").on("click", ".delete", function() {
    var uid = $(this)
        .parent()[0]
        .id.replace("item-", "");
    edit_folders = [];
    edit_folders.push({ uid: uid });
    payload = {
        task: "delete",
        folders: JSON.stringify(edit_folders)
    };
    sendMessage(payload);
    $(this)
        .parent()
        .remove();
});

$(document).keypress(function(e) {
    var input = document.getElementsByClassName("editItem");
    if (e.which == 13 && input.length > 0) {
        input[0].blur();
    }
});

$("body").on("blur", ".editItem", closeInput);
$("body").on("dblclick", ".item", function() {
    editItem(this);
});

document
    .getElementById("content-scripts")
    .addEventListener("change", handleFileSelect, false);

// document.getElementById("content-script").addEventListener("input", function() {
//     console.log(file);
// });

function handleFileSelect(evt) {
    var files = evt.target.files;
    // files is a FileList of File objects. List some properties.
    for (var i = 0, f; (f = files[i]); i++) {
        console.log(f);
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {};
        })(f);
        reader.onloadend = function() {
            console.log(reader.result);
        };
        reader.readAsText(f);
    }
}

document.getElementById("redirectEH").addEventListener("click", function() {
    toggleSub(this, "on-redirectEH");
});

function toggleSub(evt, subToggle, ignored) {
    if (!ignored) {
        ignored = [];
    }

    $("." + subToggle).each(function() {
        if (
            !ignored.includes(
                $(this)
                    .find("input")
                    .attr("id")
            )
        ) {
            if ($(this).css("display") === "none") {
                $(this).css("display", "block");
            } else {
                $(this).css("display", "none");
            }
        }
    });

    // set sub options to false
    /*$('.' + subToggle).each(function () {
        $(this).find('.toggle').each(function () {
            $(this).prop('checked', false);
        });
    });*/
}

function checkStatus(payload) {
    chrome.extension.getBackgroundPage().status = payload;
    statusLoop();
}

function statusLoop() {
    var status = chrome.extension.getBackgroundPage().status;
    if (status === "") {
        var indicator = document
            .getElementById("saveSettings")
            .getElementsByTagName("span")[0];
        indicator.classList.remove("spinning", "glyphicon-refresh");
        indicator.classList.add("glyphicon-ok");
        setTimeout(function() {
            indicator.classList.remove("glyphicon-ok", "glyphicon");
        }, 4000);
        return;
    } else if (status === "failure") {
        chrome.extension.getBackgroundPage().status = "";
        var indicator = document
            .getElementById("saveSettings")
            .getElementsByTagName("span")[0];
        indicator.classList.remove("spinning", "glyphicon-refresh");
        indicator.classList.add("glyphicon-remove");
        setTimeout(function() {
            indicator.classList.remove("glyphicon-remove", "glyphicon");
        }, 3000);
        return;
    }
    setTimeout(function() {
        statusLoop();
    }, 1000);
}

function sendMessage(payload) {
    console.log(payload);
    chrome.runtime.sendMessage(payload, function(response) {});
}

// "sets" input into list item and if different send message to background to change
function closeInput() {
    var inputParent = document.getElementsByClassName("editItem")[0].parentElement;
    var value = $(".editItem").val();
    inputParent.innerHTML = value;
    $("#folderList").sortable("enable");
}

// enable editing of displayed name of list item
function editItem(currentEle) {
    $("#folderList").sortable("disable");

    var div = currentEle.getElementsByTagName("div")[0];
    var value = div.innerText;

    curName = value;
    div.innerHTML = '<input class="editItem" type="text" value="' + value + '" />';
    document.getElementsByClassName("editItem")[0].focus();
}

// creates new list element with id item- + uid and at given position
//      if position not set then defaults to end of list
function addElement(name, uid, position) {
    var list = document.getElementById("folderList");
    var listItems = list.getElementsByTagName("li");
    var li = document.createElement("li");

    position = position || listItems.length + 1; // position defaults to end of list

    li.id = "item-" + uid;
    li.className = "ui-state-default vcenter item";

    var arrow = document.createElement("span");
    arrow.className = "arrow fa fa-arrows-v fa-fw";
    arrow.setAttribute("aria-hidden", true);
    li.appendChild(arrow);

    var itemText = document.createElement("div");
    li.appendChild(itemText);
    itemText.appendChild(document.createTextNode(name));

    var trash = document.createElement("span");
    trash.className = "delete fa fa-trash fa-fw";
    trash.setAttribute("aria-hidden", true);
    li.appendChild(trash);

    if (position >= listItems.length) {
        list.append(li);
        return;
    }
    list.insertBefore(li, listItems[position]);
}
