(function() {

  'use strict';

angular.module('app').directive('dfCustomValidation', function(ValidationService,ComponentServiceFactory) {
    return {
      require : "ngModel",
      link : function(scope, element, attrs, ngModelCtrl){
        scope.$watch('component', function(newVal){
          var componentService = ComponentServiceFactory.get(scope.component.type);
          componentService.setValidators(scope.component);

          if (scope.component.validators && scope.component.validators.length > 0) {
            var isValid = scope.processValidators();
            ngModelCtrl.$setValidity('validComponent', isValid);
          }
        }, true);

        /**
         * Process the component attached validators and
         */
        scope.processValidators = function(){
          return ValidationService.validateComponent(scope.component);
        };
      }
    };
  });

  })();
