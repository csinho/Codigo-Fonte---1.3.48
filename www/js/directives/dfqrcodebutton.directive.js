;(function () {
  'use strict';

  angular
    .module('app')
    .directive('dfQrCodeButton', dfQrCodeButton);

  dfQrCodeButton.$inject = ['LocalizationService', 'ToastService','$state','$cordovaBarcodeScanner'];

  function dfQrCodeButton (LocalizationService, ToastService,$state,$cordovaBarcodeScanner) {
    return {
      link: function link (scope, element, attrs) {},
      controller: function controller ($scope, LocalizationService,$state) {

        // Handle the qr buttom click
        $scope.associateQrCode = function () {
          $cordovaBarcodeScanner.scan().then(function (imageData) {
          var qrCode = imageData.text.trim();
          if (!qrCode) {//if the qr code was not read
              ToastService.show(LocalizationService.getString('theQRCodeCouldNotBeRead'));
          }
          else{
            //if was read we set the code in the component dataValue
            //and set the component as $submitted (so the valid icon is shown)
            $scope.component.dataValue = qrCode;
            $scope.component.$submitted = true;
            ToastService.show(LocalizationService.getString('qrCodeAssociatedSuccessfully'));
          }
          });
        };
      },
      scope: {
        component: '=ngModel'
      },
      templateUrl: 'templates/components/qrCodeButton.html'
    };
  }
})();
