const createCsvWriter = require('csv-writer').createObjectCsvWriter;

/**
 * A persister class for persisting to a CSV.
 */
module.exports = class CsvPersister {

  /**
   * Called when a CsvPersister is instantiated. Sets two CsvWriters, one for writing the property records and one for writing the failures.
   * @param {object} persisterOptions - file path data CsvPersister needs to instantiate
   */
  constructor(persisterOptions) {
    //set the file path and the columns for the property records CSV
    this.propertyRecordCsvWriter = createCsvWriter({
      path: persisterOptions.propertyRecordsCsvFilePath,
      header: [
          {id: 'name', title: 'Name'},
          {id: 'city', title: 'City'},
          {id: 'number', title: 'Street Number'},
          {id: 'street', title: 'Street'},
          {id: 'streetType', title: 'Street Type'},
          {id: 'propertyType', title: 'Property Type'},
          {id: 'parcelID', title: 'Parcel ID'},
          {id: 'neighborhood', title: 'Neighborhood'},
          {id: 'acreage', title: 'Acreage'},
          {id: 'dateInserted', title: 'Date Inserted'}
      ]
    });

    //set the file path and the columns for the failed property records CSV
    this.propertyRecordFailureCsvWriter = createCsvWriter({
      path: persisterOptions.propertyRecordsFailureCsvFilePath,
      header: [
          {id: 'name', title: 'Name'},
          {id: 'city', title: 'City'},
          {id: 'street', title: 'Street'},
          {id: 'streetType', title: 'Street Type'},
          {id: 'dateInserted', title: 'Date Inserted'}
      ]
    });
  }

  /**
   * Add a City and Date Inserted Property to the records, then insert the records into the CSV.
   * @param {object} persistOptions - any object for any values that need to be set for this particular persist call
   * @param {array} propertyRecordBatch - the array of records to be persisted
   */
  async persist(persistOptions, propertyRecordBatch) {
    if(propertyRecordBatch && propertyRecordBatch.length){
      let dateInsertedString = new Date().toLocaleString();
      
      let propertyRecordBatchRows = propertyRecordBatch.map(
        record => ({ 
          ...record, 
          city: persistOptions.cityLabel,
          dateInserted: dateInsertedString
        })
      );

      await this.propertyRecordCsvWriter.writeRecords(propertyRecordBatchRows);
      console.log('All street data is saved to csv!');
    }
  }

  /**
   * Add a City and Date Inserted Property to the records, then insert the records into the CSV.
   * @param {object} persistOptions - any object for any values that need to be set for this particular persist call
   * @param {array} failedPropertyRecordBatch - the array of failed records to be persisted
   */
  async persist_failure(persistOptions, failedPropertyRecordBatch) {
    if(failedPropertyRecordBatch && failedPropertyRecordBatch.length){
      let dateInsertedString = new Date().toLocaleString();

      let failedPropertyRecordBatchRows = failedPropertyRecordBatch.map(
        record => ({ 
          ...record, 
          city: persistOptions.cityLabel,
          dateInserted: dateInsertedString
        })
      );

      await this.propertyRecordFailureCsvWriter.writeRecords(failedPropertyRecordBatchRows);
      console.log('All failed street data is saved to csv!');
    }
  }
}