(function() {

  'use strict';

  angular.module('app').directive('dfDynamicList', function(FormService, $ionicScrollDelegate,DynamicListComponent){
	  return {

		  templateUrl: 'templates/components/dynamicList.html',
		  scope : {
			  component : "=ngModel"
		  },
      link : function(scope){
        scope.component.parent = scope.parent ? scope.parent.slug : null;
        DynamicListComponent.updateIdMap(scope.component);

        scope.add = function(){
          DynamicListComponent.add(scope.component);
          $ionicScrollDelegate.scrollBottom(true);
        };

        scope.remove = function(index){
          DynamicListComponent.remove(scope.component,index);
        };
      }
	  };
  });

})();
