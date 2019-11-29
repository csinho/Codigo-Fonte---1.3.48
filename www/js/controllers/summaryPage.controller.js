(function() {

  'use strict';

  angular
    .module('app')
    .controller('SummaryPageController', SummaryPageController);

  SummaryPageController.$inject = ['$scope', '$ionicPlatform', '$stateParams', '$q', 'FormService', 'FormHandler'];

  function SummaryPageController($scope, $ionicPlatform, $stateParams, $q, FormService, FormHandler) {
    var me = this;

    me.rootForm = null;
    me.onItemClick = onItemClick;

    $scope.$on("$ionicView.enter", function (){
      // If device is ready this will be called right away
      $ionicPlatform.ready(function() {
        activate();
      });
    });

    function activate() {
      if($stateParams.slug) {
        FormService.findRootForm($stateParams.slug).then(function(formItem){
          //we need to get the form populated for each one
          FormService.getSavedForm(formItem.slug).then(function(savedForm){
            me.rootForm = savedForm;
            FormHandler.prepareForSummary(me.rootForm);
          });
        });
      }
    }

    /**
     * The action to be taken when the user clicks on any summary card
     * @param {} item - The form card item
     */
    function onItemClick(item){
      $scope.globalCtrl.loadForm(item.type, item.slug, true);
    }

  }

})();
