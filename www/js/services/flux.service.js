(function() {
'use strict';

  angular
    .module('app')
    .service('FluxService', FluxService);

  FluxService.$inject = ['$ionicHistory','$state'];
  function FluxService($ionicHistory,$state) {
     var service = {
       currentView: currentView,
       setCurrentViewStateParam:setCurrentViewStateParam,
       goToForm:goToForm,
       clearCache:clearCache,
       gotToDynamicForm:gotToDynamicForm,
       backView:backView,
       goBack:goBack,
       getStateParam:getStateParam,
       goBackFromAssociation:goBackFromAssociation,
       gotToContainerPage:gotToContainerPage,
       goBackFromPane:goBackFromPane
     };

    /**
     * Gets the current app view
     */
    function currentView() {
      var currentView = $ionicHistory.currentView();
      return currentView;
    }

    /**
     * Set and state params
     * @param  {} key
     * @param  {} value
     */
    function setCurrentViewStateParam(key, value){
      var currentView =  service.currentView();
      if(!currentView.stateParams.data) currentView.stateParams.data = {};
      currentView.stateParams.data[key] = value;
    }

    /**
     * Set and state params
     * @param  {} key
     * @param  {} value
     */
    function getStateParam(key){
      return service.currentView().stateParams.data[key];
    }

    /**
     * Goes to a specified  (in dataParam) form
     * @param  {} dataParams
     * @param  boolean keepHistory
     * @param  boolean clearCache
     */
    function goToForm(dataParams, keepHistory, clearCache) {

      // This will ignore past states
      $ionicHistory.nextViewOptions({
        historyRoot: !keepHistory
      });

      // If we choose to dump the cache, we need to wait
      // its promise to resolve before moving out
      if (clearCache) {
        $ionicHistory.clearCache().then(function () {
          gotToDynamicForm(dataParams,true);
        });
      }
      else {
        gotToDynamicForm(dataParams, false);
      }
    }

    /**
     * Clear app cache
     * @param  function callback
     */
    function clearCache(callback){
      $ionicHistory.clearCache().then(function () {
        if(callback) callback();
      });
    }

    /**
     * Router the app to a dinamic form according the params
     * @param  {} dataParams
     * @param  boolean reload
     */
    function gotToDynamicForm(dataParams, reload){
      $state.go('app.dynamicForm', dataParams, { reload: reload, inherit: false });
    }

     /**
     * Router the app to a dinamic form according the params
     * @param  {} dataParams
     * @param  boolean reload
     */
    function gotToContainerPage(params){
      $state.go('app.containerPage', params);
    }

    function goBack(backAmount){
      $ionicHistory.goBack(backAmount);
    }

    function backView(){
      var backView = $ionicHistory.backView();
      return backView;
    }

    function goBackFromAssociation($stateParams, currentForm){
      if ($stateParams.associationFrom) {
       var backView = service.backView();
       if (!backView.customData) backView.customData = {};
       backView.customData.associationBack = {
         formInfo: angular.copy(currentForm),
         from: angular.copy($stateParams.associationFrom)
       };
       service.goBack();
     }
    }

    function goBackFromPane(){
      //TODO: we must move this code snipe to FluxService
      var backQtd = 1;
      var history = $ionicHistory.viewHistory();
      var backView = $ionicHistory.backView();
      var currentView = $ionicHistory.currentView();
      while(!$state.params.data.backSection && backView !== null && backView.stateName !== 'app.dynamicForm'){
        backQtd++;
        backView = history.views[backView.backViewId];
      }

      $ionicHistory.goBack(-backQtd);
    }

    return service;

  }

})();
