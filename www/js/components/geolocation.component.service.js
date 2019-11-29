(function() {
'use strict';

  angular
    .module('app')
    .service('GeolocationComponent', GeolocationComponent);

  GeolocationComponent.$inject = ['UtilsService','LocalizationService','$filter','GenericComponent'];
  function GeolocationComponent(UtilsService,LocalizationService,$filter,GenericComponent) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators,
      setValues:setValues
    };

    /**
     *
     * Ppulates the previous aved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      var geoTrans = {};

      var matchingLatItem = $filter('filter')(formDataCollection, {slug: component.slug+'_lat'}, true);
      if (matchingLatItem.length > 0) {
        geoTrans.lat = matchingLatItem[0].value;
      }
      var matchingLongItem = $filter('filter')(formDataCollection, {slug: component.slug+'_long'}, true);
      if (matchingLongItem.length > 0) {
        geoTrans.long = matchingLongItem[0].value;
      }
      var matchingAltItem = $filter('filter')(formDataCollection, {slug: component.slug+'_alt'}, true);
      if (matchingAltItem.length > 0) {
        geoTrans.alt = matchingAltItem[0].value;
      }

      if(geoTrans.lat && geoTrans.long){
        geoTrans.lastPostionAcquisitionTime = formDataCollection.createdAt;
      }
      component.transient = geoTrans;

      //set the properties that will be exported
      setValues(component,geoTrans);
    }

    function setValues(component, coordinates){
       if(coordinates.lat && coordinates.long){
         if(!coordinates.alt){
           coordinates.alt = LocalizationService.getString('notInformed');
         }
          component.values = [
            { "value": coordinates.lat, "slug": component.slug+"_lat", "desc": component.label+ " ("+LocalizationService.getString('lat')+")"},
            { "value": coordinates.long, "slug": component.slug+"_long", "desc": component.label+ " ("+LocalizationService.getString('long')+")"},
            { "value": coordinates.alt, "slug": component.slug+"_alt", "desc": component.label+ " ("+LocalizationService.getString('alt')+")"},
            { "value": coordinates.lat+','+coordinates.long, "slug": component.slug+"_latlong", "desc": component.label+ " ("+LocalizationService.getString('coordinates')+")",dataType:'latlong'}
          ];
        }
    }

    function restoreState(component){
      //do nothing
    }

    /**
     * Gets the geolocation data (lat, long, alt, ad latlong)
     * @param  {} component
     */
    function getData(component){
      var items = [];
      angular.forEach(component.values, function (item) {
        var itemElement = angular.copy(component);
        items.push({'value':item.value, 'valueDesc':item.value,'desc':item.desc,'dataType':item.dataType,'slug':item.slug});
      });
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
      if(!component.skipDefaultValidation && !UtilsService.arrayContains(component.validators,"validateGeoLocation")){
        if(!component.validators){
          component.validators = [];
        }
        component.validators.push('validateGeoLocation');
      }
    }


    return service;
  }

})();
