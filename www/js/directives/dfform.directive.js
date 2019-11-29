(function () {

  'use strict';

  angular.module('app').directive('dfForm', DFFormDirective);

  DFFormDirective.$inject = ['$compile', '$rootScope', 'Persistence', 'FormService','UtilsService','$ionicLoading'];

  function DFFormDirective($compile, $rootScope, Persistence, FormService, UtilsService, $ionicLoading) {
    return {
      templateUrl: 'templates/components/form.html',
      controller: function ($scope) {
        $scope.generatedHtml = '';
        this.$scope = $scope;

        $scope.buildComponents = function () {
          if (!$scope.component) {
            console.warn("You should specify a form through the ngModel directive");
            return;
          }
          var formElements = $scope.component.elements;
          $scope.generatedHtml = FormService.buildChildren(formElements);
        };

        $scope.render = function (element) {

          // We register the form in the idMap also.
          // The root node is the form (parent of the first level of containers)
          FormService.idMap[$scope.component.slug] = $scope.component;

          // We register the form in the idMap also.
          // The root node is the form (parent of the first level of containers)
          $scope.buildComponents();
          var template = $scope.generatedHtml;

          var queryResult = element[0].querySelector('.df-form-content');
          var contentContainer = angular.element(queryResult);
          contentContainer.html(template);
          $compile(contentContainer)($scope);


          $ionicLoading.hide();
        };

        $scope.validate = function () {
          FormService.setSubmitted($scope.mainForm, $scope.component);
        };

        /**
         * Verify if all children were viewed.
         */
        $scope.allChildrenOpened = function () {
          if(!$scope.mainForm) return false;

          // Will save the name of the containers not opened yet
          var childrenUnopened = [];

          UtilsService.recurComponent($scope.component, function(element){
            // If we don't register it in the validation map, it's because
            // it wasn't open yet.
            if( element.type === 'container' &&
                $scope.component.$submitted === undefined &&
                !FormService.validationMap[element.slug]){
              childrenUnopened.push(element.slug);
            }
          });

          // We can return the name of the unopened containers here...
          // ... but, for now we just return a boolean
          return childrenUnopened.length === 0;
        };
      },
      scope: {
        component: "=ngModel",
        formCtrlAs: "=",
        dfFormCtrlRef: "="
      },
      link: function (scope, element) {
        scope.$on('form-loaded', function(event, data){
          if(scope.mainForm){
            // We named the main form directive as mainForm...
            // We can give access through formCtrlAs
            scope.formCtrlAs = scope.mainForm;
            scope.formCtrlAs.dfForm = scope;
          }
          $rootScope.$broadcast('form-render-initiated', { scope: scope });

          scope.component = data;
          scope.render(element);

          $rootScope.$broadcast('form-render-completed', { scope: scope });
        });
      }
    };
  }

})();
