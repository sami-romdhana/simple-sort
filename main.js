const sortingEventTarget = new EventTarget();

class ComparisonStopError extends Error {}
class ComparisonUndoError extends Error {}
class NoCachedValueError extends Error {}

const answerCache = [];

function cacheAnswer(a, b, value) {
  answerCache.push({
    a,
    b,
    value,
  });
}

sortingEventTarget.addEventListener("undo", () => {
  answerCache.pop();
});

function getCachedAnswer(a, b) {
  for (answer of answerCache) {
    if (answer.a === a && answer.b === b) {
      return answer.value;
    } else if (answer.a === b && answer.b === a) {
      return answer.value * -1;
    }
  }

  throw new NoCachedValueError("No cached answer");
}

const input = document.querySelector("#input");
const startButton = document.querySelector("#start");
const undoButton = document.querySelector("#undo");
const stopButton = document.querySelector("#stop");
const aSide = document.querySelector("#a");
const bSide = document.querySelector("#b");
const sortingActionsButtons = document.querySelectorAll("[data-value]");

function displayList(values) {
  removeAllChildren(input);

  values.forEach((value) => {
    const div = document.createElement("div");
    div.innerText = value;
    input.appendChild(div);
  });
}

startButton.addEventListener("click", async () => {
  try {
    const values = input.innerText
      .split(/\n|<br>/)
      .map((value) => value.trim())
      .filter((value) => value.length);

    if (values.length === 0) {
      alert("No input detected, please enter some text");
      return;
    }

    if (values.length === 1) {
      alert("Enter at least two items");
      return;
    }

    if (values.length !== new Set(values).size) {
      alert("There are duplicate values, please check again");
      return;
    }

    values.reverse();

    const form = document.querySelector("#form");
    form.classList.remove("hidden");

    const [sorted, sortedValues] = await insertionSort(
      values.concat(),
      compareIsSuperior
    );
    sortedValues.reverse();
    form.classList.add("hidden");
    displayList(sortedValues);

    if (sorted) {
      alert("All done, your list is sorted");
    }
  } catch (err) {
    alert("An error occurred during sorting");
    console.error(err);
  }
});

sortingActionsButtons.forEach((sortingAction) => {
  const value = parseInt(sortingAction.getAttribute("data-value"), 10);

  sortingAction.addEventListener("click", () => {
    sortingEventTarget.dispatchEvent(
      new CustomEvent("answer", {
        detail: { value },
      })
    );
  });
});

function askUserForComparison(a, b) {
  putContent(aSide, a);
  putContent(bSide, b);

  return new Promise((resolve, reject) => {
    function answerHandler(event) {
      removeHandlers();
      resolve(event.detail.value);
    }

    function stopHandler() {
      removeHandlers();
      reject(new ComparisonStopError());
    }

    function undoHandler() {
      removeHandlers();
      sortingEventTarget.dispatchEvent(new CustomEvent("undo"));
      reject(new ComparisonUndoError());
    }

    function removeHandlers() {
      sortingEventTarget.removeEventListener("answer", answerHandler);
      undoButton.removeEventListener("click", undoHandler);
      stopButton.removeEventListener("click", stopHandler);
    }

    sortingEventTarget.addEventListener("answer", answerHandler);
    undoButton.addEventListener("click", undoHandler);
    stopButton.addEventListener("click", stopHandler);
  });
}

async function compareIsSuperior(a, b) {
  try {
    return getCachedAnswer(a, b);
  } catch (err) {
    if (!(err instanceof NoCachedValueError)) {
      throw err;
    }

    const result = await askUserForComparison(a, b);
    cacheAnswer(a, b, result);
    return result;
  }
}

async function insertionSort(originalList, compareFn) {
  const queue = originalList.concat();
  let sortedList = [queue.pop()];

  while (queue.length) {
    const itemToInsert = queue.pop();

    let upperBound = sortedList.length;
    let lowerBound = 0;

    while (upperBound !== lowerBound) {
      const median = Math.floor((upperBound - lowerBound) / 2) + lowerBound;

      try {
        const cmp = await compareFn(itemToInsert, sortedList[median]);

        if (cmp === 0) {
          upperBound = lowerBound = median;
        } else if (cmp > 0) {
          lowerBound = median + 1;
        } else {
          upperBound = median;
        }
      } catch (err) {
        if (err instanceof ComparisonStopError) {
          return [false, originalList];
        }

        if (err instanceof ComparisonUndoError) {
          i = Math.max(1, i - 1);
          continue;
        }

        throw err;
      }
    }

    sortedList.splice(upperBound, 0, itemToInsert);
  }

  return [true, sortedList];
}

function getContentElement(content) {
  if (!isImageUrl(content)) {
    return document.createTextNode(content);
  }

  const img = document.createElement("img");
  img.setAttribute("src", content);
  return img;
}

function putContent(element, content) {
  removeAllChildren(element);
  const contentElement = getContentElement(content);
  element.appendChild(contentElement);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

const imageUrlRegex = /\.(jpeg|jpg|gif|png|webp)$/;

function isImageUrl(string) {
  return isValidUrl(string) && string.match(imageUrlRegex) != null;
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.lastChild);
  }
}
