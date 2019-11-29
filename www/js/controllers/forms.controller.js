(function() {

  'use strict';

  angular.module('app').controller('FormsController', FormsController);

  FormsController.$inject = ['$scope','$rootScope','$state','$stateParams'];

  function FormsController($scope, $rootScope, $state,$stateParams) {

    var vm = this;
    activate();

    function activate() {
    }

    vm.goToForm = function(formItem){
      var globalCtrl = $scope.$parent.globalCtrl;
      globalCtrl.navigateToForm(formItem);
    };
  }

})();
