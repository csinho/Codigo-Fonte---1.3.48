(function () {
  'use strict';

  angular.module('app').config(config);

  config.$inject = ['$compileProvider', '$ionicConfigProvider','$provide', '$httpProvider','timeAgoSettings'];

  function config($compileProvider, $ionicConfigProvider, $provide,$httpProvider,timeAgoSettings) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):|data:image\//);
    timeAgoSettings.overrideLang = 'pt_BR';
    $ionicConfigProvider.views.forwardCache(true);
    $httpProvider.interceptors.push('errorHttpInterceptor');
  }
}());

