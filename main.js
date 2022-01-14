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
const sortingActionsButtons = document.querySelectorAll(
  "#form .form--sort-actions button"
);

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

    const sorted = await bubbleSort(values);
    values.reverse();
    form.classList.add("hidden");
    displayList(values);

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

function askUserForComparison(list, a, b) {
  putContent(aSide, list[a]);
  putContent(bSide, list[b]);

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

async function compareIsSuperior(list, a, b) {
  try {
    return getCachedAnswer(list[a], list[b]);
  } catch (err) {
    if (!(err instanceof NoCachedValueError)) {
      throw err;
    }

    const result = await askUserForComparison(list, a, b);
    cacheAnswer(list[a], list[b], result);
    return result;
  }
}

function swap(list, a, b) {
  const cache = list[b];
  list[b] = list[a];
  list[a] = cache;
}

async function bubbleSort(list) {
  let swapped;

  do {
    swapped = false;

    for (let i = 1; i < list.length; i++) {
      let cmp;

      try {
        cmp = await compareIsSuperior(list, i - 1, i);
      } catch (err) {
        if (err instanceof ComparisonStopError) {
          return false;
        }

        if (err instanceof ComparisonUndoError) {
          i = Math.max(0, i - 1);
          continue;
        }

        throw err;
      }

      if (cmp === 1) {
        swap(list, i - 1, i);
        swapped = true;
      }
    }
  } while (swapped);

  return true;
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
