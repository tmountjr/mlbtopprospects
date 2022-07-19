import puppeteer from 'puppeteer';
import * as fs from 'fs';
import { toCsv } from './lib/csv.js'

const players = JSON.parse(fs.readFileSync('./prospects/merged.json').toString());

const browser = await puppeteer.launch({ headless: false, defaultViewport: { width: 1024, height: 768 } })
const page = await browser.newPage()
await page.goto('https://fantrax.com')
await page.waitForSelector('section.nav__right div:first-child b');
await page.$eval('section.nav__right div:first-child b', b => b.click())
await page.waitForSelector('input[name=userOrEmail]')
await page.type('input[name=userOrEmail]', process.env.FANTRAX_USERNAME)
await page.type('input[name=password]', process.env.FANTRAX_PASSWORD)
await page.click('div.nav-login button')

// get the title of the first left menu item
let itemTitle = '';
let ts = Date.now();
let expireTs = ts + 5000;
while (itemTitle !== "My Leagues" && Date.now() <= expireTs) {
  itemTitle = await page.$eval('section.nav__left div.nav-item b', b => b.innerHTML)
  itemTitle = itemTitle.trim()
}

await page.setDefaultNavigationTimeout(0)

const url = 'https://www.fantrax.com/fantasy/league/ro19vuuqkuddgk00/players;statusOrTeamFilter=ALL;searchName='
for (let i = 0; i < players.length; i++) {
  const urlEncodedName = encodeURIComponent(players[i].name)
  await page.goto(`${url}${urlEncodedName}`)
  await page.waitForSelector('input.cdk-text-field-autofill-monitored', { visible: true })
  const owner = await page.$('ultimate-table section table>tr table-cell:nth-of-type(3) *:first-child')
  if (owner) {
    const ownerText = await owner.evaluate(x => x.innerHTML)
    players[i].owner = ownerText
    console.log(`Player: ${players[i].name}\tOwner: ${ownerText}`)
  } else {
    console.log(`Player: ${players[i].name}\tOwner: [NOT FOUND]`)
    players[i].owner = null
  }
}

fs.writeFileSync('./prospects/merged.json', JSON.stringify(players));
toCsv(merged, './prospects/merged.csv');