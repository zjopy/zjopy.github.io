"use strict";

const titleElement = document.querySelector("#title");
const quoteElement = document.querySelector("#quote");
const buttonElement = document.querySelector("#generateButton");
let allQuotes;

function fetchAsset(url, type) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = type;
    request.send();

    request.onload = () => {
      if (request.status === 200) {
        resolve(request.response);
      } else {
        reject(Error(request.statusText));
      }
    };

    request.onerror = () => {
      reject(Error("Network Error"))
    };

  });
}

// fetchAsset("https://api.myjson.com/bins/134p06", 'json') // to be able to run locally
fetchAsset("authenticagility.json", 'json')
  .then(data => {
    allQuotes = data;
    getQuote();
  }, error => {
    console.log("Promise rejected: " + error);
  });

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

buttonElement.addEventListener("click", getQuote);