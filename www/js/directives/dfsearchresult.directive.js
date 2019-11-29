(function () {

  'use strict';

  angular.module('app').directive('dfSearchResult', function () {
    return {
      templateUrl: 'templates/cards/searchResult.html',
      scope: {
        resultsCollection: "=ngModel",
        onItemClick: '='
      },
      link: function (scope) {
        scope.onItemClickEvent = function (result) {
          scope.onItemClick(result);
        };
      }
    };
  });

})();
