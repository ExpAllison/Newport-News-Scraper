const puppeteer = require('puppeteer');
const fs  = require('fs')

// import the persist code and instantiate each persister
const JsonPersister = require("./persistence/json_persister.js")
const CsvPersister = require("./persistence/csv_persister.js")
const ScrapeStateManager = require('./scrape_state_manager.js')

const jsonPersister = new JsonPersister();
const csvPersister = new CsvPersister({
  propertyRecordsCsvFilePath: './property_records.csv',
  propertyRecordsFailureCsvFilePath: './property_records_failures.csv',
});
const scrapeStateManager = new ScrapeStateManager('scrape_state_newport_news.json')

//configure the list of persisters that we would like to invoke for our retrieved records
const persisters = [
  jsonPersister,
  csvPersister
];

//the number of street to batch for one part
const streetBatchSize = 100;

//if true, try to pick up where you left off, if false, forge ahead as though beginning anew
const loadFromPreviousStateIfAble = true

var browser;
var page;


function readStreetList(fname){
  try{
    const contents = fs.readFileSync(fname, 'utf8');
    return JSON.parse(contents);
  }
  catch(err){
    console.error(err);
    return '';
  }
}


let goToHome = async() => {
  console.log('Resetting to home...');
  await page.goto('https://assessment.nnva.gov/PT/Search/Disclaimer.aspx?FromUrl=../search/commonsearch.aspx?mode=address');

  page.on('console', msg => {
  for (let i = 0; i < msg.args().length; ++i)
    console.log(`${msg.args()[i]}`);
  });

  await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click('#btAgree')]);
}


let goHomeAndSearch = async (street, type, pageNum, overfull) => {
  await browser.close();
  //browser = await puppeteer.launch({'headless' : false});
  browser = await puppeteer.launch();
  page = await browser.newPage();
  await goToHome(page);

  await page.select("#Select1", type);
  await page.type("#inpStreet", street);
  await page.select("#selPageSize", '50');
  await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click('#btSearch')]);
  if(pageNum > 1){
    var pageSelector = await findPageNum(pageNum, overfull);
    await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click(pageSelector), page.waitForTimeout(2000)]);
  }
}


let resetSearchBar = async() => {
  try{
    await page.evaluate(() => {
      document.getElementById("inpStreet").value = '';
    });
  }
  catch(err){
    console.log('  Anomalous result! Going back...');
    Promise.all([page.waitForNavigation({'timeout' : 0}), page.goBack()]);
  }
}


let searchPageInfo = async () => {
  const generalInfo = await page.evaluate(() => {
    let rows = document.querySelectorAll("tr.SearchResults");
    console.log('Number of rows found: ' + rows.length);
    let totalInfo = [];
    for(var row of rows){
      var number = row.childNodes[1].childNodes[0].innerText;
      var propertyType = row.childNodes[6].childNodes[0].innerText;
      totalInfo.push({number, propertyType})
    }
    return totalInfo;
  });

  return generalInfo;
}


let propertyPageInfo = async (rowNumber, street, type, pageNum, overfull, oneEntry=false) => {
  if(!oneEntry){
    let selector = 'tr.SearchResults:nth-child(' + rowNumber + ')';
    await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click(selector)]);
  }

  let isGood = await page.evaluate(() => {
    return document.querySelectorAll('.msg-body').length == 0;
  });

  if(isGood){
    const result = await page.evaluate(() => {
      let elements = document.querySelectorAll(".DataletData");
      let name = elements[0].innerText;
      let number = elements[1].innerText.split(' ')[0];
      let parcelID = elements[2].innerText;
      let neighborhood = elements[4].innerText;
      let acreage = elements[5].innerText;
      return {name, parcelID, number, neighborhood, acreage};
    });
    if(!oneEntry){
      await Promise.all([page.waitForNavigation({'timeout' : 0}), page.goBack()]);
    }
    return result;
  }
  else{
    console.log('  Page loading was unsuccessful!');
    let name = 'UNKNOWN';
    let number = '-1';
    let parcelID = '0';
    let neighborhood = 'UNK';
    let acreage = '0';
    await goHomeAndSearch(street, type, pageNum, overfull);
    return {name, parcelID, number, neighborhood, acreage};
  }
}


