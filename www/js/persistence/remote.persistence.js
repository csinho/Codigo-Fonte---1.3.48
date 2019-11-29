(function () {

  'use strict';

  angular.module('app').factory('RemotePersistence', RemotePersistence);

  RemotePersistence.$inject = ['$q', '$http', '$timeout', 'GlobalService'];

  function RemotePersistence($q, $http, $timeout, GlobalService) {
    var service = {
      getExternalData: getExternalData,
      getAuthorization: getAuthorization,
      getServerTime: getServerTime,
      sendSyncData: sendSyncData,
      validateAppVersion:validateAppVersion
    };

    /**
     * Fetches external data from the backend. This includes the domain data and
     * the form templates.
     * Returns a promise to the externalData object
     */
    function getExternalData(lastSyncDate, uuid) {
      var externalData = [];

      // We fetch the domain data
      var domainDataPromise = getDomainData(lastSyncDate, uuid).then(function(response){
        return (externalData = response);
      });

      // We chain the promises so we push the templates in the external data
      var templatePromise = domainDataPromise.then(function(){
        return getTemplates(lastSyncDate, uuid);
      });

      // Then we return another promise to forward the external data
      var formPromise = templatePromise.then(function(response){
         externalData.push(response);
         return getUserForms(lastSyncDate, uuid);
      });

       // Then we return another promise to forward the external data
      return formPromise.then(function(response){
        externalData = externalData.concat(response);
        return externalData;
      });
    }

    /**
     * Return the promise to the server time.
     * Useful for maintaing the server time in syncronization operations
     * instead of the less reliable app time.
     */
    function getServerTime(){
      return $http.get(GlobalService.serverBaseUri + '/sync/time', {timeout: 3000});
    }

     /**
     * Return the promise to the latest app version
     */
    function validateAppVersion(localVersion){
      var options = {'params': {'deviceAppVersion':localVersion},timeout: 3000};
      return $http.get(GlobalService.serverBaseUri + '/apps/versionisvalid', options);

    }

    /**
     * Fetches external domain data from the backend
     * Returns a promise to the domainData object
     */
    function getDomainData(lastSyncDate, uuid){
      var deferred = $q.defer();

      // We could return this promise right away, but we want it to be consistent
      // with the $q promise, so we handle it here
      var options = {'params': {'uuid':uuid,'updatedAt': lastSyncDate ? lastSyncDate.getTime() : null}};
      $http.get(GlobalService.serverBaseUri + '/sync/download/domaindata/', options).success(function(response){
        deferred.resolve(response);
      }).error(function(response){
        deferred.reject(response);
      });

      return deferred.promise;
    }

     /**
     * Fetches external domain data from the backend
     * Returns a promise to the domainData object
     */
    function getUserForms(lastSyncDate, uuid){
      var deferred = $q.defer();

      // We could return this promise right away, but we want it to be consistent
      // with the $q promise, so we handle it here
      var options = {'params': {'uuid':uuid,'updatedAt': lastSyncDate ? lastSyncDate.getTime() : null}};
      $http.get(GlobalService.serverBaseUri + '/sync/download/forms/', options).success(function(response){
        deferred.resolve(response);
      }).error(function(response){
        deferred.reject(response);
      });

      return deferred.promise;
    }

    /**
     * Use this strategy for now, so we can switch between local and remote
     */
    function getTemplates(lastSyncDate, uuid){
      return getRemoteTemplates(lastSyncDate, uuid);
      //return getLocalTemplates();
    }

    /**
     * Fetches the templates from the backend
     * Returns a promise to the templates data
     */
    function getRemoteTemplates(lastSyncDate, uuid){
      var deferred = $q.defer();

      var forms = {
          domain : {
            slug: "formTemplate",
            description: "Templates de formulários"
          },
          entitySlug: "formTemplate",
          emptyExistingItems: true,
          items: []
      };

      // Fetchs the templates from the backend and propagate with a $q promise
      var options = {'params': {'uuid':uuid,'createdAt': lastSyncDate ? lastSyncDate.getTime() : null}};
      $http.get(GlobalService.serverBaseUri + '/sync/download/templates/', options).success(function(response){
        forms.items = response;

        //TODO: Verify this inconsistency in the type and desc
        angular.forEach(forms.items, function(form){
          form.type = form.value.meta.formType;
          form.desc = form.value.meta.formName;
        });

        deferred.resolve(forms);
      }).error(function(response){
        deferred.reject(response);
      });

      return deferred.promise;
    }

    /**
     * Fetches the templates from the local storage. This is helpful for
     * development time.
     * Returns a promise to the templates data
     */
    function getLocalTemplates(){
      var deferred = $q.defer();

      var forms = {
          entitySlug: "formTemplate",
          emptyExistingItems: true,
          items: []
      };

      // The success callback only add the returned form to forms
      var successFn = function(response){
        forms.items.push({ value: response, type: response.meta.formType, desc: response.meta.formName });
      }

      // The name of all the form to pull
      var formNames = ['domiciliar', 'individual', 'atividade', 'visita', 'familia'];

      // We construct all the promises and set the success callback
      var promises = [];
      angular.forEach(formNames, function(name){
        var promise = $http.get('data/forms/form.'+name+'.json');
        promises.push(promise);
        promise.success(successFn);
      });

      // We only resolve this function when all forms are pulled
      $q.all(promises).then(function(){
        deferred.resolve(forms);
      });

      return deferred.promise;
    }

    /**
     * Gets the authorization data from the remote service.
     * @returns a promise
     * @param  string uuid
     */
    function getAuthorization(uuid) {
      return $http.get(GlobalService.serverBaseUri + '/devices/authorized/' + uuid, { timeout: 3000 });
    }

    /**
     * Sends the sync data to the remote service
     * @param  {} syncUploadData
     * @param  function callback
     */
    function sendSyncData(syncUploadData) {
      //syncUploadData = {};
      return $http.post(GlobalService.serverBaseUri + '/sync/upload', syncUploadData /*, {timeout:3000}*/);
    }

    return service;
  }

})();
