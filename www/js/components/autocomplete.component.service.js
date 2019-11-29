(function() {
'use strict';

  angular
    .module('app')
    .service('AutocompleteComponent', AutocompleteComponent);

  AutocompleteComponent.$inject = ['UtilsService','LocalizationService','$filter','Persistence','GenericComponent','$q'];
  function AutocompleteComponent(UtilsService,LocalizationService, $filter,Persistence,GenericComponent, $q) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators,

    };

    /**
     *
     * Ppulates the previous aved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      var matchingItems = $filter('filter')(formDataCollection, {slug: component.slug}, true);
      if(matchingItems.length > 0){
        var item = matchingItems[0];
        if(item.value){
          component.selectedItem = item;
          component.dataValue = item;
        }
      }
    }

    /**
     * Restore the autocomplete state, reselecting the selected item as it was when saved
     * @param  {} component
     */
    function restoreState(component){
      //if the options has only one option, we set it as selected
      if(component.options){
        if(component.options.length === 1){
          component.dataValue = element.options[0];
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
          else{
            addAndSetSelectedAnOption(component);
          }
        }
      }
    }

    /**
     * Get the selected item data from the autocmplete component
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

    /**
    * Adds a specific item to a multi-options componente and returns the item added on success
    * @param  {} element
    */
    function addAndSetSelectedAnOption(component){
      var deferred = $q.defer();

      var options = {limit: 50,orderBy: 'desc'};
      options.filters = [{leftOperand: "value", operator: "=", rightOperand: component.selectedItem.value}];
      Persistence.findItems(component.contentType, options, function (results) {
        component.options.push(results[0]);
        component.dataValue = results[0];
        if(component.dataValue.valueDesc){
          component.dataValue.desc = component.dataValue.valueDesc;
        }
      });
      return deferred.promise;
    }


    /**
     * Populates the component options based in a external datasource.
     * @param  {} component
     */
    function populateFromExternalDataSource(component){
      var deferred = $q.defer();
      var options = {limit: 50,orderBy: 'desc'};
      Persistence.findItems(component, options, function (results, currentAutoComplete) {
        currentAutoComplete.options = results;
        deferred.resolve(currentAutoComplete);
      });
      return deferred.promise;
    }

    function setValidators(component){
      //do nothing. this component has no custom validator and its validation is done by the angular validator
    }

    return service;
  }

})();
