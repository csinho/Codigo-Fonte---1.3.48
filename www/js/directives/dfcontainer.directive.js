(function () {

  'use strict';

  angular.module('app').directive('dfContainer', function ($state, FormService) {
    return {
      templateUrl: 'templates/components/container.html',
      scope: {
        component: "=ngModel",
        parent: "="
      },
      link: function (scope) {
        scope.component.parent = scope.parent ? scope.parent.slug : null;
        // The main form is the current ng-form for this container
        scope.mainForm = scope['form-' + scope.component.slug];
        FormService.idMap[scope.component.slug] = scope.component;

        scope.openContainer = function () {
          var params = {
            // We need to pass info about the form...
            formSlug : FormService.currentForm.formSlug,
            formType : FormService.currentForm.formType,
            // ... and about the component (container/section)
            form     : scope.component.slug,
            next     : (scope.nextSibling ? scope.nextSibling.slug : null),
            parent   : (scope.parent ? scope.parent.slug : null),
            data : {}
          };

          $state.go('app.containerPage', params);
        };

        scope.nextSibling = FormService.getNextSibling(scope.component, scope.parent);
      }
    };
  });

})();
