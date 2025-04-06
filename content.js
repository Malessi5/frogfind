const contentScript = {
  DOMSearchResults: [],
  lastElementBackground: "",
  lastElementBorder: "",
  init: async function () {
    chrome.runtime.onMessage.addListener((message) =>
      this.messageReceiver(message)
    );

    /* event listener that captures data from injected scripts and passes it to other extension files
    background.js or popup script */

    document.addEventListener("sendData", async function (e) {
      console.log(e);
      // custom event listener data send from an injected script to be sent to a popup or service worker
      await chrome.runtime.sendMessage(e.detail);
    });

    // inject script into document to allow access to window object
    this.injectScript();
  },
  messageReceiver: function (message) {
    console.log("content message", message);
    switch (message.type) {
      case "search":
        this.dispatchEvent("findData", message.data);
        this.domSearch(message.data);
        break;
      case "console_log_results":
        this.dispatchEvent("consoleLogResults", message.data);
        break;
      case "HIGHLIGHT_ELEMENT":
        this.highlightElement(message.data.index);
        break;
      case "UNHIGHLIGHT_ELEMENT":
        this.unHighlightElement(message.data.index);
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
  domSearch: function (data) {
    const { search_term, tabId } = data;
    const results = [];
    this.DOMSearchResults = [];

    const search = (term, element) => {
      if (
        !element ||
        element.nodeName === "SCRIPT" ||
        element.nodeName === "STYLE"
      )
        return;

      if (element.children.length > 0) {
        Array.from(element.children).forEach((elem) => {
          search(term, elem);
        });
      }
      let selector = this.getSelector(element);
      let isVisible = element.checkVisibility();

      // check element text for elements without child elements
      if (element.textContent && element.children.length === 0) {
        if (element.textContent.toLowerCase().trim().includes(term)) {
          results.push({
            selector,
            element,
            location: "textContent",
            value: element.textContent.trim(),
            visible: isVisible,
          });
        }
      }

      // check element attributes
      if (element.attributes) {
        for (let attr of element.attributes) {
          if (attr.name.includes(term)) {
            results.push({
              selector,
              element,
              location: `attribute name`,
              value: attr.name,
              visible: isVisible,
            });
          }

          if (attr.value && attr.value.includes(term)) {
            results.push({
              selector,
              element,
              location: `${attr.name}`,
              value: attr.value,
              visible: isVisible,
            });
          }
        }
      }
    };

    search(search_term.toLowerCase().trim(), document.body);
    // save results to content object. We can't reference the elements from any other context, we need to save them so we can scroll the element into view or highlight it
    this.DOMSearchResults = results;

    // sends results to the DomSearch component
    this.sendDOMResults(search_term, results, tabId);
  },
  getSelector: function (element) {
    let selector = element.nodeName.toLowerCase();

    // IDs should always be unique
    if (element.id) {
      return (selector += `#${element.id}`);
    }

    // Check for unique class
    const classes = element.classList;
    if (classes.length > 0) {
      return (selector += `.${classes}`);
    }

    return selector;
  },
  sendDOMResults: function (searchTerm, results, tabId) {
    // Add index to object for filtering purposes
    const indexedResults = results.map((res, i) => ({
      ...res,
      index: i,
    }));

    chrome.runtime.sendMessage({
      type: "DOM_SEARCH_RESULTS",
      data: {
        search_term: searchTerm,
        result: indexedResults,
        tabId,
      },
    });
  },
  highlightElement(index) {
    console.log("highlight");
    // Highlights and scrolls into view
    if (contentScript.DOMSearchResults.length === 0) return;

    const result = contentScript.DOMSearchResults[index];
    let element = result.element;

    while (!element.checkVisibility() && element !== document.body) {
      element = element.parentElement;
    }

    result.highestVisibleElement = element;

    contentScript.lastElementBackground = element.style.backgroundColor || "";
    contentScript.lastElementBorder = element.style.borderColor || "";
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    // need to keep track of last bg color before changing so we can change it back
    element.style.backgroundColor = "#FDFF47";
    element.style.border = "solid yellow 3px";
  },
  // unhighlights
  unHighlightElement(index) {
    const result = contentScript.DOMSearchResults[index];
    let element = result.highestVisibleElement;

    if (contentScript.lastElementBackground) {
      // revert element's bg color
      element.style.backgroundColor = contentScript.lastElementBackground;
      contentScript.lastElementBackground = "";
      // revert elements border
      element.style.border = contentScript.lastElementBorder;
      contentScript.lastElementBorder = "";
    } else {
      element.style.backgroundColor = "";
      element.style.border = "";
    }
  },
};

contentScript.init();
