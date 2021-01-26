const puppeteer = require('puppeteer');
const fs  = require('fs')

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

  var allStreetData = JSON.stringify(allStreets, null, 4);
  fs.writeFile('newport_news/newport_news_streets_part' + fileNum + '.json', allStreetData, (err) => {
    if(err)
      throw err;
    console.log('All street data is saved!');
  });
  var allFailData = JSON.stringify(allFailures, null, 4);
  fs.writeFile('newport_news/newport_news_streets_scrap_failures_part' + fileNum + '.json', allFailData, (err) => {
    if(err)
      throw err;
    console.log('All failed scrape data is saved!');
  });
}


let scrapeDividedStreetList = async (streetList) => {
  for(var i = 0; i < streetList.length; i += 100){
    await scrapeAllStreets(streetList.slice(i, i + 100), i/100 + 1);
  }
}

var streetList = readStreetList('./newport_news_streets.json');
var allStreets = scrapeDividedStreetList(streetList['Newport News']);

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(4) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(6)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(2)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > font:nth-child(5)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)
//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(5)

//.contentpanel > div:nth-child(1) > table:nth-child(2) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(3) > td:nth-child(1) > center:nth-child(2) > table:nth-child(3) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(2) > font:nth-child(2) > a:nth-child(4)