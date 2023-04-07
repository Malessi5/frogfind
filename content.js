const contentScript = {
  init: async function () {
    chrome.runtime.onMessage.addListener((message) =>
      this.messageReceiver(message)
    );

    /* event listener that captures data from injected scripts and passes it to other extension files
    background.js or popup script */

    document.addEventListener("sendData", async function (e) {
      // custom event listener data send from an injected script to be sent to a popup or service worker
      await chrome.runtime.sendMessage(e.detail);
    });

    // inject script into document to allow access to window object
    this.injectScript();
  },
  messageReceiver: function (message) {
    switch (message.type) {
      case "search":
        this.dispatchEvent("findData", message.data);
        break;
      case "console_log_results":
        this.dispatchEvent("consoleLogResults", message.data);
        break;
      default:
        break;
    }
  },
  injectScript: function () {
    // inject script that searches the window
    var s = document.createElement("script");
    s.src = chrome.runtime.getURL("./resources/inject.js");
    s.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(s);
  },
  dispatchEvent: function (event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
};

contentScript.init();
