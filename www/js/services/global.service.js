(function() {

  'use strict';

  angular
    .module('app')
    .factory('GlobalService', GlobalService);

  GlobalService.$inject = [];

  /**
   * Sets global parameters
   */
  function GlobalService() {
    var service = {
      initialState: "app.home",
      base64Prefix: "data:image/jpeg;base64,",
      //serverBaseUri: "http://desenv.macs.sesab.ba.gov.br",
      serverBaseUri: "http://homologa.mapadasaude.sesab.ba.gov.br",
      //serverBaseUri: "http://10.2.18.70:9000",
      authorizationData:{},
      formTemplates : [],
      eventsPath : "sync/events/image?img="
    };

    return service;
  }

})();


