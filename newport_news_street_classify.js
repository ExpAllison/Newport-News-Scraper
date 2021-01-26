let isLargeStreet = async(page, street, type) => {
  await page.select("#Select1", type);
  await page.type("#inpStreet", street);
  await page.select("#selPageSize", '50');
  await Promise.all([page.waitForNavigation(), page.click('#btSearch')]);

  let streetIsLong = false;
  var records = '';
  var lastNumber = 0;

  try{
    const warningText = await page.evaluate(() => {
      let selector = `.contentpanel > div:nth-child(1) > 
                      table:nth-child(2) > tbody:nth-child(1) > 
                      tr:nth-child(1) > td:nth-child(1) > 
                      table:nth-child(1) > tbody:nth-child(1) > 
                      tr:nth-child(3) > td:nth-child(1) > 
                      center:nth-child(2) > table:nth-child(1) > 
                      tbody:nth-child(1) > tr:nth-child(1) > 
                      td:nth-child(1) > font:nth-child(1) > 
                      b:nth-child(1)`;
      return document.querySelector(selector).innerText;
    });
    streetIsLong = warningText.includes('You will not be able to select all records');
    var tokens = warningText.split(" ");
    records = tokens[2];
    var fourthLink = `.contentpanel > div:nth-child(1) > 
                      table:nth-child(2) > tbody:nth-child(1) > 
                      tr:nth-child(1) > td:nth-child(1) > 
                      table:nth-child(1) > tbody:nth-child(1) > 
                      tr:nth-child(3) > td:nth-child(1) > 
                      center:nth-child(2) > table:nth-child(4) > 
                      tbody:nth-child(1) > tr:nth-child(1) > 
                      td:nth-child(2) > font:nth-child(2) > 
                      a:nth-child(4)`;

    await Promise.all([page.waitForNavigation(), page.click(fourthLink)]);
    await page.waitForTimeout(1000);
    var lastNumber = await page.evaluate(() => {
      let rows = document.querySelectorAll('tr.SearchResults');
      let element = rows[rows.length - 1];
      return element.childNodes[1].childNodes[0].innerText;
    });
  }
  catch(err){
    streetIsLong = false;
  }

  return [streetIsLong, {records, lastNumber}];
}

let streetClassify = async (streets) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await goToHome(page);

  var longStreets = [];
  for(var street of streets){
    console.log('Checking street ' + street['streetName'] + ' ' + street['streetType'] + '...')
    var streetSize = await isLargeStreet(page, street['streetName'], street['streetType']);

    if(streetSize[0]){
      console.log('...adding to overflow list!');
      var streetDict = {};
      streetDict['streetName'] = street['streetName'];
      streetDict['streetType'] = street['streetType'];
      streetDict['maxNumber'] = streetSize[1]['lastNumber'];
      streetDict['numRecords'] = streetSize[1]['records']
      longStreets.push(streetDict);
    }
    await resetSearchBar(page);
  }

  var allCities = {};
  allCities['Newport News'] = longStreets;
  const allCityData = JSON.stringify(allCities, null, 4);
  fs.writeFile('newport_news_long_streets.json', allCityData, (err) => {
    if(err)
      throw err;
    console.log('Long street data is saved!');
  });

  await browser.close();
}