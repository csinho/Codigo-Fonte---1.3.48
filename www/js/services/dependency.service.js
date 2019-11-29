(function() {
'use strict';

  angular
    .module('app')
    .service('DependencyService', DependencyService);

  DependencyService.$inject = ['UtilsService','Persistence','FormHandler'];

  function DependencyService(UtilsService, Persistence,FormHandler) {
    this.defineDependencyObject = defineDependencyObject;
    this.defineRequirementObject = defineRequirementObject;
    this.isRequired = isRequired;
    this.populateDepentChild = populateDepentChild;
    this.checkVisibility = checkVisibility;

    /**
     * Defines the visibility dependency of an element.
     * If it has no dependency defines a default visibility rule
     * @param  {} element
     */
    function defineDependencyObject(element) {
      if (element.visibilityDependsOn === undefined) {
        element.visibilityDependsOn = 'defaultVisibility';
        element.visibilityDependsOnAttr = 'dataValue';
      }
      if (element.visibilityDependsOn.indexOf('.') > -1) {
        element.visibilityDependsOnAttr = element.visibilityDependsOn.split('.')[1];
      }
      if (element.visibilityDependsOnAttr === undefined) {
        element.visibilityDependsOnAttr = 'dataValue';
      }
    }

    /**
     * Defines the requirement dependency of an element.
     * If it has no requirement dependency defines a default requirement rule
     * @param  {} element
     */
    function defineRequirementObject(element) {
      if (element.requirementDependsOn === undefined) {
        element.requirementDependsOn = 'defaultRequirement';
        element.requirementDependsOnAttr = 'dataValue';
        element.requirementDependsOnCompare = true;
      }
      if (element.requirementDependsOn.indexOf('.') > -1) {
        element.requirementDependsOnAttr = element.requirementDependsOn.split('.')[1];
      }
      if (element.requirementDependsOnAttr === undefined) {
        element.requirementDependsOnAttr = 'dataValue';
      }
      if (element.requirementDependsOnCompare === undefined) {
        element.requirementDependsOnCompare = true;
      }
    }


    /**
     * checks if an element of the form is required considering the its visibility, and its requirement dependency
     * @param  {} element
     */
    function isRequired (element, idMap) {
      if (element.required === undefined) {
        return false;
      }
      if (typeof (element.required) === 'boolean' || element.required === 'ifVisible') {
        if((!element.requirementDependsOn || element.requirementDependsOn === 'defaultRequirement') && (!element.visibilityDependsOn || element.visibilityDependsOn === 'defaultVisibility')){
          if(typeof (element.required) === 'boolean'){
            return element.required === true;
          }
          else{//isVisible specified but not visibility dependence specified, so it is visible and is required
            return true;
          }
        }
        else{
          if (idMap[element.requirementDependsOn]) {
            var dependObject = idMap[element.requirementDependsOn];
            if(element.requirementDependsOnAttr){
              var dependecyValue = UtilsService.propertyFromString(dependObject, element.requirementDependsOnAttr);
              if (typeof (dependecyValue) === typeof (element.requirementDependsOnCompare)) {
                return dependecyValue === element.requirementDependsOnCompare;
              }
            }
            else{
              if (typeof (dependObject.dataValue) === typeof (element.requirementDependsOnCompare)) {
                return dependObject.dataValue === element.requirementDependsOnCompare;
              }
            }
            return dependObject.dataValue !== null && dependObject.dataValue !== undefined;
          }
        }
      }
    }

     /**
     * Populates dependent child with options based in parent selected option
     * @param  {} dependObject
     * @param  {} validFilters
     */
    function populateDepentChild (component, dependObject, validFilters){
        if (dependObject.slug) {
          angular.forEach(component.filterSourceItens, function (filter) {
            if (filter.rightOperand && filter.rightOperand.elementProperty) {
              var appliedFilter = angular.copy(filter);
              appliedFilter.rightOperand = UtilsService.propertyFromString(dependObject, appliedFilter.rightOperand.elementProperty);
              if (appliedFilter.rightOperand)
                validFilters.push(appliedFilter);
            }
          });
          if (validFilters.length > 0) {

            var options = { filters: validFilters };
            Persistence.findItems(component, options, function (items) {
              component.options = items;
              FormHandler.restoreState(component);
            });
          }
          else {
            component.options = [];
          }
        }
    }

     /**
     * Checks whether this component should be visible or not
     * depending on the visibility dependency configuration.
     */
    function checkVisibility(component, newVal) {
        if(component.visibilityDependsOn === undefined){
          return true;
        }
        // If the compare value is true, it indicates that we must check only if the var is defined and is not false
        if(component.visibilityDependsOnCompare !== undefined && typeof component.visibilityDependsOnCompare === 'boolean'){
          return newVal === component.visibilityDependsOnCompare;
        }
        // We must compare values, and not types. In this context 3 is equal to "3"
        else if(newVal && component.visibilityDependsOnCompare && typeof component.visibilityDependsOnCompare !== 'boolean'){

          //if we must compare using a specific attribute
          if(component.visibilityDependsOnAttr){
            //by default we compare with the newValue
            var definedValue = newVal;

            //if the newVal is an object, we try go get the compare attribute from the object
            if( typeof definedValue === 'object'){
              //we try to get the attribute value from the root object
              definedValue = newVal[component.visibilityDependsOnAttr];

              //if the property was not found on the root, we try to get it from the dataValue object
              if(definedValue === undefined && typeof newVal.dataValue === 'object' ){
                definedValue = newVal.dataValue[component.visibilityDependsOnAttr];
              }
            }
            //finally we return the result of the values compares
            return definedValue.toString() === component.visibilityDependsOnCompare.toString();
          }
          else{//we compare with the root value
            return newVal.toString() === component.visibilityDependsOnCompare.toString();
          }
        }
        else if (typeof newVal !== 'boolean'){
          return newVal !== undefined && newVal !== null && newVal;
        }
        return newVal;
    }
  }
})();
