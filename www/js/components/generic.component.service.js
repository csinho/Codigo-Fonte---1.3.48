(function() {
'use strict';

  angular
    .module('app')
    .service('GenericComponent', GenericComponent);

  GenericComponent.$inject = ['UtilsService','LocalizationService','$filter','$q','Persistence'];
  function GenericComponent(UtilsService,LocalizationService,$filter,$q,Persistence) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators,

    };

    /**
     * Ppulates the previous aved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      var matchingItems = $filter('filter')(formDataCollection, {slug: component.slug}, true);
      var item = matchingItems[0];
      component.dataValue = item.value;
    }

    function restoreState(component){
      //do nothing, populating the data is enough
    }

    function getData(component){
       //gets the component value from a object or directly from datavalue
        //var valueType = typeof (component.dataValue);
        var dataValueIsDate  = UtilsService.isDate(component.dataValue);
        var dataValueIsObject  = component.dataValue && typeof (component.dataValue) === 'object';
        var value = dataValueIsObject && !dataValueIsDate? component.dataValue.value : component.dataValue;

        var valueDesc = null;
        var desc = component.label ? component.label : component.desc;
        //gets the component value desc (what appears to the user) from a object or directly from dataValue
        if(component.dataValue !== null && component.dataValue !== undefined){
            //if is date, get set the value desc as a formatted/localized date
            if(UtilsService.isDate(component.dataValue)){
              var dateFormat = LocalizationService.getDateTimeFormat();
              valueDesc = $filter('date')(component.dataValue, dateFormat);
            }
            else if(typeof (value) === 'boolean'){
                valueDesc = value === true? LocalizationService.getString('yes'):LocalizationService.getString('no');
            }
            else if(dataValueIsObject && !dataValueIsDate){
              valueDesc = component.dataValue.desc;
            }
        }
        var valueIsDate  = UtilsService.isDate(value);
        var valueIsObject = value && typeof (value) === 'object';
        var itemValue = valueIsObject && !valueIsDate ? JSON.stringify(value) : value;
        return [{'value':itemValue,'valueDesc':valueDesc, 'desc':desc}];
    }

    function getValidators(){
      return [];
    }

     /**
     * Populate data from external source
     * @param  {} component
     * @returns promise
     */
    function populateFromExternalDataSource(component){
      var deferred = $q.defer();
      var options = {limit: 50,orderBy: 'desc'};
      Persistence.getItems(component, function (results, currentElement) {
        currentElement.options = results;
        deferred.resolve(currentElement);
      });
      return deferred.promise;
    }

    function setValidators(component){
      //do nothing. Generic component has no specifi validator. The validation is done by the angular validator
    }


    return service;
  }

})();

