(function () {
  'use strict';

  angular
    .module('app')
    .service('UtilsService', UtilsService);

  UtilsService.$inject = [];
  function UtilsService() {
    this.recurComponent = recurComponent;
    this.propertyFromString = propertyFromString;
    this.isDate = isDate;
    this.isNumber = isNumber;
    this.tryParseDate = tryParseDate;
    this.getType = getType;
    this.arrayContains = arrayContains;


    /**
     * Recursive function that iterates each element of the component
     * and calls a callback passing each element
     * calling the callback.
     * callback - function(element)
     * @param  {} component
     * @param  function callback
     */
    function recurComponent(component, callback) {
      if (callback) {
        var stop = callback(component);
        if (stop) return true;
      }

      if (component && component.elements) {
        if(component.elements){
          for (var i = 0; i < component.elements.length; i++) {
            var element = component.elements[i];
            if (recurComponent(element, callback)) return true;
          }
        }
      }
      return false;
    }

    /**
    * Given an object o, and some property 'foo.bar',
    * returns the object this path represents
    */
    function propertyFromString(o, s) {
      s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
      s = s.replace(/^\./, '');
      if (s.indexOf('.') === -1) { // strip a leading dot{
        return o[s];
      }
      var a = s.split('.');
      for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (o && k in o) {
          o = o[k];
        } else {
          return;
        }
      }
      return o;
    }

    function getType(obj){
      return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
    }

    function isDate(content){
      var isInt = isNumber(content);
      if(!isInt){
        var tryedDate = Date.parse(content);
        if(!isNaN(tryedDate)){
          return true;
        }
      }
      return false;
    }

    function  tryParseDate(content){
        var isInt = isNumber(content);
        var tryedDate = null;
        if(!isInt){
            tryedDate = Date.parse(content);
            if(!isNaN(tryedDate)){
                return new Date(tryedDate);
            }
        }
        else{
            tryedDate = new Date(content);
            if(!isNaN(tryedDate)){
                return tryedDate;
            }
        }
        return false;
    }

    function isNumber(content){
      return /^-?[\d.]+(?:e-?\d+)?$/.test(content);
    }

    Array.prototype.contains = function(obj) {
        var i = this.length;
        while (i--) {
            if (this[i] == obj) {
                return true;
            }
        }
        return false;
    };

    function arrayContains(array, value){
      if(!array) return false;
      if(array.length === 0) return false;
      return array.contains(value);
    }
  }
})();
