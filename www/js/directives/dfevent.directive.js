(function() {

  'use strict';

  angular.module('app').directive('dfEvent', DFEvent);

  DFEvent.$inject = ['EventService'];

  /**
   * Directive for the event card
   */
  function DFEvent(EventService) {
    return {
      templateUrl : 'templates/cards/event.html',
      scope : {
        event: '=?ngModel'
      },
      link : function(scope) {
        /**
         * Mark the event as read
         */
        scope.markAsRead = function(){
          EventService.markAsRead(scope.event);
        };

        /**
         * Get the image source of this event
         */
        scope.getImageSrc = function(){
          var imgSrc = ''; //TODO: Default image here
          if(scope.event.imageName){
            imgSrc = cordova.file.dataDirectory + scope.event.imageName;
          }
          return imgSrc;
        };
      }
    };
  }

  /**
   * A badge to show the number of unread events
   */
  angular.module('app').directive('dfEventBadge', function(){
    return {
      template: '<span class="badge badge-assertive" ng-show="eventCtrl.numUnreadEvents > 0">{{eventCtrl.numUnreadEvents}}</span>',
      controller: 'EventController',
      controllerAs: 'eventCtrl'
    }
  });



})();
