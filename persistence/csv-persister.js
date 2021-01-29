const createCsvWriter = require('csv-writer').createObjectCsvWriter;

module.exports = class CsvPersister {

  constructor(persisterOptions) {
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
      console.log('All street data is saved!');
    }
  }

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
      console.log('All failed street data is saved!');
    }
  }
}