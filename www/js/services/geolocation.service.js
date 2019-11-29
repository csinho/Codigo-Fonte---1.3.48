(function () {

  'use strict';

  angular
    .module('app')
    .factory('GeoLocation', GeoLocation);

  GeoLocation.$inject = ['$q', '$cordovaGeolocation', '$cordovaBackgroundGeolocation'];

  /**
   * Sets global parameters
   */
  function GeoLocation($q, $cordovaGeolocation, $cordovaBackgroundGeolocation) {
    var service = {
      getLocation: getLocation,
      locationChangeListener:locationChangeListener,
      stopLocationListener:stopLocationListener
    };

    function getLocation() {
      var deferred = $q.defer();

      $cordovaGeolocation.getCurrentPosition({ timeout: 3000, enableHighAccuracy: true })
        .then(
          function (position) {
            var location = {
              lat: position.coords.latitude,
              long: position.coords.longitude,
              alt: position.coords.altitude
            };
            deferred.resolve(location);
          },
          function (reason, params) {
            deferred.reject(reason);
          }
        );
      return deferred.promise;
    }

    function locationChangeListener() {
      var deferred = $q.defer();
      var options = {
        maximumAge: 10000,
        timeout: 30000,
        enableHighAccuracy: true
      };

      $cordovaGeolocation.watchPosition(options).
      then(
        null,
        function(err) {
          // silence is gold
        },
        function(location) {
          deferred.notify(location);
      });
      return deferred.promise;
    }

    function stopLocationListener(){
      $cordovaBackgroundGeolocation.stop();
    }


    return service;
  }

})();
