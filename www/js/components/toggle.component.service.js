(function() {
'use strict';

  angular
    .module('app')
    .service('ToggleComponent', ToggleComponent);

  ToggleComponent.$inject = ['GenericComponent','UtilsService'];
  function ToggleComponent(GenericComponent,UtilsService) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators
    };

     /**
     *
     * Poulates the previous saved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      GenericComponent.populateFormData(component,formDataCollection);
    }

    /**
     * The toggle does not need a custom restores as its value is just boolean that as setd when populated
     * @param  {} component
     */
    function restoreState(component){
     //do nothing
    }

    /**
     * Gets the selected ooption data
     * @param  {} component
     */
    function getData(component){
      var data = GenericComponent.getData(component);
      return data;
    }

    function getValidators(){
      return ['validateToogle'];
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
      if(!component.skipDefaultValidation && !UtilsService.arrayContains(component.validators,"validateToggle")){
        if(!component.validators){
          component.validators = [];
        }
        component.validators.push('validateToggle');
      }
    }

    return service;
  }

})();
