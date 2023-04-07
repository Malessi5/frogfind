chrome.runtime.onMessage.addListener(function messageSwitch(message) {
  switch (message.type) {
    case "display_search_results":
      // data passed from background service worker
      generateSearchResults(message.data);
      chrome.runtime.onMessage.removeListener(messageSwitch);
      break;
  }
});

document.querySelector("#close-results").addEventListener("click", function () {
  window.close();
});

//TODO: loading graphic

function filterResults(results) {
  const filteredOut = [];
  const filteredPaths = results.filter((path) => {
    if (path.length >= 50 && !path.includes("datalayer")) {
      filteredOut.push(path);
    }
    return path.length < 50 || path.includes("datalayer");
  });

  return { filteredOut, filteredPaths };
}

function generateSearchResults(data) {
  const { value, paths, tabId, search_type, search_param } = data;

  // create results container and heading text elements
  const resultDiv = document.querySelector("#result");
  const resultsText = document.createElement("h3");
  const results = document.createElement("ol");

  resultsText.innerHTML = `${paths.length} total results found for ${search_type} ${search_param} "${value}"`;

  resultDiv.appendChild(resultsText);

  // if we have results, generate elements
  if (paths.length > 0) {
    paths.sort();
    const { filteredOut, filteredPaths } = filterResults(paths);

    const topResults = document.createElement("h4");
    topResults.innerText = `Showing top ${filteredPaths.length} results`;
    resultDiv.appendChild(topResults);

    //generate top results
    for (let i = 0; i < filteredPaths.length; i++) {
      let result = generateResult(filteredPaths[i], value, tabId, i);
      results.appendChild(result);
    }

    // if any results have been filtered out
    if (filteredOut.length > 0) {
      const seeMore = document.createElement("p");
      const len = filteredPaths.length;

      seeMore.innerText = `Click to see ${
        filteredOut.length - 1
      } more results...`;
      seeMore.classList.add("see-more");

      results.appendChild(seeMore);
      seeMore.addEventListener("click", function () {
        this.remove();
        topResults.remove();

        for (let j = 0; j < filteredOut.length; j++) {
          let fResult = generateResult(filteredOut[j], value, tabId, len + j);
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
}

async function sendConsoleLog(path, value, tabId, idx) {
  await chrome.tabs.sendMessage(tabId, {
    type: "console_log_results",
    data: { path: path, result: value, idx: idx },
  });
}

function addCopyToClipboardBtn(element, path) {
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
}

function addSendToConsoleBtn(element, path, value, tabId, i) {
  const sendBtn = document.createElement("button");
  const sendImg = document.createElement("img");
  sendBtn.title = "Log in console";
  sendBtn.classList.add("copy-btn");
  sendBtn.addEventListener("click", function (e) {
    e.preventDefault();
    sendConsoleLog(path, value, tabId, i + 1);
  });

  sendImg.src = "../images/console.png";
  sendImg.classList.add("copy-btn-img");

  sendBtn.appendChild(sendImg);
  element.appendChild(sendBtn);
  return element;
}

function generateResult(path, value, tabId, idx) {
  let result = document.createElement("li");
  let resultCtn = document.createElement("span");

  resultCtn.classList.add("result-ctn");
  result.classList.add("search-result");
  result.title = path;
  result.textContent = `${idx + 1}. ${path}`;

  resultCtn.appendChild(result);
  addSendToConsoleBtn(resultCtn, path, value, tabId, idx);
  addCopyToClipboardBtn(resultCtn, path);

  return resultCtn;
}
