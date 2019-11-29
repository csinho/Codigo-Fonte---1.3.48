(function() {

  'use strict';

  angular
    .module('app')
    .factory('SearchService', SearchService);

  SearchService.$inject = ['Persistence', '$filter','LocalizationService','FormService','GlobalService','FormHandler','UtilsService'];

  function SearchService(Persistence, $filter, LocalizationService, FormService, GlobalService, FormHandler, UtilsService) {
    var service = {
      searchForms: searchForms,
      getSearchableFormTypes:getSearchableFormTypes
    };

    /**
     * Search saved forms in the database
     * @param  {} term
     * @param  {} options
     * @param  {} callback
     */
    function searchForms(term, options, callback) {
      options = parseOptions(options);
      options.filters.push({leftOperand:"value",operator:"like",rightOperand:term,entity:CONSTANTS.formSearchableEntity});

        Persistence.findItems(CONSTANTS.formSearchableEntity, options, function (results, entity, err) {
          //populates the type desc for each item

          if(results.length > 0){//if there are results
            var preparedItems = 0;
            angular.forEach(results, function (item) {
              // As we are in a loop and  the function below is async,
              // we pass the current item as context
              // and when the async callback occours for each item,
              // we know in which item we must populate the returned data
              FormService.getSavedForm(item.parentSlug, item).then(function(form){

                //restore the item from the callback data context
                item = angular.copy(form.context);

                //remove the context from the returned data to avoid circular reference
                delete form.context;

                //set the item form
                item.form = form.value;

                item.typeDesc = item.form.meta.formName;
                item.summary = FormHandler.getFormSummary(item.form);
                item.createdAt = UtilsService.tryParseDate(item.formCreatedAt);
                if(item.formStatus === 'draft'){
                  item.statusDesc = LocalizationService.getString('draft');
                }
                else{
                  item.statusDesc = LocalizationService.getString('completed');
                }
                results[preparedItems] = item;
                preparedItems++;

                if (callback && preparedItems === results.length){
                  callback(results, entity, err);
                }
              });
            });
          }
          else{//there is no result
            if (callback){
              callback([], entity, err);
            }
          }
        });
    }

    function getSearchableFormTypes(callback){
      var searchableFormTypes = [];
      FormService.getFormTemplates(null, function(templates, entity, err){
        angular.forEach(templates, function(template){
          if(template.value.meta.publicForm === true){
            searchableFormTypes.push(template);
          }
        });
        if(callback) callback(searchableFormTypes);
      });
    }

    /**
     * Get the default search query options
     */
    function getDefaultOptions(){
      return  {
          groupBy:CONSTANTS.formSearchableEntity+'.parentSlug',
          limit:20,
          innerJoin:{
            entity:CONSTANTS.formEntity,
            clause:{left:CONSTANTS.formEntity+'.slug', operator:'=', right:CONSTANTS.formSearchableEntity+'.parentslug'},
            selectFields:[
              {fieldName:"value",fieldAlias:"form"},
              {fieldName:"status",fieldAlias:"formStatus"},
              {fieldName:"createdAt",fieldAlias:"formCreatedAt"}
            ]
          },
          filters : []
        };
    }

    /**
     * Parse the search options, setting the defaults, if necessary
     * @param  {} options
     */
    function parseOptions(options){
       if(options){
        if(!options.groupBy){
          options.groupBy = CONSTANTS.formSearchableEntity+'.parentSlug';
        }
        if(!options.limit){
          options.limit = 20;
        }
        if(!options.filters){
          options.filters = [];
        }
        else if(!Array.isArray(options.filters)){
          options.filters = [options.filters];
        }
        if(!options.innerJoin){
          options.innerJoin = {
            entity:CONSTANTS.formEntity,
            clause:{left:CONSTANTS.formEntity+'.slug', operator:'=', right:CONSTANTS.formSearchableEntity+'.parentslug'},
            selectFields:[
              {fieldName:"value",fieldAlias:"form"},
              {fieldName:"status",fieldAlias:"formStatus"},
              {fieldName:"createdAt",fieldAlias:"formCreatedAt"}
            ]
          };
        }
      }
      else{
        options = getDefaultOptions();
      }
      return options;
    }

    function getFormTemplate(templates, formTemplateSlug){
      var templateFound;
      angular.forEach(templates, function(template){
        if(template.slug === formTemplateSlug){
          templateFound = template;
        }
      });
      return templateFound;
    }

    return service;
  }

})();


