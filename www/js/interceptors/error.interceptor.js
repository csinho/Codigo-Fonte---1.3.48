
(function () {

  'use strict';

  //angular.module('app').factory('$exceptionHandler', $exceptionHandler);

  $exceptionHandler.$inject = ['$window'];

  function $exceptionHandler($window) {
    return function errorCatcherHandler(exception, cause) {
      var errorObj = {
        message: exception.toString(),
        stacktrace: exception.stack,
        uuid: $window.device.uuid
      };
      console.log("error:",JSON.stringify(errorObj));
      sendError(errorObj);
    };

    function sendError(errorObj) {
      try {
        $window.fabric.Crashlytics.addLog(errorObj.message);
        $window.fabric.Crashlytics.setStringValueForKey("errorMessage", errorObj.message);
        $window.fabric.Crashlytics.setStringValueForKey("deviceUUID", errorObj.uuid);
        $window.fabric.Crashlytics.setStringValueForKey("stackTrace", errorObj.stacktrace);

        //The libe above will send the error and the kill app
        $window.fabric.Crashlytics.sendCrash();

        //$window.fabric.Crashlytics.sendNonFatalCrash(JSON.stringify(errorObj));
      } catch (error) {
        //silence is gold
      }
    }
  }
})();
