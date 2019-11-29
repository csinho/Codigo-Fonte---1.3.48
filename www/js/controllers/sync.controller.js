(function () {

  'use strict';

  angular.module('app').controller('SyncController', SyncController);

  SyncController.$inject = ['$http', '$q', '$timeout', '$scope', 'ToastService', 'Persistence',
    'GlobalService', 'RemotePersistence', 'LocalizationService', 'FormService', 'SyncService',
    'AuthorizationService','$stateParams','$ionicHistory','EventService','$ionicPopup'];

  function SyncController($http, $q, $timeout, $scope, ToastService, Persistence,
    GlobalService, RemotePersistence, LocalizationService, FormService, SyncService,
    AuthorizationService,$stateParams,$ionicHistory,EventService,$ionicPopup) {
    var vm = this;
    vm.queryResult = '';
    vm.syncMsg = '';
    vm.synced = false;
    vm.syncSummary = '';
    vm.sync = sync;

    setSyncing(false);

    checkAutoStart();

    vm.queryDb = function () {
      Persistence.rawQuery(vm.sqlQuery, function (result, err) {
        if (err) {
          vm.queryResultMsg = LocalizationService.getString('errorOccurred');
          vm.queryResult = err;
        }
        else {
          vm.queryResultMsg = LocalizationService.getString('queryExecuted');
          vm.queryResult = result;
        }
      });
    };


    /**
     * Starts the syncing process, uploading and downloading data
     */
    function sync() {
       SyncService.validateLocalTime().then(function (localTimeIsValid) {
          if(!localTimeIsValid){
            vm.syncSucceeded = false;
            vm.syncResultMsg = LocalizationService.getString('errorWhileValidatingLocalDate');
          }
          else{
            EventService.load();
            resetProgress();
            vm.syncing = $scope.$parent.globalCtrl.syncing;
            if (!vm.syncing) {
              setSyncing(true);

              AuthorizationService.isAuthorized(function (isAuthorized) {
                if (isAuthorized) {
                  //reset the syncing status
                  vm.synced = false;
                  vm.uploadSummary = '';
                  //run upload -- when uploadTask is finished successfuly it will call the downloadTask
                  uploadTask();
                }
                else {
                  setSyncing(false);
                  ToastService.show(LocalizationService.getString('thisDeviceIsNotAuthorized'));
                }
              });
            }
            else {
              ToastService.show(LocalizationService.getString('waitTheCurrentSyncingFinish'));
            }
          }
       });


    }

    /**
     * Send all forms saved after last sync to remote server
     */
    function uploadTask() {
      var p = getProgressBar();
      resetProgress();

      //starts the upload task
      SyncService.upload()
        .then(
          function (response) {//resolved
            var msg = LocalizationService.getString('formsSent', [response.sentItems, response.notSentItems]);
            vm.syncResultMsg = msg;
            ToastService.show(msg);
            //call the download task
            vm.uploadSummary = vm.syncResultMsg;
            vm.syncResultMsg = LocalizationService.getString('startedDownloading');
            downloadTask();
          },
          function () {//rejected
            vm.syncResultMsg = LocalizationService.getString('deviceCanNotUploadData');
            finishSyncTask(false);
          },
          function (response) {//notify
            if(response.total){
              var totalSynced = response.sentItems + response.notSentItems;
              p.val( (totalSynced / response.total) * 100);
            }
            var msg = LocalizationService.getString('formsSent', [response.sentItems, response.notSentItems]);
            vm.syncResultMsg = msg;
          }
        );
    }

    function getProgressBar(){
      return angular.element(document.querySelector('#progressbar'));
    }

    function resetProgress(){
      getProgressBar().val(0);
    }

    /**
     * Get all domain data from remote server
     */
    function downloadTask() {
      var p = getProgressBar();
      resetProgress();

      SyncService.download().then(
        function (response) {//resolved
          vm.syncResultMsg = LocalizationService.getString('syncDownloadExecuted');
          // Reload global menu since data from sync can modify the itens in the menu
          $scope.$parent.globalCtrl.loadFormMenuItems();
          finishSyncTask(true);
        },
        function (response) {//rejected
          vm.syncResultMsg = LocalizationService.getString('theFollowingErrorOccurred', JSON.stringify(response.syncResultError));
          finishSyncTask(false);
        },
        function (response) {//notify
          var msg = response.msg ? response.msg : response;
          if(response.progress) p.val(response.progress);
          vm.syncResultMsg = msg;
        }
      );
    }

    /**
     * Runs the final task after syncing has finished,
     * like reset the sync status and redirects the app to home
     */
    function finishSyncTask(succeeded) {
      setSyncing(false);
      vm.synced = true;
      vm.syncSucceeded = succeeded;
      if(succeeded){
        vm.syncResultMsg = LocalizationService.getString('syncConcludedSuccessfully');
      }
      if ($stateParams.paramsObject && $stateParams.paramsObject.goToHomeAfterSyncing === true) {
        $scope.$parent.globalCtrl.goToState('app.home', false, null);
      }
    }

    /**
     * Check if the sync must run automatically based in the state params
     */
    function checkAutoStart() {
      if ($stateParams.paramsObject && $stateParams.paramsObject.startAutosync === true) {
        sync();
      }
    }

    function setSyncing(isSyncing){
      $scope.$parent.globalCtrl.syncing = isSyncing;
      vm.syncing = isSyncing;
      if(isSyncing){
        vm.syncBtnLabel = LocalizationService.getString('syncing') + '...';
        vm.syncResultMsg = LocalizationService.getString('startedSyncing');
      }
      else{
          vm.syncBtnLabel = LocalizationService.getString('sync');
      }
    }

    $scope.$on("$ionicView.enter", function () {
      setSyncing(false);
      vm.synced = false;
    });
  }

})();
