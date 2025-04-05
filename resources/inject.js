(function () {
  //data sent from content
  document.addEventListener("findData", function (e) {
    const { search_term, search_type, search_param, tabId } = e.detail;
    const contains = search_param === "contains";
    let results = [];

    if (search_type === "value") {
      results = searchWindowObject.searchWindowObjectForValue(
        search_term,
        contains
      );
    } else if (search_type === "property") {
      results = searchWindowObject.searchWindowObjectForProperty(
        search_term,
        contains
      );
    }

    const paths = results.map((o) => o.path);
    //send to content
    document.dispatchEvent(
      new CustomEvent("sendData", {
        detail: {
          data: {
            value: search_term,
            paths: paths,
            tabId,
            search_type,
            search_param,
          },
          type: "display_search_results",
        },
      })
    );
  });

  document.addEventListener("consoleLogResults", function (e) {
    const data = e.detail;
    searchWindowObject.consoleLogResults(data);
  });
})();

const searchWindowObject = {
  searchWindowObjectForValue: function (
    value,
    contains,
    obj = window,
    path = "window"
  ) {
    try {
      const results = [];

      function traverse(value, contains, obj, path, visited) {
        if (visited.has(obj)) {
          return;
        }
        // Add the current object to the visited set
        visited.add(obj);

        for (let prop in obj) {
          try {
            if (
              typeof obj[prop] === "object" &&
              obj[prop] !== null &&
              !obj[prop].nodeName
            ) {
              // Recursively search the object and add the current property to the path
              traverse(value, contains, obj[prop], `${path}.${prop}`, visited);
            } else if (
              typeof obj[prop] === "string" ||
              typeof obj[prop] === "number"
            ) {
              // If the property is not an object, check if it matches the value we're looking for
              let val = obj[prop];
              if (contains) {
                if (typeof val === "string") {
                  val = val.toLowerCase();
                } else {
                  val = val.toString();
                }

                if (val.includes(value)) {
                  // Add the current object and path to the results array
                  results.push({
                    object: obj,
                    path: `${path}.${prop}`,
                  });
                }
              } else {
                if (val === value) {
                  // Add the current object and path to the results array
                  results.push({
                    object: obj,
                    path: `${path}.${prop}`,
                  });
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

      for (let property in obj) {
        if (!isNaN(parseInt(property)) || property === "document") {
          // skip nested window objects
          continue;
        }
        //create a new set that includes the window object for each top-level object prop
        let visited = new Set([window]);

        if (
          typeof obj[property] === "object" &&
          obj[property] !== null &&
          !obj[property].nodeName
        ) {
          // Recursively search the object and add the current property to the path
          traverse(
            value,
            contains,
            obj[property],
            `${path}.${property}`,
            visited
          );
        } else if (
          typeof obj[property] === "string" ||
          typeof obj[property] === "number"
        ) {
          // If the property is not an object, check if it matches the value we're looking for
          let val = obj[property];
          if (contains) {
            if (typeof val === "string") {
              val = val.toLowerCase();
            } else {
              val = val.toString();
            }

            if (val.includes(value)) {
              // Add the current object and path to the results array
              results.push({
                object: obj,
                path: `${path}.${property}`,
              });
            }
          } else {
            if (val === value) {
              // Add the current object and path to the results array
              results.push({
                object: obj,
                path: `${path}.${property}`,
              });
            }
          }
        }
      }

      return results;
    } catch (e) {
      console.error(e);
    }
  },
  searchWindowObjectForProperty: function (
    property,
    contains,
    obj = window,
    path = "window"
  ) {
    try {
      const results = [];

      function traverse(property, contains, obj, path, visited) {
        if (visited.has(obj)) {
          return;
        }
        // Add the current object to the visited set
        visited.add(obj);

        for (let prop in obj) {
          try {
            let lowCaseProp = prop.toLowerCase();
            if (contains) {
              if (lowCaseProp.includes(property)) {
                // Add the current object and path to the results array
                results.push({
                  object: obj,
                  path: `${path}.${prop}`,
                });
              }
            } else {
              if (lowCaseProp === property) {
                // Add the current object and path to the results array
                results.push({
                  object: obj,
                  path: `${path}.${prop}`,
                });
              }
            }

            if (
              typeof obj[prop] === "object" &&
              obj[prop] !== null &&
              !obj[prop].nodeName
            ) {
              // Recursively search the object and add the current property to the path
              traverse(
                property,
                contains,
                obj[prop],
                `${path}.${prop}`,
                visited
              );
            }
          } catch (e) {
            continue;
          }
        }
      }

      for (let p in obj) {
        if (!isNaN(parseInt(p))) {
          // skip nested window objects
          continue;
        }
        //create a new set that includes the window object for each top-level object prop

        let lowCaseP = p.toLowerCase();
        if (contains) {
          if (lowCaseP.includes(property)) {
            // Add the current object and path to the results array
            results.push({
              object: obj,
              path: `${path}.${p}`,
            });
          }
        } else {
          if (lowCaseP === property) {
            // Add the current object and path to the results array
            results.push({
              object: obj,
              path: `${path}.${p}`,
            });
          }
        }

        if (typeof obj[p] === "object" && obj[p] !== null && !obj[p].nodeName) {
          let visited = new Set([window]);

          // Recursively search the object and add the current property to the path
          traverse(property, contains, obj[p], `${path}.${p}`, visited);
        }
      }

      return results;
    } catch (e) {}
  },
  consoleLogResults: function (data) {
    const { path, result, idx } = data;

    findWindowObjWithPath = function (obj, path) {
      pathArr = path.split(".");
      pathArr.pop();

      for (var i = 1; i < pathArr.length; i++) {
        if (obj[pathArr[i]]) {
          obj = obj[pathArr[i]];
        } else {
          break;
        }
      }
      return obj;
    };

    const resultObject = findWindowObjWithPath(window, path);
    console.group(
      `%c Search result #${idx} for "${result}"`,
      "font-weight:bold; background-color: #00a300; padding:5px"
    );
    console.log(`%c Path:`, "font-weight:bold;", path);
    console.log(`%c Parent Object:`, "font-weight:bold;", resultObject);
    console.groupEnd();
    return;
  },
};
