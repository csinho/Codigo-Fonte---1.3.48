(function() {
'use strict';

  angular
    .module('app')
    .service('MultiSelectComponent', MultiSelectComponent);

  MultiSelectComponent.$inject = ['UtilsService','LocalizationService','$filter','GenericComponent'];
  function MultiSelectComponent(UtilsService,LocalizationService,$filter,GenericComponent) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators
    };

     /**
     *
     * Ppulates the previous aved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      var matchingItems = $filter('filter')(formDataCollection, {slug: component.slug}, true);
      //var item = matchingItems[0];
      //if(!component.selectedItems) component.selectedItems = [];
      //component.selectedItems.push(item);
      return (component.selectedItems = matchingItems);
    }

    /**
     * Reselect the options that were selected when saved. At this point, the options saved
     * were already stored (temporally) in the selectedItems property.
     * @param  {} component
     */
    function restoreState(component){
      if(component.options){
        angular.forEach(component.options, function (option) {
            var matchingItems = $filter('filter')(component.selectedItems, {value: option.value}, true);
            if (matchingItems && matchingItems.length > 0) {
              option.selected = true;
            }
        });
      }
    }

    /**
     * Gets the data from the selected options in a multiselect
     * @param  {} component
     */
    function getData(component){
      var items = [];
      if(component.options){
        angular.forEach(component.options, function (item) {
          if(item.selected === true){
            items.push({'value':item.value, 'desc':item.desc});
          }
        });
      }
      return items;
    }


    /**
     * Populates the component options based in a external datasource.
     * This component uses the default strategy defined in the genreric component
     * @param  {} component
     */
    function populateFromExternalDataSource(component){
      return GenericComponent.populateFromExternalDataSource(component);
    }

    /**
     * Ads custom validation functions to the component
     * @param  {} component
     */
    function setValidators(component){
      if(!component.skipDefaultValidation && !UtilsService.arrayContains(component.validators,"validateMultiSelect") ){
        if(!component.validators){
          component.validators = [];
        }
        component.validators.push('validateMultiSelect');
      }
    }

    return service;
  }

})();
