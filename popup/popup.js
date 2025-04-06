const popup = {
  init: async function () {
    // message listener for search results
    chrome.runtime.onMessage.addListener(function messageSwitch(message) {
      console.log(message);
      switch (message.type) {
        case "display_search_results":
          // data passed from background service worker
          search_result.generateSearchResults(message.data);
          // chrome.runtime.onMessage.removeListener(messageSwitch);
          break;
        case "DOM_SEARCH_RESULTS":
          console.log("dom results", message);
          dom_search.generateDomResults(message.data);
          break;
      }
    });

    this.addListener();
  },
  addListener: function () {
    const findBtn = document.querySelector("#find");

    findBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      chrome.tabs
        .query({ active: true, currentWindow: true })
        .then(async (tab) => {
          console.log("click", tab);
          const tabId = tab[0].id;
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
    });
  },
};

search_result = {
  clearResults: function () {
    const resultDiv = document.querySelector("#result");
    const domResultDiv = document.querySelector("#dom-result");
    resultDiv.innerHTML = "";
    domResultDiv.innerHTML = "";
  },
  generateSearchResults: function (data) {
    // Clear previous results
    this.clearResults();
    const { value, paths, tabId, search_type, search_param } = data;

    // create results container and heading text elements
    const resultDiv = document.querySelector("#result");
    const resultsText = document.createElement("h3");
    const results = document.createElement("ol");

    resultsText.innerHTML = `${paths.length} total window object results found for ${search_type} ${search_param} "${value}"`;

    resultDiv.appendChild(resultsText);

    // if we have results, generate elements
    if (paths.length > 0) {
      paths.sort();
      const { filteredOut, filteredPaths } = search_result.filterResults(paths);

      const topResults = document.createElement("h4");
      topResults.innerText = `Showing top ${filteredPaths.length} results`;
      resultDiv.appendChild(topResults);

      //generate top results
      for (let i = 0; i < filteredPaths.length; i++) {
        let result = search_result.generateResult(
          filteredPaths[i],
          value,
          tabId,
          i
        );
        results.appendChild(result);
      }

      // if any results have been filtered out
      if (filteredOut.length > 0) {
        const seeMore = document.createElement("p");
        const len = filteredPaths.length;

        seeMore.innerText = `Click to see ${filteredOut.length} more results...`;
        seeMore.classList.add("see-more");

        results.appendChild(seeMore);
        seeMore.addEventListener("click", function () {
          this.remove();
          topResults.remove();

          for (let j = 0; j < filteredOut.length; j++) {
            let fResult = search_result.generateResult(
              filteredOut[j],
              value,
              tabId,
              len + j
            );
            results.appendChild(fResult);
          }
        });
      }
    } else {
      let result = document.createElement("li");
      result.textContent = "Value not found";
      results.appendChild(result);
    }

    resultDiv.appendChild(results);
  },
  sendConsoleLog: async function (path, value, tabId, idx) {
    await chrome.tabs.sendMessage(tabId, {
      type: "console_log_results",
      data: { path: path, result: value, idx: idx },
    });
  },
  addCopyToClipboardBtn(element, path) {
    const copyBtn = document.createElement("button");
    const copyImg = document.createElement("img");
    copyBtn.title = "Copy to clipboard";
    copyBtn.classList.add("copy-btn");
    copyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      navigator.clipboard.writeText(path);
    });

    copyImg.src = "../images/copy.png";
    copyImg.classList.add("copy-btn-img");

    copyBtn.appendChild(copyImg);
    element.appendChild(copyBtn);
    return element;
  },
  addSendToConsoleBtn: function (element, path, value, tabId, i) {
    const sendBtn = document.createElement("button");
    const sendImg = document.createElement("img");
    sendBtn.title = "Log in console";
    sendBtn.classList.add("copy-btn");
    sendBtn.addEventListener("click", function (e) {
      e.preventDefault();
      search_result.sendConsoleLog(path, value, tabId, i + 1);
    });

    sendImg.src = "../images/console.png";
    sendImg.classList.add("copy-btn-img");

    sendBtn.appendChild(sendImg);
    element.appendChild(sendBtn);
    return element;
  },
  generateResult: function (path, value, tabId, idx) {
    let result = document.createElement("li");
    let resultCtn = document.createElement("span");

    resultCtn.classList.add("result-ctn");
    result.classList.add("search-result");
    result.title = path;
    result.textContent = `${idx + 1}. ${path}`;

    resultCtn.appendChild(result);
    this.addSendToConsoleBtn(resultCtn, path, value, tabId, idx);
    this.addCopyToClipboardBtn(resultCtn, path);

    return resultCtn;
  },
  filterResults: function (results) {
    const filteredOut = [];
    const filteredPaths = results.filter((path) => {
      if (path.length >= 50 && !path.includes("datalayer")) {
        filteredOut.push(path);
      }
      return path.length < 50 || path.includes("datalayer");
    });

    return { filteredOut, filteredPaths };
  },
};

dom_search = {
  generateDomResults: function (data) {
    const { result, tabId } = data;

    const domResultsDiv = document.querySelector("#dom-result");
    const resultsText = document.createElement("h3");
    const resultsList = document.createElement("ol");

    resultsText.innerHTML = `${result.length} total DOM results found`;
    domResultsDiv.appendChild(resultsText);

    if (result.length) {
      for (let i = 0; i < result.length; i++) {
        let singleResult = dom_search.generateDOMResult(result[i], tabId);
        resultsList.appendChild(singleResult);
      }
    } else {
      let result = document.createElement("li");
      result.textContent = "Not found";
      results.appendChild(result);
    }

    domResultsDiv.appendChild(resultsList);
  },
  generateDOMResult: function (singleResult, tabId) {
    const { index, location, selector, value } = singleResult;
    let result = document.createElement("li");
    let resultCtn = document.createElement("span");

    resultCtn.classList.add("result-ctn");
    result.classList.add("search-result");
    result.title = value;
    result.textContent = `${index + 1}. ${selector}`;

    result.addEventListener("mouseover", function () {
      dom_search.mouseOverHandler(index, tabId);
    });

    result.addEventListener("mouseout", function () {
      dom_search.mouseOutHandler(index, tabId);
    });

    resultCtn.appendChild(result);
    // this.addSendToConsoleBtn(resultCtn, path, value, tabId, idx);
    // this.addCopyToClipboardBtn(resultCtn, path);

    return resultCtn;
  },
  mouseOverHandler: async function (index, tabId) {
    await chrome.tabs.sendMessage(tabId, {
      type: "HIGHLIGHT_ELEMENT",
      data: { index },
    });
  },
  mouseOutHandler: async function (index, tabId) {
    await chrome.tabs.sendMessage(tabId, {
      type: "UNHIGHLIGHT_ELEMENT",
      data: { index },
    });
  },
};
popup.init();
