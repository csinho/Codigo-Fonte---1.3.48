(function () {

  'use strict';

  /**
   * We created this but it would be better if the ngTrim worked.
   * It just trim the value of the input on the blur event
   */
  angular.module('app').directive('dfTrim', function () {
    return {
      require: '?ngModel',
      link: function (scope, element, attrs, ngModelCtrl) {
        if (!ngModelCtrl) return;
        element.bind("blur", function (event) {
          if (ngModelCtrl.$modelValue && ngModelCtrl.$modelValue.trim) {
            ngModelCtrl.$modelValue.trim();
            ngModelCtrl.$render();
          }
        });
      }
    };
  });


  angular.module('app').directive('dfPreValidation', function (FormService) {
    return {
      require: "ngModel",
      link: function (scope, element, attrs, ngModel) {
        // We put the validation map on the scope, so we can watch it
        scope.$vmref = FormService.validationMap;

        /**
         * This checks the status of the container content.
         * If it was not open yet, we query the component instead.
         */
        scope.validate = function () {
          if (scope.mainForm) {
            // This removes the 'form-' prefix from the name
            var name = scope.mainForm.$name.substring(5);
            var isValid;
            var cForm = FormService.currentForm;
            // We check the model first
            if (scope.component.$valid !== undefined) {
              isValid = scope.component.$valid;
            }
            // Then we check the container content
            else if (scope.$vmref && scope.$vmref[name] && scope.$vmref[name].mainForm) {
              isValid = scope.$vmref[name].mainForm.$valid;
            }
            // If the form is being edited, we dont need to check the required openning section anymore

            else if(cForm.formSlug && cForm.formSlug.length > 0 && cForm.status !== 'draft') {
              isValid = true;
            }
            // If it wasn't open yet, we can query the component instead
            else{
              isValid = !scope.component.requiresOpenning;
            }

            // We set the validity
            ngModel.$setValidity('validContainer', isValid);
          }
        };

        /** This is useful when the page sends this signal (transition). */
        scope.$on('$dfform.enter', function () {
          scope.validate();
        });

        /** This is useful when the form gets ready */
        scope.$watch('component', function (newVal) {
          if (newVal) scope.validate();
        });
      }
    };
  });



  angular.module('app').directive('dfValidationIcon', function (ValidationService, FormService) {
	   return {
      templateUrl: 'templates/components/validation-icon.html',
      link: function (scope) {
        scope.mainForm = scope['form-' + scope.component.slug];

        /**
         * The form is considered valid if:
         * 1. It was not opened and don't require to be opened
         * 2. It was opened and it's all good
         * So, we KISS and just set $dirty in the ones that don't
         * require to be opened, and check for dirtness as well =)
         */
        scope.isValid = function () {
          if (scope.mainForm){
            var currentForm = FormService.currentForm;
            var isValid;
            if(currentForm.formSlug && scope.component.type === 'container'){
              if(scope.component.requiresOpening){
                isValid = ValidationService.formIsValid(scope.component);
                return isValid;
              }
              else{
                return true;
              }
            }
            else{
              /*
               * Here we have two types of validation:
               *  1. Validations put on the html (ng-max, ng-min, ng-pattern etc).
               *     These validations are already propagated on the $valid
               *     property of the form. So we can use it right away.
               *     We'll call it viewValid
               *  2. Custom validations that are special validators we implement
               *     and declare on the json. We tried to use the $validators
               *     angular-way, but for some cases it didn't work and were
               *     troublesome.
               */
              var viewValid = true;
              if(scope.mainForm && scope.mainForm.$valid !== undefined){
                viewValid = scope.mainForm.$valid;
              }

              isValid = ValidationService.validateComponent(scope.component);

              // Account for both validations
              return isValid && viewValid;
            }
          }
          return true;
        };

        scope.showIcon = function () {
          var currentForm = FormService.currentForm;
          //if the form has already been saved, we are editing,
          //so we show the  validation icons
          if(currentForm.formSlug && scope.component.type === 'container'){
            return true;
          }
          //if is not saved yet, but has been subimitted, we also show
          else if (scope.component.$submitted !== undefined){
               return true;
          }
          //if the main form is not defined yet, we do not show the validation icon
          else if (!scope.mainForm){
               return false;
          }
          else
          {
             return scope.mainForm.$$parentForm.$submitted;
          }
        };
      }
	   };
  });

  angular.module('app').directive('dfItemLabel', function () {
    return {
      replace: true,
      template: '<span class="input-label item-text-wrap">{{component.label}} {{isRequired(component) ? "*" : ""}}</span>'
    };
  });

  angular.module('app').directive('dfPageLink', function ($state, $stateParams,FormService) {
	   return {
      link: function (scope) {
        scope.nextSibling = FormService.getNextSibling(scope.component, scope.parent);

        scope.openPage = function ($event, item) {
          // We need to pass info about the form...
          var formSlug = FormService.currentForm.formSlug;
          var formType = FormService.currentForm.formType;
          var form = item.slug;
          var next = scope.nextSibling ? scope.nextSibling.slug : null;
          var parent = scope.parent ? scope.parent.slug : null;

          // Save the current form as draft before go to the target form
          FormService.saveCurrentForm().then(
            function(response){
              $state.go('app.containerPage', { formSlug: formSlug, formType: formType, form: form, next: next, parent: parent, data: {backSection: true,formSlug:response.formSlug} });
            },
            function(error){
              console.log("Error while making partial saving");
            }
          );
        };
      }
	   };
  });


  // Used to render children components without any decoration.
  angular.module('app').directive('dfGeneral', function ($compile, FormService) {
    return {
      replace: true,
      scope: {
	    	  component: "=ngModel",
      },
      link: function (scope, element) {
        // Render the children
        scope.render = function (element) {
          scope.generatedHtml = FormService.buildChildren(scope.component.elements);
          element.html(scope.generatedHtml);
          $compile(element.contents())(scope);
        }

        // We register a watch to render the form subcomponent when it gets changed
        var unregister = scope.$watch('component', function (newVal) {
          // This happens when the the variable receive value
          if (newVal/* && !oldVal*/) {
            scope.render(element);
            unregister(); // We can stop watching...
          }
        }, true);
      }
    }
  });



  angular.module('app').directive('dfUpperCase', function ($parse) {
    return {
      require: 'ngModel',
      link: function (scope, element, attrs, modelCtrl) {
        var capitalize = function (inputValue) {
          if (!inputValue) { inputValue = ''; }
          if (!inputValue.toUpperCase) return inputValue;
          var capitalized = inputValue.toUpperCase();
          if (capitalized !== inputValue) {
            modelCtrl.$setViewValue(capitalized);
            modelCtrl.$render();
          }
          return capitalized;
        }
        modelCtrl.$parsers.push(capitalize);
        capitalize($parse(attrs.ngModel)(scope)); // capitalize initial value
      }
    };
  });


  angular.module('app').directive('dfLimitLength', function () {
    return {
      restrict: "A",
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        attrs.$set("ngTrim", "false");
        var limitLength = parseInt(attrs.dfLimitLength, 10);// console.log(attrs);
        scope.$watch(attrs.ngModel, function(newValue) {
          if((ngModel.$viewValue||"").length>limitLength){
            ngModel.$setViewValue( ngModel.$viewValue.substring(0, limitLength ) );
            ngModel.$render();
          }
        });
      }
    };
  });

})();
