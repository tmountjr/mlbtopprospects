import puppeteer from 'puppeteer';
import * as fs from 'fs'
import waitForResponse from './lib/waitForResponse.js';

// const browser = await puppeteer.launch({ headless: false });
const browser = await puppeteer.launch();
const top100Page = await browser.newPage();
await top100Page.setViewport({ width: 1280, height: 1024 });
await top100Page.goto('https://www.mlb.com/prospects/top100');
await top100Page.waitForSelector('div#onetrust-button-group', { visible: true });
await top100Page.waitForSelector('div.load-more__container button.load-more__button', { visible: true });

const success = await top100Page.$eval('div.load-more__container button.load-more__button', b => {
  b.style = 'color: red;';
  let button = document.querySelector('div.load-more__container button.load-more__button');
  let clickAttemptNumber = 0;
  // keep trying to click the button
  while (button && clickAttemptNumber < 10) {
    button.click();
    button = document.querySelector('div.load-more__container button.load-more__button');
  }
  return clickAttemptNumber <= 10;
});

if (!success) {
  console.log('Unable to fetch list. Quitting.');
  browser.close();
  process.exit(-1);
}

const mapper = {
  rank: 'td.rankings__table__cell--rank',
  name: 'div.prospect-headshot__name',
  position: 'td.rankings__table__cell--position',
  eta: 'td.rankings__table__cell--eta',
  team: 'div.prospect-team__name'
};
const resultElements = await top100Page.$$('table.rankings__table--top100 tr[data-testid="table-row"]');
const results = await Promise.all(
  resultElements.map( async e => {
    const toReturn = {};
    for await (const key of Object.keys(mapper)) {
      toReturn[key] = await e.$eval(`:scope ${mapper[key]}`, x => x.innerHTML);
    }
    return toReturn;
  })
);
fs.writeFileSync('./prospects/top100.json', JSON.stringify(results));
console.log('Successfully saved top 100 prospect list.');

// Grab a reference to the top 30 by team <select>
const top30Selector = await top100Page.$('select[data-testid="dropdown__select--top-30-by-team"]');
let top30Options = await top30Selector.$$eval(':scope option', options => options.map(x => x.value));

// only try the first one
top30Options = top30Options.filter(x => x);
const byTeam = {};

for await (const value of top30Options) {
  await top30Selector.select(value);
  await waitForResponse(top100Page, /^https:\/\/content-service.mlb.com\/\?operationName=getRankings/);

  await top100Page.waitForSelector('div.load-more__container button.load-more__button', { visible: true });

  const success = await top100Page.$eval('div.load-more__container button.load-more__button', b => {
    let button = document.querySelector('div.load-more__container button.load-more__button');
    let clickAttemptNumber = 0;
    while (button && clickAttemptNumber < 10) {
      button.click();
      button = document.querySelector('div.load-more__container button.load-more__button');
    }
    return clickAttemptNumber <= 10;
  });
  if (!success) {
    console.log(`Unable to fetch top 30 for value "${value}"`);
    browser.close();
    process.exit(-1);
  }

  const resultElements = await top100Page.$$('table.rankings__table--team tr[data-testid="table-row"]');
  const results = await Promise.all(
    resultElements.map(async e => {
      const toReturn = {};
      for await (const key of Object.keys(mapper)) {
        toReturn[key] = await e.$eval(`:scope ${mapper[key]}`, x => x.innerHTML);
      }
      return toReturn;
    })
  );
  byTeam[value] = results;
  console.log(`Collected results for "${value}"`);
}
fs.writeFileSync('./prospects/byTeam.json', JSON.stringify(byTeam));
console.log('Finished');
browser.close();