(function() {

  'use strict';

  angular
    .module('app')
    .factory('ToastService', ToastService);

  ToastService.$inject = ['$cordovaToast', '$ionicLoading'];

  function ToastService($cordovaToast, $ionicLoading) {
    var service = {
      show: show
    };

    /**
     * Shows a message using the device native toaster
     * or the ionic toaster, according the device
     * @param  string message
     */
    function show(message, duration) {
      if(!duration) duration = 2000;
      if(ionic.Platform.isWebView()) {
        if(duration > 2000) duration = 'long';
        $cordovaToast.showShortBottom(message, duration);
      } else {
        $ionicLoading.show({ template: message, noBackdrop: true, 'duration': duration });
      }
    }

    return service;
  }

})();