let pageChangeSelector = async (overfull) => {
  const nextSelector = await page.evaluate(isOverfull => {
    let tableSel1 = `.contentpanel > div:nth-child(1) > 
                    table:nth-child(2) > tbody:nth-child(1) > 
                    tr:nth-child(1) > td:nth-child(1) > 
                    table:nth-child(1) > tbody:nth-child(1) > 
                    tr:nth-child(3) > td:nth-child(1) > 
                    center:nth-child(2)`;
    let tableSel2 = `tbody:nth-child(1) > tr:nth-child(1) > 
                    td:nth-child(2) > font:nth-child(2)`;
    let regularSel = ' > table:nth-child(3) > ';
    let overfullSel = ' > table:nth-child(4) > ';

    var tableSelector = isOverfull ? tableSel1 + overfullSel + tableSel2 : tableSel1 + regularSel + tableSel2;

    let element = document.querySelector(tableSelector);
    let linkCounts = 0;
    for(var child of element.childNodes){
      if(child.nodeName.toLowerCase() == 'a'){
        linkCounts++;
      }
    }
    return tableSelector + ' > a:nth-child(' + (linkCounts + 1) + ')';
  }, overfull);
  return nextSelector;
}


let findPageNum = async (pageNum, overfull) => {
  const nextSelector = await page.evaluate((isOverfull, curPageNum) => {
    let tableSel1 = `.contentpanel > div:nth-child(1) > 
                    table:nth-child(2) > tbody:nth-child(1) > 
                    tr:nth-child(1) > td:nth-child(1) > 
                    table:nth-child(1) > tbody:nth-child(1) > 
                    tr:nth-child(3) > td:nth-child(1) > 
                    center:nth-child(2)`;
    let tableSel2 = `tbody:nth-child(1) > tr:nth-child(1) > 
                    td:nth-child(2) > font:nth-child(2)`;
    let regularSel = ' > table:nth-child(3) > ';
    let overfullSel = ' > table:nth-child(4) > ';

    var tableSelector = isOverfull ? tableSel1 + overfullSel + tableSel2 : tableSel1 + regularSel + tableSel2;

    let element = document.querySelector(tableSelector);
    var linkCounts = 0;
    for(var child of element.childNodes){
      if(child.nodeName.toLowerCase() == 'a'){
        linkCounts++;
      }
    }
    return tableSelector + ' > a:nth-child(' + (curPageNum).toString() + ')';
  }, overfull, pageNum);
  console.log('  Finding page again: ' + nextSelector);
  return nextSelector;
}


let scrapeStreet = async (street, type) => {
  await page.select("#Select1", type);
  await page.type("#inpStreet", street);
  await page.select("#selPageSize", '50');
  await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click('#btSearch')]);

  var morePages = true;
  var allData = [];
  var failedScrapes = [];
  var overfull = await page.evaluate(() => {
    try{
      let selector = `.contentpanel > div:nth-child(1) > 
                      table:nth-child(2) > tbody:nth-child(1) > 
                      tr:nth-child(1) > td:nth-child(1) > 
                      table:nth-child(1) > tbody:nth-child(1) > 
                      tr:nth-child(3) > td:nth-child(1) > 
                      center:nth-child(2) > table:nth-child(1) > 
                      tbody:nth-child(1) > tr:nth-child(1) > 
                      td:nth-child(1) > font:nth-child(1) > 
                      b:nth-child(1)`;

      var warning = document.querySelector(selector).innerText;
      return warning.includes('You will not be able to select all records');
    }
    catch{
      return false;
    }
  });
  if(overfull){console.log('This page is overfull. It will have to be scraped again.');}
  var pageNum = 1;

  while(morePages){
  	await page.waitForTimeout(3000);

    const datalets = await page.evaluate(() => {
      return document.querySelectorAll('.DataletData').length;
    });

    var buildInfo = [];
    if(datalets == 0){
      buildInfo = await searchPageInfo();
    }
    else{
      let placeholder = {};
      placeholder['number'] = -1;
      placeholder['propertyType'] = 'Unknown';
      buildInfo.push(placeholder);
      morePages = false;
    }
    const generalInfo = buildInfo;

    let entries = await page.evaluate(() => {
      return document.querySelectorAll('tr.SearchResults').length;
    });
    if(entries == 0 && datalets == 0){
      await resetSearchBar();
      break;
    }
    else if(entries == 0){
      entries = 1;
    }

    let results = [];
  	for(let i = 0; i < entries; i++){
  		var rowNumber = i + 3;
      console.log('Scraping address: ' + generalInfo[i]['number'] + ' ' + street + ' ' + type + '...');
      const result = await propertyPageInfo(rowNumber, street, type, pageNum, overfull, (datalets > 0));
  		results.push(result);
  	}

  	for(let i = 0; i < generalInfo.length; i++){
  		var data = {};
  		data['name'] = results[i]['name'];
  		data['number'] = results[i]['number'];
  		data['street'] = street;
  		data['streetType'] = type;
  		data['propertyType'] = generalInfo[i]['propertyType'];
  		data['parcelID'] = results[i]['parcelID'];
      data['neighborhood'] = results[i]['neighborhood'];
      data['acreage'] = results[i]['acreage'];
      if(results[i]['name'].includes('UNK')){
        let failData = {};
        failData['number'] = generalInfo[i]['number'];
        failData['street'] = street;
        failData['streetType'] = type;
        failedScrapes.push(failData);
      }
      else
        allData.push(data)
  	}

    if(datalets > 0){
      await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click('li.sel:nth-child(2) > a:nth-child(1)'), page.waitForTimeout(2000)]);
      break;
    }

  	const nextSelector = await pageChangeSelector(overfull);

  	try{
  		console.log('Attempting to change pages with selector: ' + nextSelector +'...');
  		await Promise.all([page.waitForNavigation({'timeout' : 0}), page.click(nextSelector)]);
      pageNum++;
  	}
  	catch(err){
  		console.log('Ran out of pages!')
  		morePages = false;
      pageNum = 1;
  	}

    await page.waitForTimeout(1000);

    if(!morePages){
      await resetSearchBar();
    }
  }

  return [allData, failedScrapes];
};


