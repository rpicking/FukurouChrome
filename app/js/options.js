
(function () {
    //"use strict";

    var usernameInput;
    var save;

    function saveSettings() {
        localStorage.username = usernameInput.value;

        chrome.extension.getBackgroundPage().start();

        var indicator = document.getElementById("indicator");
        indicator.style.opacity = 1;

        setTimeout(function () {
            indicator.style.opacity = 0;
        }, 4000);
    }

    function start() {
        var username = localStorage.username;
        usernameInput = document.getElementById("username");

        if (username) {
            usernameInput.value = username;
        }
        
        save = document.getElementById("saveButton");
        save.onclick = saveSettings;
    }


    start();
}());


// event listeners
document.getElementById("button1").addEventListener("click", function () {
    addElement('bigdog', 2);
});

document.getElementById("button2").addEventListener("click", function () {
    addElement('cat', 1000);
});
document.getElementById("button3").addEventListener("click", function () {
    printList();
});

[].forEach.call(document.getElementsByClassName("item"), function (el) {
    el.addEventListener('dblclick', function () {
        editItem(this);
    });
});


$("#folderList").sortable({
    cancel: ".fixed",
    axis: 'y',
    update: function (event, ui) {
        printList();
    }
});

// As you are using jQuery 1.6 'live' allows you to bind events to elements that do not exist yet
$('body').on('click', '.delete', function () {
    // Find the parent of the element clicked (an li) and remove it
    $(this).parent().remove();
});
/*$('.delete').live('click', function () {
    // Find the parent of the element clicked (an li) and remove it
    $(this).parent().remove();
});*/

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

function closeInput() {
    var inputParent = document.getElementsByClassName("editItem")[0].parentElement;
    var value = $(".editItem").val();
    inputParent.innerHTML = value;
}

function editItem(currentEle) {
    var test = currentEle.getElementsByTagName("div")[0];
    var value = test.innerText;
    test.innerHTML = '<input class="editItem" type="text" value="' + value + '" />';
    document.getElementsByClassName("editItem")[0].focus();
}

function map(htmlArray) {
    var ret = [];
    for (var i = 0; i < htmlArray.length; ++i) {
        ret.push(htmlArray[i].outerText);
    }
    return ret;
}

function printList() {
    $("#folderList").sortable("refreshPositions");
    var idsInOrder = $("#folderList").sortable("toArray");
    console.log(idsInOrder);
}

function addElement(text, position) {
    var uid = "7";	//fix me later in host

    var list = document.getElementById("folderList");
    var listItems = list.getElementsByTagName("li");
    var li = document.createElement("li");
    li.id = "item-" + uid;
    li.className = "ui-state-default item";

    var arrow = document.createElement("span");
    arrow.className = "arrow fa fa-arrows-v fa-fw";
    arrow.setAttribute("aria-hidden", true);
    li.appendChild(arrow);

    var trash = document.createElement("span");
    trash.className = "delete fa fa-trash fa-fw pull-right";
    trash.setAttribute("aria-hidden", true);
    li.appendChild(trash);

    var itemText = document.createElement("div");
    li.appendChild(itemText);
    itemText.appendChild(document.createTextNode(text));

    if (position >= listItems.length) {
        list.append(li);
        return;
    }
    list.insertBefore(li, listItems[position]);
}
