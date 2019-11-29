(function () {

  'use strict';

  angular.module('app').factory('ComponentServiceFactory', ComponentServiceFactory);

  ComponentServiceFactory.$inject = ['$injector','$window'];

  function ComponentServiceFactory($injector,$window) {

    var me = this;
    me.get = get;

    /**
     * Gets the component handler strategy
     */
    function get(componentType) {

      var captalizedComponentType =  componentType.toLowerCase().charAt(0).toUpperCase() + componentType.slice(1);
      var componentServiceName = captalizedComponentType+ 'Component';
      var exist = $injector.has(componentServiceName);

      if(exist === true){
        return $injector.get(componentServiceName);
      }
      else{
        return $injector.get('GenericComponent');
      }
    }

    return me;
  }
})();
