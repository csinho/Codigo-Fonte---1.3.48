(function () {

  'use strict';

  angular
    .module('app')
    .factory('AuthorizationService', AuthorizationService);

  AuthorizationService.$inject = ['Persistence', 'RemotePersistence', '$window', 'GlobalService', '$cordovaAppVersion'];

  function AuthorizationService(Persistence, RemotePersistence, $window, GlobalService, $cordovaAppVersion) {
    var service = {
      isAuthorized: isAuthorized,
      getAuthorizationData: getAuthorizationData,
      checkAppVersion: checkAppVersion
    };

    /**
     * Checks if the devices is authorized
     * @param  {} callback
     */
    function isAuthorized(callback) {
      checkAppVersion(function (isValid) {
        if (isValid === true) {
          updateAuthorizationFromService(function () {
            getAuthorizationData(function (authData) {
              GlobalService.authorizationData = authData;
              if (authData.status === 'active') {
                if (callback) callback(true);
              }
              else {
                if (callback) callback(false);
              }
            });
          });
        }
        else {
          if (callback) callback(false);
        }
      });
    }

    /**
     * Checks if the app version is valid. First tries to check remotely.
     * if a connection is not available, checks locally, retriving the last app version check result
     * @param  {} callback
     */
    function checkAppVersion(callback) {
      $cordovaAppVersion.getVersionNumber().then(function (localVersionNumber) {
        RemotePersistence.validateAppVersion(localVersionNumber)
          .success(function (response) {
            saveAppVersionIsValid(true, function () {
              if (callback) callback(true);
            });
          })
          .error(function (response, status) {
            if (status === 401) {//the version is not authorized to run, save and returns false
              saveAppVersionIsValid(false, function () {
                if (callback) callback(false, response);
              });
            }
            else {//we could not verify the version remotely, check locally
              Persistence.getItems('appVersion', function (result) {
                if (result.length > 0) {
                  var appVersionData = result[0];
                  if (appVersionData.value === true) {
                    if (callback) callback(true);
                  }
                  else {
                    if (callback) callback(false, appVersionData);
                  }
                }
                else {
                  if (callback) callback(false, false);
                }
              });
            }
          });
      });
    }

    /**
     * Gets the authorization data. Can get only from local db or from remote service
     * @param  {} callback
     * @param  {} onlyLocal
     */
    function getAuthorizationData(callback, onlyLocal) {
      var authorizationData = {};
      if (onlyLocal && onlyLocal === true) {
        if (GlobalService.authorizationData.data) {
          if (callback) callback(GlobalService.authorizationData);
        }
        else {
          Persistence.getItems('authDevice', function (result) {
            if (result.length > 0) {
              authorizationData = result[0].value;
              GlobalService.authorizationData = authorizationData;
            }
            if (callback) callback(authorizationData);
          });
        }
      }
      else {
        updateAuthorizationFromService(function (hasError) {
          Persistence.getItems('authDevice', function (result) {
            if (result.length > 0) {
              authorizationData = result[0].value;
              GlobalService.authorizationData = authorizationData;
            }
            if (callback) callback(authorizationData);
          });

        });
      }
    }

    /**
     * Updates the authorization from remote service
     * @param  {} callback
     */
    function updateAuthorizationFromService(callback) {
      var uuid = $window.device.uuid;
      var syncHasError = false;
      var authResult = null;
      RemotePersistence.getAuthorization(uuid)
        .success(function (response) {
          authResult = response;
        })
        .error(function (response, status) {
          syncHasError = true;
          authResult = response;
        })
        .finally(function (response) {
          if (authResult && authResult.data) {
            saveAuth(authResult, function () {
              if (callback) callback(syncHasError);
            });
          }
          else {
            if (callback) callback(syncHasError);
          }
        });
    }

    /**
     * Saves the authentication data accquired
     * @param  {} data
     * @param  {} callback
     */
    function saveAuth(data, callback) {
      Persistence.emptyEntity('authDevice', function () {
        if (data) {
          Persistence.insertItem('authDevice', { value: data }, function (item, entity, error) {
            if (callback) callback();
          });
        }
        else {
          if (callback) callback();
        }
      });
    }

    /**
     * Saves the authentication data accquired
     * @param  {} data
     * @param  {} callback
     */
    function saveAppVersionIsValid(data, callback) {
      Persistence.emptyEntity('appVersion', function () {
        if (data) {
          Persistence.insertItem('appVersion', { value: data }, function (item, entity, error) {
            if (callback) callback();
          });
        }
        else {
          if (callback) callback();
        }
      });
    }

    return service;
  }

})();
