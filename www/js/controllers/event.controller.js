(function() {

  'use strict';

  angular
    .module('app')
    .controller('EventController', EventController);

  EventController.$inject = ['$scope', 'EventService'];

  function EventController($scope, EventService) {
    var vm = this;

    vm.doRefresh = doRefresh;
    vm.loadMore = loadMore;
    vm.moreDataCanBeLoaded = moreDataCanBeLoaded;

    $scope.eventService = EventService;
    vm.events = EventService.events;
    vm.numUnreadEvents = EventService.numUnreadEvents;
    var stopFetching = false;

    $scope.$watch('eventService.events', function (newVal) {
      vm.events = newVal;
    });

    $scope.$watch('eventService.numUnreadEvents', function (newVal) {
      vm.numUnreadEvents = newVal;
    });

    $scope.$on("$ionicView.enter", function () {
      stopFetching = false;
      EventService.sync();
    });

    /**
     * Tries to fetch new events from the remote server
     */
    function doRefresh(){
      EventService.sync().then(function(events){
      }).finally(function(){
        $scope.$broadcast('scroll.refreshComplete');
      });
    }


    /**
     * Load more events when the user reaches the bottom of the page.
     * This fetches old events instead of the sync operation, which tries to
     * fetch new events from the remote server.
     * @returns
     */
    function loadMore(){
      EventService.loadMore().then(function(events){
        // If the list of just loaded events is empty we can stop fetching
        if(events.length === 0) {
          stopFetching = true;
        }
      }, function(){
        // In case of error, we flag to avoid indefinitely fetching
        stopFetching = true;
      })
      .finally(function(){
        $scope.$broadcast('scroll.infiniteScrollComplete');
      });
    }

    /**
     * Return true if we can load more data
     * @returns boolean
     */
    function moreDataCanBeLoaded(){
      return !stopFetching;
    }

  }
})();
