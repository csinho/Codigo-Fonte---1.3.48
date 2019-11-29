(function () {

  'use strict';

  angular
    .module('app')
    .factory('SyncService', SyncService);

  SyncService.$inject = ['$q', '$timeout', 'Persistence',
    'GlobalService', 'RemotePersistence', 'LocalizationService', 'FormService', '$window', 'AuthorizationService','FormHandler'];

  function SyncService($q, $timeout, Persistence,
    GlobalService, RemotePersistence, LocalizationService, FormService, $window, AuthorizationService, FormHandler) {
    var service = {
      checkLastSyncIsInValidDateRange: checkLastSyncIsInValidDateRange,
      download: download,
      upload: upload,
      lastSync: lastSync,
      validateLocalTime:validateLocalTime
    };

    /**
     * Executes the dowload of data which is part fo the sync process
     */
    function insertExternalDataCollection(externalEntitiesCollection, serverTime) {
      var deferred = $q.defer();
      var mainProgressMsg = ' [0%] - ' + LocalizationService.getString('syncing');

      var insert = function (dataCollection, currentIndex) {
        var currentData = dataCollection[currentIndex];

        // Little fix
        if (currentData.domain && currentData.domain.slug) {
          currentData.entitySlug = currentData.domain.slug;
        }

        if (dataCollection.length > 0) {
          // Calculate the progress
          var progress = ((currentIndex + 1) / (dataCollection.length)) * 100;

          // Get a description to show
          var desc = '';
          //if is a domain data
          if (dataCollection[currentIndex].domain && dataCollection[currentIndex].domain.description) {
            desc = dataCollection[currentIndex].domain.description;
          }
          //if is a form being downloaded
          else if(dataCollection[currentIndex].description){
            desc = dataCollection[currentIndex].description;
          }

          // Construct a message
          mainProgressMsg = ' [' + progress.toFixed(2) + '%] - ' + LocalizationService.getString('syncing') + ' ' + desc;

          // Build the notification object
          var notification = {
            msg: mainProgressMsg,
            progress: progress
          };

          // Forward the notification
          deferred.notify(notification);
        }

        Persistence.insertExternalData([currentData]).then(function (results, entity, errors) {
          var syncResult = { value: results };
          if (errors && errors.length > 0) {
            syncResult.status = 'failed';
            deferred.reject(errors);
          }
          else {
            // If still there are items
            if (currentIndex + 1 < dataCollection.length) {
              currentIndex++;
              insert(dataCollection, currentIndex);
            }
            else { //finished
              syncResult.status = 'succeeded';
              syncResult.type = 'download';

              // Use the more reliable server time
              syncResult.createdAt = serverTime;

              Persistence.insertItem(CONSTANTS.syncEntity, syncResult, function (item, entity, errors) {
                GlobalService.formTemplates = [];
                deferred.resolve(syncResult);
              });
            }
          }
        }, function error(error) {
          //console.log(error);
        }, function notify(msg) {
          //console.log(error);
        });
      };

      // We need only the entities that have items to insert
      // This also prevents a bug because when items is empty, the callback of
      // the function insertExternalData is not called.
      var dataCollection = externalEntitiesCollection.filter(function (e) {
        return e.items.length > 0;
      });

      // Start saving
      insert(dataCollection, 0);

      return deferred.promise;
    }

    /**
     * Executes the download of data which is part fo the sync process
     */
    function download() {
      var forwardFn = function (response) { return $q.reject(response); };
      var deferred = $q.defer();
      var serverTime;
      var lastSyncDate;

      // Fetch the time of the server
      var serverTimePromise = RemotePersistence.getServerTime().then(function (response) {
        serverTime = new Date(Number(response.data));
        return serverTime;
      }, function () {
        return $q.reject(LocalizationService.getString('itWasNotPossibletoGetTheServerTime'));
      });

      // Fetch the last time we synced
      var lastSyncPromise = lastSync('download').then(function (date) {
        return (lastSyncDate = date);
      });

      var allPromise = null;

      // We wait for the time from server and last sync time
      allPromise = $q.all([serverTimePromise, lastSyncPromise]);


      // Fetch the last syncronization date and then the external data from that date
      var fetchDataPromise = allPromise.then(function () {
        deferred.notify(LocalizationService.getString('obtainingExternalData'));
        // Get external data from remote service
        var uuid = $window.device.uuid;
        return RemotePersistence.getExternalData(lastSyncDate, uuid);
      }, forwardFn);

      // When the dataPromise is resolved we can insert the items
      var insertDataPromise = fetchDataPromise.then(function (externalEntities) {
        deferred.notify(LocalizationService.getString('insertingExternalDataInLocalDataBase'));
        appendFormSearchables(externalEntities);

        return insertExternalDataCollection(externalEntities, serverTime);
      }, forwardFn);

      // The final step, when we resolve our promise
      insertDataPromise.then(function (response) {
        deferred.resolve(response);
      }, function (response) {
        return deferred.reject({ syncResultError: response });
      }, function (response) {
        return deferred.notify(response); // Propagate notification
      });

      // We return a promise, this time of the insertion operation
      return deferred.promise;
    }


    /**
     * Evaluates if each external data is a form and if true,
     * extracts the formsearchables and append as data to be inserted
     * @param  {} externalEntities
     */
    function appendFormSearchables(externalEntities){
       angular.forEach(externalEntities, function(externalEntity){
          if(externalEntity.entitySlug && externalEntity.entitySlug === CONSTANTS.formEntity){
            angular.forEach(externalEntity.items, function(form){
              var formValue = false;
              if(form.value){
                formValue = JSON.parse(form.value);
                if(formValue){
                  var formSearchables = FormHandler.extractFormSearchables(formValue, form.slug);
                  if(formSearchables && formSearchables.length > 0){
                    var externalEntity = {
                      entitySlug:CONSTANTS.formSearchableEntity,
                      items:formSearchables,
                      emptyExistingItems: false
                    };
                    externalEntities.push(externalEntity);
                  }
                }
              }
            });
          }
        });
    }

    /**
    * Executes the upload of data which is part fo the sync process
    */
    function upload() {
      var deferred = $q.defer();

      // Use the more reliable server time
      RemotePersistence.getServerTime().then(function (response) {
        var serverTime = new Date(Number(response.data));
        //if the device is authorized
        lastSync('upload').then(function (lastSyncDate) {
          var formFilters = [];
          if (lastSyncDate) {
            //comment to send all local forms in case of testing
            formFilters.push({ leftOperand: "createdAt", operator: ">", rightOperand: lastSyncDate });
          }
          var params = {
            sentItems: 0, notSentItems: 0, itemPerUpload: 1,
            offset: 0, filters: formFilters, defer: deferred
          };
          //we start uploading forms fowarding the promise
          sendForms(params).then(function () {
            var syncResult = {status: 'succeeded',type: 'upload',createdAt: serverTime};
            Persistence.insertItem('sync', syncResult);
          });
        });
      }, function () {
        return deferred.reject(LocalizationService.getString('itWasNotPossibletoGetTheServerTime'));
      });

      return deferred.promise;
    }

    /**
     * Pack the data before sending to upload
     * @param  {} formsSync
     * @param  {} callback
     */
    function packAndSendSyncData(formsSync, callback) {
      AuthorizationService.getAuthorizationData(function (authorization) {
        lastSync('upload').then(function (lastSyncDate) {
          var syncUploadData = {
            "deviceId": authorization.data.imei,
            'formsSync': formsSync,
            'deviceUserId': authorization.data.deviceUser.id,
            'lastDeviceSyncDate': lastSyncDate
          };
          var promise = RemotePersistence.sendSyncData(syncUploadData);
          if (callback) callback(promise);
        });
      }, true);
    }

    /**
     * Send the the next possible batch of forms based on params.
     */
    function sendBatch(params) {
      // We don't get all the syncable forms as a list. We instead pass a offset
      // to fetch batches of the local database and send to the backoffice
      FormService.getSyncableFormSets(params, function (formsSync, errors) {
        if (errors || !formsSync.length) { // Recursion Base Case
          params.defer.resolve(params);
        }
        else { // Recursion General Case
          packAndSendSyncData(formsSync, function (promise) {
            promise.success(function (response) {
              params.notSentItems += response.data.errorItems;
              params.sentItems += response.data.successItems;
            })
            .error(function () {// error
              params.notSentItems += formsSync.length;
            })
            .finally(function () {
              params.offset += params.itemPerUpload;
              params.defer.notify(params);

              // Tries to send the next batch
              sendBatch(params);
            });
          });
        }

      });
    }

    /**
     * Retrives and send the syncable forms to the remote service
     * @param  {} params
     */
    function sendForms(params) {
      var countFilters = angular.copy(params.filters);
      countFilters.push({ leftOperand: "status", operator: "<>", rightOperand: 'draft' });

      // First we get the count
      //TODO: use the formEntity in formService instead of the string 'form'
      Persistence.countSimple(CONSTANTS.formEntity, countFilters).then(
        function (count) {
          // We update the total of forms to be synced
          params.total = count;
          params.defer.notify(params);

          // And start sending the batches
          sendBatch(params);
        },
        function (error) {
          params.defer.reject(params);
        }
      );

      return params.defer.promise;
    }

    /**
     * Gets the last sync datetime
     * @param type optional paramater {download, upload}
     */
    function lastSync(type) {
      var deferred = $q.defer();

      var options = {
        orderBy: 'createdAt', order: 'desc', orderByCast: 'datetime',limit: 1,
        filter: { "leftOperand": "type", "operator": "=", "rightOperand": type }
      };

      Persistence.findItems(CONSTANTS.syncEntity, options, function (results, entity, errors) {
        var lastSyncDate = null;
        if (results && results.length > 0) {
          lastSyncDate = results[0].createdAt;
        }
        deferred.resolve(lastSyncDate);
      });

      return deferred.promise;
    }

    /**
     * Verifies if the last sync date is older than the given date
     * @param  integer syncDays
     * @param  function callback
     */
    function checkLastSyncIsInValidDateRange(syncDays, callback) {
      var options = { orderBy: 'createdAt', order: 'desc' };
      var isLastSyncInDateRange = false;
      Persistence.findItems(CONSTANTS.syncEntity, options, function (results, entity, errors) {
        if (results && results.length > 0) {
          var lastSync = results[0];
          var currentDateMinus15Days = new Date();
          currentDateMinus15Days.setDate((new Date()).getDate() - syncDays);
          if (lastSync.createdAt >= currentDateMinus15Days) {
            isLastSyncInDateRange = true;
          }
        }
        if (callback) callback(isLastSyncInDateRange);
      });
    }

    function validateLocalTime(){
      var deferred = $q.defer();
      RemotePersistence.getServerTime()
        .success(
          function (response) {
            var serverTime = new Date(Number(response));
            var localTime = new Date();
            var timeDiff = Math.abs(serverTime.getTime() - localTime.getTime());
            var timeDiffInSeconds = timeDiff/1000;
            var validLocalTime = timeDiffInSeconds <= 7200; // less than 2 hours
            deferred.resolve(validLocalTime);
          }
        )
        .error(
          function(){
            deferred.resolve(true);
          }
        );
      return deferred.promise;
    }

    return service;
  }

})();
