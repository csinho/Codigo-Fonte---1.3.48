(function () {

  'use strict';

  // NOTE: This will is a transitional step for the separation of concerns of df-component
  // Not ready yet.
  angular.module('app').directive('dfComponentConcrete', function(){
    return {
      templateUrl: function (elem, attrs) {
        // We make the selection based on the type
        var type = attrs.dfType;
        return 'templates/components/' + type + '.html';
      }
    };
  });


  angular.module('app').directive('dfComponent', dfComponent);

  dfComponent.$inject = ['Persistence', 'FormService', '$filter', 'ValidationService','UtilsService','DependencyService', '$q','FormHandler'];

  function dfComponent(Persistence, FormService, $filter, ValidationService,UtilsService, DependencyService, $q,FormHandler) {
    return {
      transclude : true,
      scope: {
        component: "=ngModel",
        parent: "="
      },
      require : 'ngModel',
      link: function (scope, element, attrs, ngModel, transclude) {
        // Manual scope transclusion!
        var newScope = scope.$new();
        transclude(newScope, function(clone){
          element.append(clone);
        });

        scope.component.parent = scope.parent ? scope.parent.slug : null;
        scope.mainForm = scope['form-' + scope.component.slug];
        scope.show = true;

        //TODO: Maybe move this to its own directive
        if (attrs.dfType === 'date') {
          if (scope.component.dataValue === 'now') {
            // We use 'now' as a shortcut for the current date
            scope.component.dataValue = new Date();
          }
          else {
            // We need to convert the text from json to date
            scope.component.dataValue = new Date(scope.component.dataValue);
          }
        }

        if(scope.component.contentType ===  undefined || scope.component.contentType ===  null){
          scope.component.contentType = element.slug;
        }

        //TODO: We could stop using this function.
        //TODO: This should be in the controller also
        scope.showElement = function () {
          return scope.show;
        };

        /**
         * Checks whether this component should be visible or not
         * depending on the visibility dependency configuration.
         */
        scope.checkVisibility = function (newVal) {
          return DependencyService.checkVisibility(scope.component,newVal);
        };


        // TODO: This should be done via events, emits etc.
        // If this component is a container, for example, it
        // should forward the message to all of its children.
        scope.reset = function () {
          scope.component.dataValue = null;
          //HACK: to work with multi-selections
          if (scope.component.type !== 'autocomplete' && scope.component.options) {
            for (var i = 0; i < scope.component.options.length; i++) {
              scope.component.options[i].selected = false;
            }
          }
        };

        /**
         * This is the callback that gets called when the dependency
         * value gets changed. We used to update the visibility and
         * reset values of this component.
         */
        scope.onVisibilityDependencyChanged = function (newVal, oldVal) {

          //if a newVal is not defined, the components envolved are not in distinct sections
          //(so are the watch will not fired when changed) then it is necessary to get the value
          // of the component on which the current depends on from the current form
          if(scope.component.visibilityDependsOn && newVal === undefined){
            var dependecyComponent = FormHandler.getComponent(FormService.currentForm.form, scope.component.visibilityDependsOn);
            //we restore the state if it was found
            //ATTENTION: this is not supporting components with mutiple values, like multiselect
            //this apporach also does not consider the items by referfence, but by value
            //the davaValue by referecen will be available only when the form is redered (and the optios are loaded)
            newVal = dependecyComponent.dataValue;
          }

          scope.show = scope.checkVisibility(newVal, oldVal);
          // We need to clear the field here. On the down border
          if (oldVal && !newVal){
              scope.reset();
          }
        };

        // If visibility depends on some other component we should watch it,
        // so we can reset our value.
        if (scope.component.visibilityDependsOn && scope.component.visibilityDependsOn !== 'defaultVisibility') {
          // We check who is the dependency
          scope._visibilityDependency = FormService.idMap[scope.component.visibilityDependsOn];

          // The variable we want to watch is on the scope through the _visibility variable,
          // but we should append the attribute part, to only listen that
          var varToWatch = '_visibilityDependency.' + scope.component.visibilityDependsOnAttr;

          // Here we're watching for changes in the attribute of the dependency (parent)
          // that triggers the visibility change
          scope.$watch(varToWatch, scope.onVisibilityDependencyChanged);
        }

        //set the item of a child componente when the parent option changes.
        //The items of the child came from the database
        //we watch the model of each compoennte that has depende childs
        scope._dependObject = FormService.idMap[scope.component.externalItensDependsOn];
        if (scope._dependObject) {
          scope.$watch('_dependObject', function () {
            scope.reset();
            if (scope.component.optionsExternalSource && scope.component.externalItensDependsOn && scope.component.sourceType === 'database') {
              var dependObject = scope._dependObject;
              var validFilters = [];
              scope.populateDepentChild(scope.component, dependObject, validFilters);
            }
          }, true);
        }

        /**
         * Populates dependent child with options based in parent selected option
         * @param  {} dependObject
         * @param  {} validFilters
         */
        scope.populateDepentChild = function (component, dependObject, validFilters){
          DependencyService.populateDepentChild(component, dependObject, validFilters);
        };

        /**
         * Checks if an element is required
         * @param  {} element
         */
        scope.isRequired = function (element) {
          return DependencyService.isRequired(element, FormService.idMap);
        };

        // Configures the component in case the parent is a section
        // TODO: Move this outta here
        if(scope.parent && scope.parent.type === 'section'){
          scope.nopadding = true;
        }

        /**
         * Filter component options based in the desc value
         * @param  {} query
         */
        scope.callbackMethod = function (query) {
          var deferred = $q.defer();
          var options = {limit: 50,orderBy: 'desc'};
          options.filters = [{leftOperand: "desc", operator: "like", rightOperand: query}];
          Persistence.findItems(scope.component.contentType, options, function (results) {
            deferred.resolve(results);
          });
          return deferred.promise;
        };

        /**
         * Dummy function used to prepopulate the autocomplete component.
         */
        scope.modelToItemMethod = function(modelValue){
          return scope.component.dataValue;
        };
      }
    };
  }
})();
