const popup = {
  init: async function () {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tab) => this.addListener(tab));
  },
  addListener: function (tab) {
    const findBtn = document.querySelector("#find");
    const tabId = tab[0].id;

    findBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      const term = document.querySelector("#search").value;
      const searchType = document.querySelector("#search-type").value;
      const searchParam = document.querySelector("#search-param").value;

      // send search data via a message to content.js, which has access to the active tab
      if (term) {
        await chrome.tabs.sendMessage(tabId, {
          type: "search",
          data: {
            search_term: term.toLowerCase().replace(/["]+/g, ""),
            search_type: searchType,
            search_param: searchParam,
            tabId: tabId,
          },
        });
      }
    });
  },
};
popup.init();
