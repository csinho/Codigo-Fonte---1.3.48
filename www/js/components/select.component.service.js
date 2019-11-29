(function() {
'use strict';

  angular
    .module('app')
    .service('SelectComponent', SelectComponent);

  SelectComponent.$inject = ['UtilsService','LocalizationService','$filter','GenericComponent'];
  function SelectComponent(UtilsService,LocalizationService,$filter,GenericComponent) {
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
      var item = matchingItems[0];
      component.selectedItem = item;
      component.dataValue = item;
    }

    /**
     * Restore the state of a selecte component, reselecting the option that was selected when saved
     * At this point, the previous select option was already stored (temporally) in the selectedItem property.
     * @param  {} component
     */
    function restoreState(component){
      //if the options has only one option, we set it as selected
      //TODO: check if the component is required to auto set the only option
      if(component.options){
        if(component.options.length === 1){
          component.dataValue = component.options[0];
        }
        else if(component.selectedItem){
          var matchingItems = $filter('filter')(component.options, {value: component.selectedItem.value}, true);
          if (matchingItems && matchingItems.length > 0) {
            component.dataValue = matchingItems[0];
            if(component.dataValue.valueDesc){
              //the valueDesc has priority over the generic desc
              component.dataValue.desc = component.dataValue.valueDesc;
            }
          }
        }
      }
    }

    /**
     * Gets the selected ooption data
     * @param  {} component
     */
    function getData(component){
      var data = GenericComponent.getData(component);
      //select component has always one single value
      data[0].desc = component.desc? component.desc: component.label;
      if(component.dataValue){
        data[0].valueDesc = component.dataValue.desc;
        //the valueDesc has priority over the generic desc
        if(component.dataValue.valueDesc){
          data[0].valueDesc = component.dataValue.valueDesc;
        }
      }
      return data;
    }

    function getValidators(){
      return [];
    }

    /**
     * Populates the component options based in a external datasource.
     * This component uses the default strategy defined in the genreric component
     * @param  {} component
     */
    function populateFromExternalDataSource(component){
       return GenericComponent.populateFromExternalDataSource(component);
    }

    function setValidators(component){
      //do nothing, the select is validated by default angular validator
    }

    return service;
  }

})();
