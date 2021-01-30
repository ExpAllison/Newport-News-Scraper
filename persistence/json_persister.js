const fs  = require('fs')

/**
 * A persister class for persisting in the form of JSON files.
 */
module.exports = class JsonPersister {
  
  /**
   * Called when a JsonPersister is instantiated.
   */
  constructor() {
  
  }

  /**
   * Converts the records to JSON, generates the JSON path based on the city and batch number, and writes to file
   * @param {object} persistOptions - any object for any values that need to be set for this particular persist call
   * @param {array} propertyRecordBatch - the array of records to be persisted
   */
  async persist(persistOptions, propertyRecordBatch) {

    var propertyDataBatchJson = JSON.stringify(propertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.cityId}/${persistOptions.cityId}_streets_part${persistOptions.batchNumber}.json`;

    fs.writeFile(jsonFilePath, propertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All street data is saved to json!');
    });
  }

  /**
   * Converts the data to JSON, generates the JSON path based on the city and batch number, and writes to file
   * @param {object} persistOptions - any object for any values that need to be set for this particular persist call
   * @param {array} failedPropertyRecordBatch - the array of failed records to be persisted
   */
  async persist_failure(persistOptions, failedPropertyRecordBatch) {
    
    var failedPropertyDataBatchJson = JSON.stringify(failedPropertyRecordBatch, null, 4);

    var jsonFilePath = `${persistOptions.cityId}/${persistOptions.cityId}_streets_scrap_failures_part${persistOptions.batchNumber}.json`;
    
    fs.writeFile(jsonFilePath, failedPropertyDataBatchJson, (err) => {
      if(err)
        throw err;
      console.log('All failed street data is saved to json!');
    });
  }
}