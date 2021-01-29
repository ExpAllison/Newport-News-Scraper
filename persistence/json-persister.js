const fs  = require('fs')

module.exports = class JsonPersister {
  constructor() {
  
  }

  persist(persistOptions, propertyRecordBatch) {

    var propertyDataBatchJson = JSON.stringify(propertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.city}/${persistOptions.city}_streets_part${persistOptions.batchNumber}.json`;

    fs.writeFile(jsonFilePath, propertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All street data is saved!');
    });
  }

  persist_failure(persistOptions, failedPropertyRecordBatch) {
    
    var failedPropertyDataBatchJson = JSON.stringify(failedPropertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.city}/${persistOptions.city}_streets_scrap_failures_part${persistOptions.batchNumber}.json`;
    
    fs.writeFile(jsonFilePath, failedPropertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All failed street data is saved!');
    });
  }
}