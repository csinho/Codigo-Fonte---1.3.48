(function() {
'use strict';

  angular
    .module('app')
    .service('AssociationlistComponent', AssociationlistComponent);

  AssociationlistComponent.$inject = ['UtilsService','LocalizationService','$filter','GenericComponent'];
  function AssociationlistComponent(UtilsService,LocalizationService,$filter,GenericComponent) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators
    };


     /**
     * Restore the association list component data from formData
     * @param  {} element
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      //The items associated (children) will be loaded from database asynchronously
      //We need only set the main item, it the component supports mainItem
      if(component.mainItem){
        var matchingMainItems = $filter('filter')(formDataCollection, {slug: component.mainItem.slug}, true);
        if (matchingMainItems.length > 0) {
          component.mainItem.selectedItemSlug = matchingMainItems[0].value;
        }
      }
    }

    function restoreState(component){
      //do nothing
    }

    /**
     * Get the selected item data from the association component
     * As we do not store the associated forms in the component, but the child form points to the parent form,
     * we just get as data the associated form type and "associatedFormType" as dataValue;
     * @param  {} component
     */
    function getData(component){
      var associationElement = angular.copy(element);
      //set the association target type as dataValue, so we can rebuild this association in the remote
      associationElement.dataValue = associationElement.associationTargetType;
      if(!associationElement.dataType) associationElement.dataType = "associatedFormType";
      var data = GenericComponent.getData(associationElement);
      return data;
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
      if(!component.skipDefaultValidation && !UtilsService.arrayContains(component.validators,"validateList")){
        if(!component.validators){
          component.validators = [];
        }
        component.validators.push('validateList');
      }
    }


    return service;
  }

})();
