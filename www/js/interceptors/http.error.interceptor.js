
(function () {

  'use strict';

  angular.module('app').factory('errorHttpInterceptor', errorHttpInterceptor);
  errorHttpInterceptor.$inject = ['$window','$q'];

  function errorHttpInterceptor($window,$q) {
    var service = {
      responseError: responseError
    };

    function responseError(rejection) {
      var errorObj = {
        message: 'HTTP response error - ' + rejection.config.url,
        //stacktrace: JSON.stringify(rejection),
        uuid: $window.device.uuid
      };
      console.log("error:",JSON.stringify(errorObj));
      sendError(errorObj);
      return $q.reject(rejection);
    }
    function sendError(errorObj) {

      try {
        $window.fabric.Crashlytics.addLog(errorObj.message);
        $window.fabric.Crashlytics.setStringValueForKey("errorMessage", errorObj.message);
        $window.fabric.Crashlytics.setStringValueForKey("deviceUUID", errorObj.uuid);
        $window.fabric.Crashlytics.setStringValueForKey("stackTrace", errorObj.stacktrace);
        //$window.fabric.Crashlytics.sendCrash();
        //$window.fabric.Crashlytics.sendNonFatalCrash(JSON.stringify(errorObj));
      } catch (error) {
        //silence is gold
      }
    }
    return service;
  }

})();
