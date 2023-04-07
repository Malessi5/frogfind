const frogFriendBackground = {
  addListeners: async function () {
    const that = this;
    chrome.runtime.onMessage.addListener(function (message) {
      switch (message.type) {
        case "search_results":
          //sent from content script
          console.log("results received");
          that.createResultsPopup(message);
          break;
      }
    });
  },
  createResultsPopup: async function (message) {
    // search results popup
    chrome.tabs.create(
      {
        url: chrome.runtime.getURL("./search/search-results.html"),
        active: false,
      },
      function (tab) {
        // After the tab has been created, open a window to inject the tab
        chrome.windows
          .create({
            focused: true,
            tabId: tab.id,
            type: "popup",
            height: 500,
            width: 400,
            left: 50,
          })
          .then(function () {
            message.type = "display_search_results";
            setTimeout(() => {
              // send to search-results script
              chrome.runtime.sendMessage(message);
            }, 1000);
          });
      }
    );
  },
};

frogFriendBackground.addListeners();
