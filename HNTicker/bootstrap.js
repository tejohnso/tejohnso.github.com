/*global Components, APP_SHUTDOWN */
"use strict";
var Cc = Components.classes;
var Ci = Components.interfaces;

var loadIntoWindow = function(window) {
  var anchor = window.document.getElementById("tabbrowser-tabs");
  if (!anchor) {
    window.dump('HNTicker - window ' + window.id +
                ' ' + window.title + ' has no browser tabs to anchor to');
    return;
  }
  var button = window.document.createElement("toolbarbutton");
  button.setAttribute("id", "HNTicker");
  button.setAttribute("class", "button-control");
  button.style.marginRight='0.5em';
  button.style.userFocus='normal';
  button.addEventListener("click", function() {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator)
              .getMostRecentWindow('navigator:browser');
    win.openUILinkIn('http://news.ycombinator.com', 'tab');
  }, true);
  anchor.parentNode.insertBefore(button, anchor);
  
  var canvas = window.document.createElementNS("http://www.w3.org/1999/xhtml",
                                                 "canvas");
  canvas.setAttribute("id", "HNTicker-canvas");
  var fontString = "16px sans-serif";
  var ctx = canvas.getContext("2d");
  var img = window.document.createElementNS("http://www.w3.org/1999/xhtml","img");
  img.src = 'data:image/gif;base64,R0lGODlhEgASAKIAAP/jyvihV/aKLfmxc/////9mAAAAAAAAACH5BAAAAAAALAAAAAASABIAAAMpWLrc/jDKOQkRy8pBhuKeRAAKQFBBxwVUYY5twXVxodV3nLd77f9ASQIAOw==';

  var drawButton = function(karmaVal) {
    ctx.font = fontString;
    var textLeftPad = 1;
    var fontHalfHeight = ctx.font.substr(0,ctx.font.indexOf('px'))/2;
    canvas.width = (img.width + ctx.measureText(karmaVal).width) + textLeftPad;
    canvas.height = img.height;
    ctx.font = fontString;
    ctx.textBaseline = 'top';
    ctx.drawImage(img,0,0);
    ctx.fillStyle = "#012";
    ctx.fillText(karmaVal, img.width + textLeftPad, img.height/2 + 1 - fontHalfHeight);
    anchor.parentNode.insertBefore(button, anchor);
    button.setAttribute("image", canvas.toDataURL());
  };

  button.karmaRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Components.interfaces.nsIXMLHttpRequest);
  button.karmaRequest.onload = function(aEvent) {
    var karma = aEvent.target.responseText.indexOf('karma:');
    var text = aEvent.target.responseText.substr(karma + 15);
    var karmaVal = text.substr(0, text.indexOf('<'));
    drawButton(karmaVal.substr(0,6));
  };
  button.karmaRequest.onerror = function(aEvent) {
    window.dump("HNTicker - ajax error: " + aEvent.target.status);
  };

  var loadKarmaAndDraw = function() {
    button.karmaRequest.open("GET", dataURL, true);
    button.karmaRequest.send(null);
  };

  var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService)
                   .getBranch("extensions.HNTicker.");
  var intervalSeconds = prefBranch.prefHasUserValue('interval') ? 
			prefBranch.getIntPref('interval') : 180;
  var userID = prefBranch.prefHasUserValue('username') ? 
			prefBranch.getCharPref('username') : '';
  if (userID === '') {
     userID = {value: "pg"};
     Cc["@mozilla.org/embedcomp/prompt-service;1"]
     .getService(Components.interfaces.nsIPromptService)
     .prompt(null, "username", "HNTicker - What is your username?", userID, null, {});
     userID = userID.value;
     prefBranch.setCharPref('username', userID);
  }
  window.dump('HNTicker - username ' + userID);
  var dataURL = "http://news.ycombinator.com/user?id=" + userID;
  if (typeof intervalSeconds !== 'number' || intervalSeconds < 301) {
     intervalSeconds = 301;
     prefBranch.setIntPref('interval', 301);
  }
  window.dump('HNTicker - reloading every ' + intervalSeconds + ' seconds');

  loadKarmaAndDraw();
  button.intervalHandle = window.setInterval(function() {
    loadKarmaAndDraw();
  }, intervalSeconds * 1000);  
};

function unloadFromWindow(window) {
  if (!window) {
    window.dump('no window?!');
    return;
  }

  var button = window.document.getElementById("HNTicker");
  if (button) {
    button.karmaRequest.abort();
    window.clearInterval(button.intervalHandle);
    button.parentNode.removeChild(button);
    window.dump('button unloaded');
  } else {
    window.dump('no button to unload');
  }
}

/*
 bootstrap.js API
*/

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
                    getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function loadHandler() {
      domWindow.removeEventListener("load", loadHandler, true);
      loadIntoWindow(domWindow);
    }, true);
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

function startup(aData, aReason) {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    var win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow).top;
    loadIntoWindow(win);
  }

  // Load into any new windows
  wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean up any UI changes
  if (aReason === APP_SHUTDOWN) {return;}

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Stop watching for new windows
  wm.removeListener(windowListener);

  // Unload from any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    var win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
    win.dump('unloading from window');
    unloadFromWindow(win);
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
