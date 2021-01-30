const puppeteer = require('puppeteer');
const fs  = require('fs')

var browser;
var page;


let goHomeAndSearch = async (street, type, pageNum, number) => {
  await browser.close();
  //browser = await puppeteer.launch({'headless' : false});
  browser = await puppeteer.launch();
  page = await browser.newPage();
  await goToHome(page);

  await page.select("#Select1", type);
  await page.type("#inpStreet", street);
  await page.select("#selPageSize", '50');
  await page.type('#inpNumber', number);
  await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click('#btSearch')]);
  if(pageNum > 1){
    var pageSelector = await findPageNum(pageNum, overfull);
    await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click(pageSelector), page.waitForTimeout(2000)]);
  }
}