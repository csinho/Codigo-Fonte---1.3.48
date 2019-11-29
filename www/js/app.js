(function () {
  'use strict';

  angular
    .module('app', ['ionic', 'ngCordova', 'ui.mask', 'ion-autocomplete','yaru22.angular-timeago'])
    .run(run);

  run.$inject = ['$ionicPlatform', '$window', 'GlobalService'];

  function run($ionicPlatform, $window, GlobalService) {
    $ionicPlatform.ready(function() {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      if (window.cordova && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);

      }
      if (window.StatusBar) {
        // org.apache.cordova.statusbar required
        StatusBar.styleDefault();
      }

      if(typeof $window.analytics !== "undefined") {
        $window.analytics.startTrackerWithId('UA-71809428-2');
      }

      GlobalService.uuid = ionic.Platform.device().uuid;

    });
  }
}());
