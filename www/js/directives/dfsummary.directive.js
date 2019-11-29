(function () {

  'use strict';

  /**
   * Idiom for recursive directives. We separate 'member' from 'collection' to
   * avoid infinite loop by angular.
   */
  angular.module('app').directive('dfSummaryCollection', function (FormService) {
    return {
      restrict: "E",
      replace: true,
      scope: {
        children: '='
      },
      templateUrl: 'templates/cards/summaryCollection.html',
      link: function(scope){
        scope.onItemClick = function(item){
          var params = {'formType': item.type,'formSlug': item.slug,'data':null};
          FormService.goToForm(params, true, true);
        };
      }
    };
  });

  angular.module('app').directive('dfSummaryAlt', function($compile, $stateParams, FormService, FormHandler){
    return {
      templateUrl: 'templates/cards/genericSummary.html',
      scope: {
        item: "=ngModel"
      },
      link: function (scope, element) {
        // Little hack to highlight the searched item
        if($stateParams.slug === scope.item.slug){
          scope.selected = true;
        }

        /**
         * We load all the imediate children of the current form (item)
         */
        scope.loadChildren = function(){
          scope.children = [];
          // Hardcoded for now for getting only three cadastroIndividual children (visits);
          var options = (scope.item.type === 'cadastroIndividual') ? {orderBy:'createdAt',limit:3,order:'desc'} : {};
          FormService.getChildrenFormItems(scope.item.slug, options).then(function(items){
            if(scope.children) scope.children = [];
            angular.forEach(items, function(formItem){//we need to get the form populated for each one
              FormService.getSavedForm(formItem.slug).then(function(savedForm){
                FormHandler.prepareForSummary(savedForm);
                scope.children.push(savedForm);
              });
            });
          });
        };

        // We must compile here to not create a infinite loop
        scope.loadChildren();
        var html = '<df-summary-collection children="children"></df-summary-collection>';
        $compile(html)(scope, function(cloned){
          element.append(cloned);
        });

      }
    };
  });

  angular.module('app').directive('dfSummary', function ($filter, FormService, LocalizationService) {
    return {
      templateUrl: 'templates/cards/formSummary.html',
      scope: {
        item: "=ngModel",
        wasSearched:"=wasSearched",
      },
      link: function (scope) {

        /**
         * Sets the form type desc
         */
        scope.setTypeDesc = function(){
           if(!scope.item.typeDesc){
            FormService.getFormTemplates(null, function(results, entity, err){
              if(err){
                 scope.typeDescOnTemplateError();
              }
              else{
                  scope.typeMap = {};
                  angular.forEach(results, function (template) {
                    if(template.type === scope.item.type){
                      scope.item.typeDesc = template.desc;
                    }
                  });
              }
            });
          }
        };

        /**
         * Sets the item desc on getting template error
         */
        scope.typeDescOnTemplateError = function(){
          if(!scope.item.typeDesc)
            scope.item.typeDesc = LocalizationService.getString('typeUndefined');
          if(!scope.item.statusDesc)
            scope.item.statusDesc = LocalizationService.getString('statusUndefined');
        };

        /**
         * Sets the boolean if the value and desc properties must be shown
         */
        scope.setShowValueDesc = function (){
            if(!scope.item.desc && !scope.item.value){
              scope.showValueDesc = false;
            }
            else if(scope.wasSearched && (!scope.item.summary.title && !scope.item.summary.subtitle)){
              scope.showValueDesc = true;
            }
            else if(scope.item.summary.title && scope.item.summary.subtitle){
              scope.showValueDesc = scope.item.desc !== scope.item.summary.title.label && scope.item.desc !== scope.item.summary.subtitle.label;
            }
        };

        /**
         * Sets the form status desc
         */
        scope.setStatusDesc = function (){
          if(!scope.item.statusDesc){
            if(scope.item.formStatus === 'draft'){
              scope.item.statusDesc = LocalizationService.getString('draft');
            }
            else{
              scope.item.statusDesc = LocalizationService.getString('completed');
            }
          }
        };

        if(scope.item){
          scope.item.wasSearched = scope.wasSearched;
          scope.item.createdAt = $filter('date')(scope.item.createdAt, LocalizationService.getDateTimeFormat());
          scope.setShowValueDesc();
          scope.setStatusDesc();
          scope.setTypeDesc();
        }
      }
    };
  });

})();
