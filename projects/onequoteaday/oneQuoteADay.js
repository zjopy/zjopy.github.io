let allQuotes;

// Todo: convert to promises

function fetchAsset(url) {
  const request = new XMLHttpRequest();
  request.open('GET', url);
  request.responseType = "json";
  request.send();
  request.onload = function() {
    if (request.status == 200) {
      allQuotes = request.response;
      getQuote();
    } else {
      throw Error(request.statusText);
    }
  };
}

const titleElement = document.querySelector("#title");
const quoteElement = document.querySelector("#quote");

// fetchAsset("https://api.myjson.com/bins/134p06"); // to be able to run locally
fetchAsset("authenticagility.json");

function getQuote() {

  const numberOfQuotes = allQuotes.length;
  const randomIndex = Math.floor(Math.random() * numberOfQuotes);
  const quoteOfTheDay = allQuotes[randomIndex];

  // use only quotes without the given note
  if (quoteOfTheDay.note === "[duplicate]") {
    getQuote();
  } else {
    titleElement.textContent = '- ' + quoteOfTheDay.category + ' -';
    quoteElement.textContent = '\“' + quoteOfTheDay.question.replace("XYZ", "...") + '\”';
  }

}