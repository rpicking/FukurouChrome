
(function () {
    //"use strict";

    var save;

    function saveSettings() {
        var indicator = document.getElementById("indicator");
        //indicator.style.opacity = 1;

        // username
        var twitchnameInput = document.getElementById("twitch-username");
        var username = twitchnameInput.value;
        if (username != localStorage.username) {
            localStorage.username = username;
            chrome.extension.getBackgroundPage().start();
        }

        // redirect EHentai
        var redirectEH = document.getElementById("redirectEH").checked;
        chrome.storage.local.get('redirectEH', function (item) {
            if (redirectEH != item.redirectEH) {
                chrome.storage.local.set({ 'redirectEH': redirectEH });
            }
        });
        
        // build name/order change message
        var edit_folders = [];
        var folders = chrome.extension.getBackgroundPage().folders;
        
        $("#folderList").sortable("refreshPositions");
        var idsInOrder = $("#folderList").sortable("toArray");

        loop1:
        for (var i = 0; i < idsInOrder.length; ++i) {
            var uid = idsInOrder[i].replace("item-", "");
            var new_name = document.getElementById(idsInOrder[i]).getElementsByTagName("div")[0].innerText;

            loop2:
            for (var j = 0; j < folders.length; ++j) {
                if (uid === folders[j].uid) {
                    var tmp = { 'uid': uid };
                    var push_check = false;
                    if (new_name != folders[j].name) {
                        tmp['name'] = new_name;
                        push_check = true;
                    }
                    if ((i + 1) != folders[j].order) {
                        tmp['order'] = i + 1;
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
            return
        }

        var payload = {
            "task": "edit",
            "folders": JSON.stringify(edit_folders)
        };
        sendMessage(payload);


        setTimeout(function () {
            //indicator.style.opacity = 0;
        }, 4000);
    }

    function start() {
        // twitch.tv username
        var username = localStorage.username;
        var twitchnameInput = document.getElementById("twitch-username");

        console.log()
        if (username) {
            twitchnameInput.value = username;
        }

        // redirect from ehentai
        chrome.storage.local.get('redirectEH', function (item) {
            console.log(item.redirectEH);
            if (item.redirectEH) {
                document.getElementById("redirectEH").click();
            }
        });
        
        // setup save button
        save = document.getElementById("saveSettings");
        save.onclick = saveSettings;

        // populate list with folders
        var folders = chrome.extension.getBackgroundPage().folders;
        for (var i = 0; i < folders.length; ++i) {
            addElement(folders[i]['name'], folders[i]['uid']);
        }
    }
    
    start();
}());

// global variables
var curName = null;

$("#folderList").sortable({
    cancel: ".fixed",
    axis: 'y'
});

// activate tabs
$('#main-region a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
})

// activate tooltips
$('span').tooltip();

// As you are using jQuery 1.6 'live' allows you to bind events to elements that do not exist yet
$('body').on('click', '.delete', function () {
    var uid = $(this).parent()[0].id.replace("item-", "");
    edit_folders = [];
    edit_folders.push({ 'uid': uid });
    payload = {
        'task': 'delete',
        'folders': JSON.stringify(edit_folders)
    }
    sendMessage(payload);
    $(this).parent().remove();
});

$(document).keypress(function (e) {
    var input = document.getElementsByClassName("editItem");
    if (e.which == 13 && input.length > 0) {
        input[0].blur();
    }
});

$('body').on('blur', '.editItem', closeInput);
$('body').on('dblclick', '.item', function () {
    editItem(this);
});

document.getElementById("redirectEH").addEventListener("click", function () {
    toggleSub(this, 'on-redirectEH');
});


function toggleSub(evt, subToggle) {
    var x = document.getElementsByClassName(subToggle);
    $('.' + subToggle).each(function () {
        if ($(this).css("display") === 'none') {
            $(this).css('display', 'block');
        } else {
            $(this).css('display', 'none');
        }
    });

    $('.' + subToggle).each(function () {
        $(this).find('.toggle').each(function () {
            $(this).prop('checked', false);
        });
    });
}

function sendMessage(payload) {
    console.log(payload);
    chrome.runtime.sendMessage(payload, function (response) {

    });
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

    position = position || listItems.length + 1;    // position defaults to end of list

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
