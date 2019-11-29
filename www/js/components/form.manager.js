/*
@class HandlerFactory
@constructor
 */

function FormManager() {}

var formManager = FormManager.prototype;

/**
@method init
@return null
 **/
formManager.init = function (){

};

//SelectRender init
formManager = new FormManager();

formManager.factories = {
  'default' : function(type, element){
    return '<df-component ng-model="' + element.bindtRefStr + '" df-type="'+ type +'" parent="component"><df-component-concrete df-type="'+type+'"></df-component-concrete></df-component>';
  },
  'section' : function(element){
    return '<df-section ng-model="' + element.bindtRefStr + '" parent="component"></df-section>';
  },
  'geolocation' : function(element){
    return '<df-geolocation ng-model="' + element.bindtRefStr + '" parent="component"></df-section>';
  },
  'qrCodeButton' : function(element){
    return '<df-qr-code-button ng-model="' + element.bindtRefStr + '" parent="component"></df-section>';
  },
  'container' : function(element){
    return '<df-container class="df-container" ng-model="' + element.bindtRefStr + '" parent="component"></df-container>';
  },
  'dynamicList' : function(element){
    return '<df-dynamic-list ng-model="' + element.bindtRefStr + '" df-accordion parent="component"></df-dynamic-list>';
  },
  'associationList' : function(element){
    return '<df-association-list ng-model="' + element.bindtRefStr + '" parent="component"></df-association-list>';
  },
  'associationButton' : function(element){
    return '<df-association-button ng-model="' + element.bindtRefStr + '" parent="component"></df-association-button>';
  }
};


formManager.getTemplate = function(type, element, parentComponent){
  if(formManager.factories[type]) return formManager.factories[type](element, parentComponent);
  return formManager.factories['default'](type, element);
};





