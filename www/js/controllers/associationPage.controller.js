(function () {

  angular.module('app').controller('AssociationPageController', AssociationPageController);

  AssociationPageController.$inject = ['$scope', '$stateParams', 'FluxService',
    'FormService', 'ToastService', 'SearchService', 'FormAssociationService', 'LocalizationService'];

  function AssociationPageController($scope, $stateParams, FluxService,
    FormService, ToastService, SearchService, FormAssociationService, LocalizationService) {
    var vm = this;

    vm.pageTitle = LocalizationService.getString('associationPage');
    vm.searchTerm = "";
    vm.searchFormType = "";
    vm.results = [];
    vm.doSearch = doSearch;
    vm.doAssociation = doAssociation;
    vm.resultsLabel = LocalizationService.getString('onlyCompletedsFormsAreBeingListed');
    vm.showFilterInput = true;


    $scope.$on('$ionicView.beforeEnter', function () {
      initialize();
    });

    /**
     * Initializes the controller
     */
    function initialize() {
      if ($stateParams.paramsObject) {
        vm.searchFormType = $stateParams.paramsObject.searchFormType;
        if ($stateParams.paramsObject.pageTitle)
          vm.pageTitle = $stateParams.paramsObject.pageTitle;
      }
      doSearch();
    }

    /**
     * Execs the association
     * @param  {} result
     */
    function doAssociation(form) {
      FormAssociationService.updateFormParent(form, $stateParams.paramsObject.parentSlug).then(function(response){
        FormAssociationService.prepareAssociation(form);
        FluxService.goBack();
      });
    }


    /**
     * Search for forms in the formSearchables and the search term inputed
     */
    function doSearch() {
       var formFilters = [
         { leftOperand: "form.type", operator: "=", rightOperand: vm.searchFormType},
         { leftOperand: "form.status", operator: "<>", rightOperand: 'draft'}
       ];
       var options = { "filters": formFilters, orderBy : 'createdAt', order:'desc'};
       options.limit = !vm.searchTerm? 20: 50;

       SearchService.searchForms(vm.searchTerm, options, function(results, entity, err){
            if(err){
              ToastService.show(LocalizationService.getString('searchError'));
            }
            else{
              vm.results = results;
              if (results.length === 0) {
                vm.showFilterInput = (vm.searchTerm && vm.searchTerm.length > 0);
                vm.resultsLabel = LocalizationService.getString('noCompletedFormOfThisTypeRegistered');
                ToastService.show(LocalizationService.getString('noResultFound'));
              }
              else{
                vm.showFilterInput = true;
                vm.resultsLabel = LocalizationService.getString('onlyCompletedsFormsAreBeingListed');
              }
            }
        });
    }
  }
})();
