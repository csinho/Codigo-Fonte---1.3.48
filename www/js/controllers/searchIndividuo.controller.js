(function() {

  'use strict';

  angular.module('app').controller('SearchIndividuoController', SearchIndividuoController);

  SearchIndividuoController.$inject = ['$scope', '$state', 'ToastService', 'Persistence',
  'GlobalService','$cordovaBarcodeScanner','LocalizationService','FormService','SearchService','$stateParams'];

  function SearchIndividuoController($scope, $state, ToastService, Persistence,
  GlobalService,$cordovaBarcodeScanner,LocalizationService, FormService,SearchService,$stateParams) {
    var vm = this;
    vm.results = [];
    vm.searchableTypes = [];
    vm.typeMap = {};
    vm.searchResultLabel = LocalizationService.getString('theSearchResultWillBeShowBelow');
    vm.ResultsCache = [];
    vm.status = 'all';
    vm.searchableFormTypes = [];
    vm.searchTitle = LocalizationService.getString('searchRegistry');
    vm.viewTitle = LocalizationService.getString('search');
    vm.showAllTypes = true;
    vm.searching = false;
    vm.formToSearchSlug = 'cadastroIndividual';

    function activate(){
      vm.ResultsCache = [];
      SearchService.getSearchableFormTypes(function(formTypes){
          //checks if it is a fixed type search and adjust the view and options
          angular.forEach(formTypes, function(template){
            if(template.type === vm.formToSearchSlug){
              vm.searchableFormTypes = [];
              vm.searchableFormTypes.push(template);
              vm.showAllTypes = false;
            }
          });
          //executes a search with no term filter
          vm.doSearch(10);
      });

    }

	  /**
     * Execs the search
	   */
	  vm.doSearch = function(limit){
        vm.searching = true;
        vm.searchResultLabel = LocalizationService.getString('searching') + '...';
        if(!limit) limit = 50;
        //check if the search about to be done is in the cache
        if(vm.ResultsCache[vm.status +'_'+vm.searchTerm + '_'+ vm.fixedFormType] !== undefined){
          showResults(vm.ResultsCache[vm.status +'_'+vm.searchTerm + '_'+ vm.fixedFormType]);
        }
        else{
          var options = {filters:[],'limit':limit, orderBy:'createdAt', order:'desc'};
          if(vm.status !== 'all'){
            options.filters.push({leftOperand:"form.status",operator:"=",rightOperand:vm.status});
          }

          options.filters.push({leftOperand:"form.type",operator:"=",rightOperand:vm.formToSearchSlug});
          SearchService.searchForms(vm.searchTerm, options, function(results, entity, err){
              if(err){
                  ToastService.show(LocalizationService.getString('searchError'));
              }
              else{
                //cache the results
                var resultKey = 'blank';
                if(vm.searchTerm){
                  resultKey = vm.searchTerm.replace(/\s/g, "_");
                }
                vm.ResultsCache[vm.status +'_'+ resultKey + '_' + vm.searchFormType] = results;
                showResults(results);
              }
          });
        }
	  };

    /**
     * Shows the search results in the view
     * @param  {} results
     */
    function showResults(results){
      vm.results = results;
      vm.searching = false;
      if(results.length === 0){
        ToastService.show(LocalizationService.getString('noResultFound'));
        vm.searchResultLabel = LocalizationService.getString('noResultFound');
      }
      else{
        if(vm.searchTerm){
          vm.searchResultLabel = LocalizationService.getString('searchResults');
        }
        else{
          vm.searchResultLabel = LocalizationService.getString('lastRegistries');
        }
      }

    }


    /**
     * Scan a bar/qr code
     */
    vm.scanBarcode = function() {
        $cordovaBarcodeScanner.scan()
        .then(function(imageData) {
            vm.searchTerm = imageData.text.trim();
            vm.doSearch();
        },
        function(error) {
            ToastService.show(LocalizationService.getString('qrCodeReadingError'));
        });
    };


    /**
     * Go to the details view of an item
     * @param  {} result
     */
    vm.goToItem = function(result){
        $scope.globalCtrl.loadForm(result.type, result.parentSlug, true);
    };

    /**
     * Given a certain result of the search, opens the respective summary page
     * @param {} result - The item to show more info
     */
    vm.openSummaryPage = function(result){
      var params = {
        'slug' : result.parentSlug // The search result is a formSearchable
      };
      $state.go('app.summary', params);
    };

    $scope.$on("$ionicView.enter", function () {
       activate();
    });
  }

})();
