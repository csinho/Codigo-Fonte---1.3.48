(function() {

  'use strict';

  angular.module('app').directive('dfSection', function(FormService){
    return {
      templateUrl: 'templates/components/section.html',
      scope: {
        component : "=ngModel",   // This optimally should be only the model
        parent: "=",    // Reference to the parent component
      },
      link: function (scope) {
        FormService.idMap[scope.component.slug] = scope.component;
        scope.nopadding = true;
      }
    };
  });

})();
