(function () {
  'use strict';

  angular
    .module('app')
    .run(run);

  run.$inject = ['$rootScope', '$window'];

  function run($rootScope, $window) {
    $rootScope.$on('$stateChangeSuccess', function (event, toState, otherdata) {
      if( ionic.Platform.isWebView() && $window.analytics && toState.data && toState.data.title) {
        $window.analytics.trackView(toState.data.title);
      }
    });

    $rootScope.$on("entering-form", function (event, formItem) {
       if( ionic.Platform.isWebView() && $window.analytics && formItem && formItem.desc) {
        $window.analytics.trackView(formItem.desc);
      }
    });
  }
}());
