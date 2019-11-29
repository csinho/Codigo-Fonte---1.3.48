(function () {

  'use strict';

  angular.module('app').directive('dfPane', DFPaneDirective);

  DFPaneDirective.$inject = ['$compile', 'FormService', 'ToastService', 'GlobalService','LocalizationService','$rootScope','ValidationService','FluxService'];

  function DFPaneDirective($compile, FormService, ToastService, GlobalService, LocalizationService,$rootScope,ValidationService, FluxService) {
    return {
      templateUrl: 'templates/components/pane.html',
      controller: function ($scope) {

        $scope.render = function (element) {
          // We build the children (html)
          $scope.generatedHtml = FormService.buildChildren($scope.component.elements);
          var template = $scope.generatedHtml;

          // And then we compile it
          var queryResult = element[0].querySelector('.df-form-content');
          var contentContainer = angular.element(queryResult);
          contentContainer.html(template);
          $compile(contentContainer)($scope);

          // Create a alias
          $scope.mainForm = $scope['form-' + $scope.component.slug];

          // Keep the model consistent with the form status
          $scope.$watch('mainForm.$valid', function(newVal){
            $scope.component.$valid = newVal;
          });

          // When we open a new window we should restore the state of the form
          if ($scope.component.$submitted || FormService.validationMap[$scope.component.slug].mainForm.$submitted) {
            FormService.setSubmitted($scope.mainForm);
          }
        };

        // Go back one page. We'll put logic here to not allow inconsistent data
        $scope.back = function () {
          FluxService.goBack();
        };

        $scope.validate = function () {
          FormService.setSubmitted($scope.mainForm);
          $scope.component.$submitted = true;
          return $scope.mainForm.$valid;
        };

        // Validate the form and its children
        $scope.validateAndBack = function () {
          $scope.$broadcast('df-pane-submit', $scope);
          var valid = $scope.validate();

          // If valid we can go back =)
          if (valid) {
            ToastService.show(LocalizationService.getString('sessionSuccessfulyFilled'));
            FluxService.goBackFromPane();
          }
          else {
            ToastService.show(LocalizationService.getString('invalidDataCheckTheInputs'));
          }
        };

        $scope.validateAndAdvance = function () {
          var valid = $scope.validate();
          if (valid) {
            var _next = FormService.getNextSibling($scope.next, $scope.parent);
            //if there is a newx section (container), go to next
            if(_next){
               var params = {
                  'form': $scope.next.slug,
                  'next': _next ? _next.slug : null,
                  'parent': $scope.parent.slug
               };
              FluxService.gotToContainerPage(params);
            }
            else{//is last section, back to main page of the form
              $scope.validateAndBack();
            }
          }
          else{
            ToastService.show(LocalizationService.getString('invalidDataCheckTheInputs'));
          }
        };
      },
      scope: {
        component: "=ngModel",  // This optimally should be only the model
        parent: "=",            // Reference to the parent component
        next: "="               // Reference to the next sibling page. (TODO: Maybe implement previous as well)
      },
      link: function (scope, element) {
        // We register a non deep watch to the form subcomponents and we show/hide the loading
        scope.$watch('component', function (newVal) {
          // This happens when the ngModel receive value
          if (newVal) {
            $rootScope.$broadcast('form-render-initiated', { scope: scope });
            FormService.validationMap[scope.component.slug] = scope;
            scope.render(element);
            $rootScope.$broadcast('form-render-completed', { scope: scope });
          }
        });
      }
    };
  }

})();