let scrapeAllStreets = async (streetList, fileNum) => {
  //browser = await puppeteer.launch({'headless' : false});
  browser = await puppeteer.launch();
  page = await browser.newPage();
  await goToHome();

  var allStreets = [];
  var allFailures = [];
  for(var street of streetList){
    let [streetData, failedScrapes] = await scrapeStreet(street['streetName'], street['streetType'])
    for(var entry of streetData){
      allStreets.push(entry);
    }
    for(var entry of failedScrapes){
      allFailures.push(entry);
    }
  }

  await browser.close();

  //for each persister defined at the top, run its persist and persist_failure methods to let them do their thing
  let persistOptions = {
    cityId: 'newport_news',
    cityLabel: 'Newport News',
    batchNumber: fileNum
  }

  for (const persister of persisters) {
    await persister.persist(persistOptions, allStreets)
    await persister.persist_failure(persistOptions, allFailures)
  }

  //save state to load for next time
  let latest = {
    street: streetList[streetList.length -1],
    batchNumber: fileNum
  }
  scrapeStateManager.updateLatest(latest)
}


let scrapeDividedStreetList = async (streetList, startNum=0) => {
  for(var i = startNum; i < streetList.length; i += streetBatchSize){
    await scrapeAllStreets(streetList.slice(i, i + streetBatchSize), i/streetBatchSize + 1);
  }
}

var streetList = readStreetList('./newport_news_streets.json');

let streetListNewportNews = streetList['Newport News']
let lastBatchNumber = 0 

//if we selected to load from state and we have a state to load, let the state tell us what streets to check and what batch number to use.
if(loadFromPreviousStateIfAble && scrapeStateManager.hasSavedState()){
  console.log('Loading previous state from file')

  //get latest state from file
  scrapeStateLatest = scrapeStateManager.getLatest()

  //get the index of the street from our list that matches our latest street. If we can't find one, this will be -1
  indexOfLatestStreetNewportNews = streetListNewportNews.findIndex(
    (street) => 
      street.streetName == scrapeStateLatest?.street?.streetName && 
      street.streetType == scrapeStateLatest?.street?.streetType
  )
  
  //if we could find an index, shorten our array to use everything after that index and use the batch number from saved state
  if(indexOfLatestStreetNewportNews != -1){
    //calculate how far of the way through we are in percentage
    completePercentage = Math.round((indexOfLatestStreetNewportNews / streetListNewportNews.length) * 100)

    streetListNewportNews = streetListNewportNews.slice(indexOfLatestStreetNewportNews + 1)
    lastBatchNumber = scrapeStateLatest.batchNumber

    console.log(`Using saved state and starting from ${streetListNewportNews[0].streetName} ${streetListNewportNews[0].streetType} and batch ${lastBatchNumber + 1}`)
    console.log(`${completePercentage}% of the way through`)
  } else {
    console.warn('Unable to use saved state, starting from the beginning')
  }
}

var allStreets = scrapeDividedStreetList(streetListNewportNews, lastBatchNumber);

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(4) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(6)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(2)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > font:nth-child(5)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(4)