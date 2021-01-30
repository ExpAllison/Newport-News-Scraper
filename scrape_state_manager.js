const fs = require('fs')

module.exports = class ScrapeStateManager {

  constructor(scrapeStatePath) {
    this.scrapeStatePath = scrapeStatePath
  }

  hasSavedState() {
    return fs.existsSync(this.scrapeStatePath)
  }

  getScrapeState() {
    if (this.hasSavedState()) {
      let scrapeStateJson = fs.readFileSync(this.scrapeStatePath)
      let scrapeState = JSON.parse(scrapeStateJson)
      return scrapeState
    } else {
      return null
    }
  }

  getLatest() {
    let scrapeState = this.getScrapeState()
    return scrapeState?.latest
  }

  updateLatest(latest) {
    let scrapeState = this.getScrapeState() || { }
    scrapeState.latest = latest
    let scrapeStateJson = JSON.stringify(scrapeState, null, 4);

    fs.writeFileSync(this.scrapeStatePath, scrapeStateJson, (err) => {
      if(err)
        throw err;
      console.log('Scrape state latest is updated');
    });
  }
}