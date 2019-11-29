(function() {

  'use strict';

  angular
    .module('app')
    .controller('BackendController', BackendController);

  BackendController.$inject = ['GlobalService','$sce'];

  function BackendController(GlobalService,$sce) {
    var vm = this;

    activate();

    function activate() {
      vm.backendUrl = $sce.trustAsResourceUrl(GlobalService.serverBaseUri);
    }
  }

})();
