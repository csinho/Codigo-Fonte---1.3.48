(function () {

  'use strict';

  angular
    .module('app')
    .factory('EventService', EventService);

  EventService.$inject = ['PersistenceFactory', 'GlobalService', '$http', '$q', '$cordovaFileTransfer'];

  function EventService(PersistenceFactory, GlobalService, $http, $q, $cordovaFileTransfer ) {
    var service = {
      events : [],
      numUnreadEvents: 0,
      sync : sync,
      load : load,
      loadMore : loadMore,
      loadLocalEvents : loadLocalEvents,
      countUnread : countUnread,
      markAsRead : markAsRead
    };

    var tableName = 'events';
    var persistence = PersistenceFactory.getPersistence();
    var numLoadMore = 2;

    /**
     * Mark the event as read and update its state in the local database
     */
    function markAsRead(event){
      event.read = true;
      var query = "UPDATE " + tableName + " SET read=1 WHERE id = " + event.id;
      return persistence.exec(query).then(function(response){
        eventsUpdated();
        return response;
      });
    }

    /**
     * Called internally when the events changes and there's a need to recalculate
     * the state of the service
     */
    function eventsUpdated(){
      countUnread().then(function(count){
        service.numUnreadEvents = count;
      });
    }

    /**
     * Append new events to service events
     * @param events - The events to be appended to the events
     */
    function appendEvents(events){
      for (var i = 0; i < events.length; i++) {
        service.events.push(events[i]);
      }
    }

    /**
     * Create the local table (if not exists)
     */
    function createTable() {
      return persistence.exec("CREATE TABLE IF NOT EXISTS " + tableName +
        " (id integer primary key, title text, description text, date DATETIME," +
        " read BOOLEAN, imageName text) "
      );
    }

    /**
     * Process the events to convert the data retrieved from the local database
     */
    function processEvents(events){
      // Hack for the way the db returns boolean
      angular.forEach(events, function(evt){
        if(evt.read === 'true') evt.read = true;
        if(evt.read === 'false') evt.read = false;
      });

      return events;
    }

    /**
     * Get the count of unread event without fetching the events
     */
    function countUnread(){
      var deferred = $q.defer();

      var query  = " SELECT count(*) FROM " + tableName + " WHERE read = 'false'";

      persistence.exec(query).then(function(response){
        var count = response.rows.item(0)['count(*)'];
        return deferred.resolve(count);
      }, function(error){
        return deferred.reject(error);
      });

      return deferred.promise;
    }

    /**
     * Load events from the local database instead of trying to go remote
     */
    function loadLocalEvents(count){
      return fetchLocalEvents(count).then(function(events){
        if(events) {
          service.events = events;
          eventsUpdated();
        }
        $q.resolve(events);
      }, function(error){
        $q.reject(error);
      });
    }

    /**
     * Read the events from the local database
     * @returns A promise and the list of events at resolve time
     */
    function fetchLocalEvents(count){
      count = count || numLoadMore;
      var deferred = $q.defer();

      var query = " SELECT * FROM " + tableName + " ORDER BY date desc LIMIT " + count;

      persistence.exec(query).then(function(response){
        var events = processEvents(persistence.rowsToItems(response.rows));
        return deferred.resolve(events);
      }, function(error){
        return deferred.reject(error);
      });

      return deferred.promise;
    }

    /**
     * Load more items (old ones) as the user reaches the bottom of the page
     */
    function loadMore(){
      var deferred = $q.defer();

      createTable().then(function(){
        var query = " SELECT * FROM " + tableName + " ORDER BY date desc " +
                    " LIMIT " + numLoadMore + " OFFSET " + service.events.length;
        persistence.exec(query).then(function(response){
          var events = processEvents(persistence.rowsToItems(response.rows));
          appendEvents(events);
          return deferred.resolve(events);
        }, function(error){
          return deferred.reject(error);
        });
      });

      return deferred.promise;
    }

    /**
     * Load the events, trying to sync first and then fetching the events from
     * the local database
     */
    function load(){
      createTable().then(function(){
        // First we try to get the updated list of events from the remote server
        var afterSync = sync().then(function(events){
          //console.log("Event syncronization is over", events);
        }, function(error){
          console.log('Error syncronizing remote events. Will use local instead');
        });

        // After the syncronization (either successful or failed) we load the
        // local events present in the local storage
        afterSync.then(loadLocalEvents);
      });
    }

    /**
     * Insert one event in the local database.
     * @param item - The event to be inserted
     * @returns a promise
     */
    function insertItem(item){
      var deferred = $q.defer();
      var query  = ' INSERT OR IGNORE INTO ' + tableName +
                   ' (id, title, description, date, read, imageName) ' +
                   ' VALUES (?, ?, ?, ?, ?, ?) ';
      var values = [item.id, item.title, item.description, item.date, false, item.imageName];

      persistence.exec(query, values).then(function(response){
        return deferred.resolve(response);
      }, function(error){
        return deferred.reject(error);
      });

      return deferred.promise;
    }


    /**
     * Given a list of items (events) insert each of then
     * @param items - The list of events
     * @returns A promise that will be resolved when all items are inserted.
     *          The original list will be passed as promise resolve.
     */
    function insertItems(items){
      var deferred = $q.defer();

      var promises = [];
      var insertedItems = [];

      // We iterate the list and collect promises
      angular.forEach(items, function(item){
        var remotePath = GlobalService.serverBaseUri + '/' + GlobalService.eventsPath + item.imageName;

        // We can insert the item, even if the image wasn't locally saved yet
        var promise = insertItem(item).then(function(response){
          // We only append to the list if it was inserted now
          if(response && response.rowsAffected){
            insertedItems.push(item);

            // If the event has image assigned we can save if locally
            if(remotePath && item.imageName){
              saveImageToLocalStorage(remotePath, getFullPath(item.imageName));
            }
          }
        });

        promises.push(promise);
      });

      // We want to intercept this promise and forward another to return the
      // original list of events
      $q.all(promises).then(function(){
        return deferred.resolve(insertedItems);
      }, function(error){
        return deferred.reject(error);
      });

      return deferred.promise;
    }

    /**
     * Fetch the available events for this agent and update the local database
     */
    function sync(){
      var deferred = $q.defer();

      createTable().then(function(){
        $http.get(GlobalService.serverBaseUri + '/sync/events/deleted').success(function(response){
          persistence.exec("DELETE FROM events WHERE id in ("+response.toString()+")").then(function(dbres){

            var uid = GlobalService.authorizationData.data.deviceUser.id;
            $http.get(GlobalService.serverBaseUri + '/sync/events/all', {timeout:5000, params:{userId:uid}}).success(function(response){
              insertItems(response.lista).then(function(events){
                var total = service.events.length + events.length;
                loadLocalEvents(total);
                return deferred.resolve(events);
              });
            }).error(function(error){
              return deferred.reject(error);
            });

          });
        });
      });

      return deferred.promise;
    }

    /**
     * Download the image and save the file (usually a image) in the local storage .
     */
    function saveImageToLocalStorage(remotePath, localPath){
      var trustHosts = true;
      var options = {};
      return $cordovaFileTransfer.download(remotePath, localPath, options, trustHosts);
    }


    /**
     * Returns the full path of the image in the local storage
     */
    function getFullPath(imageName){
      return cordova.file.dataDirectory + imageName;
    }

    return service;
  }

})();

