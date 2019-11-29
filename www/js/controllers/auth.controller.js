(function () {

  'use strict';

  angular.module('app').controller('AuthController', AuthController);

  AuthController.$inject = ['$timeout', '$scope', '$state', 'ToastService', 'Persistence',
    'GlobalService', 'LocalizationService', 'AuthorizationService', '$window', 'SyncService','RemotePersistence','$q','$cordovaAppVersion'];

  function AuthController($timeout, $scope, $state, ToastService, Persistence,
    GlobalService, LocalizationService, AuthorizationService, $window, SyncService, RemotePersistence,$q,$cordovaAppVersion) {
    var vm = this;

    vm.server = GlobalService.serverBaseUri;
    vm.canTryAgain = false;
    vm.deviceInfo = {};

    var resCheckingVersion = { success: false, msg: LocalizationService.getString('validatingAppVersion') };
    var resAuthenticating = { success: false, msg: LocalizationService.getString('authenticatingDevice') };
    var resErro = { success: false, msg: LocalizationService.getString('errorWhileAuthenticating') };
    var resWrongDate = { success: false, msg: LocalizationService.getString('errorWhileValidatingLocalDate') };
    vm.authenticationData = resCheckingVersion;


    /*
     * Para evitar que o botão seja clicado diversas vezes seguidas,
     * podemos habilitá-lo depois de um certo delay. Eis essa separação.
     */
    vm.enableBtn = function () {
      vm.canTryAgain = true;
    };

    /**
     * Ao tentar novamente, limpamos a mensagem e iniciamos um
     * novo ciclo de autenticação.
     */
    vm.tryAgain = function () {
      vm.authenticationData = resCheckingVersion;
      vm.authenticate();
    };



    /**
     * Ao permitir o acesso, retiramos as restrições do sistema
     * e redirecionamos o usuário para a home
     */
    vm.allowAccess = function () {
      //check if has a valid sync
      SyncService.checkLastSyncIsInValidDateRange(15, function (result) {
        if (result === true) {
          // Esperamos um pouco para o usuário ficar ciente da resposta
          $timeout(function () {
            $state.go(GlobalService.initialState);
            ToastService.show(LocalizationService.getString('authenticate'));
          }, 1000);
        }
        else {
          ToastService.show(LocalizationService.getString('youMustSync'));
          var params = { 'paramsObject': { startAutosync: true, goToHomeAfterSyncing: true } };
          $state.go('app.sync', params);
        }
      });
    };

    /**
     * Ciclo de autenticação.
     */
    vm.authenticate = function () {
      //checks if the app version is still valid to run
        SyncService.validateLocalTime().then(function (localTimeIsValid) {
          if(!localTimeIsValid){
            vm.authenticationData = resWrongDate;
            vm.enableBtn();
          }
          else{
            AuthorizationService.checkAppVersion(function (isValid, response) {
              vm.authenticationData = resAuthenticating;
              if (isValid === true) {
                AuthorizationService.getAuthorizationData(function (authData) {
                  vm.authenticationData = resErro;
                  if (authData.status) {
                    vm.authenticationData = authData;
                  }
                  if (vm.authenticationData.status === 'active') {
                    vm.allowAccess();
                  }
                  else {
                    vm.enableBtn();
                  }
                });
              }
              else {
                vm.authenticationData = resErro;
                if(response){
                  vm.authenticationData = response;
                }
                vm.enableBtn();
              }
            });
          }

       });
    };




    /**
     * Aqui começamos a tentar authenticate o dispositivo
     */
    ionic.Platform.ready(function () {
      activate();
    });

    function activate() {
      if (ionic.Platform.isWebView()) {
        vm.deviceInfo = window.device;
        vm.authenticate();
      }
      else {
        vm.allowAccess();
      }
      $cordovaAppVersion.getVersionNumber().then(function (localVersionNumber) {
        vm.appVersion = localVersionNumber;
      });
    }
  }

})();
