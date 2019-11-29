(function () {

  'use strict';

  angular.module('app').controller('GlobalController', GlobalController);

  GlobalController.$inject = ['$state', '$ionicHistory', 'FormService',
  '$ionicPlatform', 'EventService', 'AuthorizationService','$ionicLoading','$scope',
  'ToastService','$ionicModal','$timeout','$rootScope','LocalizationService','FluxService','$cordovaAppVersion','$cordovaNetwork','$cordovaDialogs'];


  function GlobalController($state, $ionicHistory, FormService, $ionicPlatform, EventService,
  AuthorizationService,$ionicLoading,$scope,ToastService,$ionicModal,$timeout,$rootScope,LocalizationService,FluxService,$cordovaAppVersion,$cordovaNetwork, $cordovaDialogs) {
    var vm = this;

    vm.loadForm = loadForm;
    vm.goToState = goToState;
    vm.loadFormMenuItems = loadFormMenuItems;
    vm.getFormIcon = getFormIcon;
    vm.getFormThemeColor = getFormThemeColor;
    vm.currentUser = {};
    vm.device = {};
    vm.navigateToForm = navigateToForm;
    vm.goIfOnline = goIfOnline;

    $ionicPlatform.ready(function() {
      activate();
    });

    function goIfOnline(state, keepHistory) {
      if($cordovaNetwork.isOnline() ) {
        goToState(state, keepHistory);
      }
      else {
        $cordovaDialogs.alert(LocalizationService.getString('noInternetConnection'), LocalizationService.getString('noConnection'), 'Ok');
      }
    }

    /**
     * Redirect the app to a specified state
     * @param  string state
     * @param  boolean keepHistory
     * @param  {} params
     */
    function goToState(state, keepHistory, params) {
      $ionicHistory.nextViewOptions({
        historyRoot: !keepHistory
      });
      if(params && params.clearCache === true){
        FluxService.clearCache(function(){
          $state.go(state, params);
        });
      }
      else{
        $state.go(state, params);
      }
    }
    /**
     * Loads a form template (a new one) or a existing to edit.
     * If formSlug is passed it opens the specified form
     * @param  string formType
     * @param  string formSlug
     * @param  boolean clearCache
     */
    function loadForm(formType, formSlug, clearCache) {
      var params = {
        'formType': formType,
        'formSlug': formSlug,
        'data' : null,
      };

      FormService.goToForm(params, true, clearCache);
    }

    /**Goes to a specified formitem, rendeing the template
     * @param  {} formItem
     */
    function navigateToForm(formItem){
      $rootScope.$broadcast('entering-form', formItem);
      loadForm(formItem.type, null, true);
    }

    /**
     * loads the menu item based in the form templates available
     */
    function loadFormMenuItems() {
      FormService.getFormTemplates(null, function (results) {
        vm.menuItems = [];
        angular.forEach(results, function(template){
          if(template.value.meta.publicForm){
            vm.menuItems.push(template);
          }
        });
      });
    }

    function activate() {
      $ionicModal.fromTemplateUrl('templates/loadingModal.html', { scope: $scope, animation: 'none'}).then(function(modal){
        $scope.modal = modal;
      });
      EventService.loadLocalEvents();
      loadFormMenuItems();
      AuthorizationService.getAuthorizationData(function(authData){
        vm.currentUser = authData.data.deviceUser;
        vm.deviceId = authData.data.imei;
      }, true);

      $cordovaAppVersion.getVersionNumber().then(function (localVersionNumber) {
        vm.appVersion = localVersionNumber;
      });
    }

    /**
     * Gets the form icon specified in the form meta
     * @param  {} form
     * @param  {} fullpath
     */
    function getFormIcon(form, fullpath) {
      var iconName = form.meta.icon;
      if (!iconName) {
        iconName = 'form';
      }
      if (fullpath) {
        return "svg/" + iconName + ".svg";
      }
      else {
        return iconName;
      }
    }

    /**
     * Ghets the template theme color specified in the form meta
     * @param  {} form
     */
    function getFormThemeColor(form) {
      var themeColor = form.meta.themeColor;
      if (!themeColor) {
        themeColor = 'gray';
      }
      return themeColor;
    }

    /**
     * Handles the device hardware button back events
     * @param  {} function(
     */
    $ionicPlatform.registerBackButtonAction(function () {
      var backView = $ionicHistory.backView();
      if(backView === null && $state.current.name !== "app.home"){
        $state.go('app.home');
      }
      else if ($state.current.name === "app.home" || backView.stateName === 'auth') {
        navigator.app.exitApp(); //<-- remove this line to disable the exit
      }
      else {
        $ionicHistory.goBack();
      }
    }, 100);

    $scope.$on('form-render-initiated', function (scope) {
      //ToastService.show( LocalizationService.getString('loadingForm'));
      $scope.modal.show();
    });

    $scope.$on('form-render-completed', function (scope) {
      $scope.modal.hide();
    });
  }
})();
