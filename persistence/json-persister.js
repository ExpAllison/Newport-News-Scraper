const fs  = require('fs')

module.exports = class JsonPersister {
  constructor() {
  
  }

  async persist(persistOptions, propertyRecordBatch) {

    var propertyDataBatchJson = JSON.stringify(propertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.cityId}/${persistOptions.cityId}_streets_part${persistOptions.batchNumber}.json`;

    fs.writeFile(jsonFilePath, propertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All street data is saved!');
    });
  }

  async persist_failure(persistOptions, failedPropertyRecordBatch) {
    
    var failedPropertyDataBatchJson = JSON.stringify(failedPropertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.cityId}/${persistOptions.cityId}_streets_scrap_failures_part${persistOptions.batchNumber}.json`;
    
    fs.writeFile(jsonFilePath, failedPropertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All failed street data is saved!');
    });
  }
}