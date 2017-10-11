Fukurou Chrome Extension
-------------
Fukurou is an extension for the Chrome web browser that was created to learn javascript/html/css
and add functionality that was unavailable from other applications.  

It not only adds one click downloading of files to custom folders (through the FukurouViewer application)
but adds custom download behavior to get optimal formats/files and additionally shows your followed 
streamers on Twitch.TV that are live.

[![One-Click Downloading](https://i.gyazo.com/cc363d54038030f68882dd079fd837b7.gif)](https://gyazo.com/cc363d54038030f68882dd079fd837b7)

When used in conjunction with the [FukurouViewer Application](https://github.com/rpicking/FukurouViewer), you can download to custom
saved directories, edit miscellaneous settings that add simplicity to downloading of files
on supported websites, and perform reverse searches of images to popular sites.

[![Reverse Image Searching](https://i.gyazo.com/9ce503ba13b57133f7e2daeed421d123.gif)](https://gyazo.com/9ce503ba13b57133f7e2daeed421d123)

The settings page allows editing of extension settings, modification of existing favorite folders, and viewing
connection status to the FukurouViewer host application (for one-click downloading).

[![Extension Settings Page](https://i.gyazo.com/fe37316d367db19ecc3b117e2453126a.gif)](https://gyazo.com/fe37316d367db19ecc3b117e2453126a)

Features
-------------
* One-click downloading to custom folders in FukurouViewer application
* Editing/reordering custom folder in browser
* Custom download behavior for sites
  * Tumblr
    * One click download for videos
    * Automatically chooses largest image size
  * Pixiv
* Reverse image searching to popular services
* Live followed twitch streams (ordered and catagorized by game)

Installation
-------------
Because this project is still in its infancy, the extension is currently not available in the Chrome
Web Store.  I am in the process of setting up a GitFlow system to allow me to more easily create 
functional releases that can be packaged for the Chrome Web Store.  When that happens, the installation
will be much simpler.

In addition to downloading and installing [FukurouViewer](https://github.com/rpicking/FukurouViewer),
to use the one-click downloading you must:

```
1.  Download/clone repository
2.  Enable Developer Mode in the Chrome extension settings
3.  Load unpacked extension browsing to the location of the app directory from the repo.
4.  Install the Fukurou 
```

Technologies
-------------
Some of the technologies I learned about while I continue working on this extension.
* HTML
* CSS
* Javascript
* JQuery
* JSON
* Native Messaging
* Bootstrap

Planned Features
-------------
* Displaying/editing FukurouViewer download history in browser
* Adding new directory from extension (currently only available from FukurouViewer)
* Proper dynamic content script for sites
  * Remove need for "hardcoded" content scripts
  * Load/unload script from extension without reload
* Add other streaming platforms
  * Youtube
  * Azubu
* Tabs in popup showing all streamers in favorited games on twitch.TV

