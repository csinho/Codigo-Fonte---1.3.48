(function () {

  'use strict';

  angular
    .module('app')
    .directive('dfGeolocation', dfGeolocation);

  dfGeolocation.$inject = ['FormService', 'GeoLocation', 'LocalizationService','ToastService','ComponentServiceFactory'];

  function dfGeolocation(FormService, GeoLocation, LocalizationService, ToastService, ComponentServiceFactory) {

    return {
      templateUrl: 'templates/components/geolocation.html',
      scope: {
        component: "=ngModel",
      },
      link: function (scope) {

        scope.component.labelLat = LocalizationService.getString('lat');
        scope.component.labelLong = LocalizationService.getString('long');
        scope.component.labelAlt = LocalizationService.getString('alt');


        FormService.idMap[scope.component.slug] = scope.component;
        scope.nopadding = true;
      },

      controller: function ($scope, GeoLocation, LocalizationService) {
        if(!$scope.component.transient){
          $scope.component.transient = {};
        }
        $scope.component.transient.acquiringPosition = false;
        $scope.component.transient.acquisitionStatusDesc = LocalizationService.getString('notCapturedYet');

        if ($scope.component.autoAcquire === true && !$scope.component.transient.lat) {
          GeoLocation.getLocation().then(
            function (location) {
             setLocation(location, $scope, true);
            }
          );
        }
        if ($scope.component.autoUpdate === true) {
          GeoLocation.locationChangeListener().then(
            null, null,
            function(location){//notify - updates location
              setLocation(location, $scope, true);
            }
          );
        }

        /**
         * Tries to acquires the location
         */
        $scope.acquirePosition = function () {
          $scope.component.transient.acquiringPosition = true;
          $scope.component.transient.acquisitionStatusDesc = LocalizationService.getString('acquiringPosition');

          //tries to get the location from the service
          GeoLocation.getLocation().then(
            function (location) {
             setLocation(location, $scope);
             $scope.refreshLocationStatus();
            },
            function (reason) {//the location could not be acquired due to gps not active GPS or the missing of signal
              ToastService.show(LocalizationService.getString('acquiringPositionError'));
              if(!$scope.component.transient.lat){
                $scope.component.transient.acquisitionStatusDesc = LocalizationService.getString('notCapturedYet');
                $scope.refreshLocationStatus();
              }
            }
          );
        };

        $scope.refreshLocationStatus = function(){
          $scope.component.transient.hasLocation = $scope.component.transient.lat && $scope.component.transient.long;
          $scope.component.transient.acquiringPosition = false;
        };
      }
    };

    /**
     * Set the location according passed to the model
     * @param  {} loc
     * @param  {} $scope
     * @param  {} suppressNotifications
     */
    function setLocation(loc, $scope, suppressNotifications){
      if(loc && loc.lat && loc.long){
        if(loc.lat === $scope.component.transient.lat && loc.long == $scope.component.transient.lat){
          if(suppressNotifications === true){
            ToastService.show(LocalizationService.getString('locationHasNotChanged'));
          }
        }
        else{
          $scope.component.lastPostionAcquisitionTime = new Date();
          $scope.component.transient.lat = loc.lat;
          $scope.component.transient.long = loc.long;
          if(loc.alt){
            $scope.component.transient.alt = loc.alt;
          }
          //set the properties that will be exported

          var componentService = ComponentServiceFactory.get($scope.component.type);
          componentService.setValues($scope.component, loc);
        }
      }
    }
  }
})();
