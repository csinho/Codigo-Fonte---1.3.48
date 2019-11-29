(function() {
'use strict';

  angular
    .module('app')
    .service('DynamicListComponent', DynamicListComponent);

  DynamicListComponent.$inject = ['GenericComponent','UtilsService','ComponentServiceFactory','FormService','$filter'];
  function DynamicListComponent(GenericComponent,UtilsService, ComponentServiceFactory,FormService,$filter) {
    var service = {
      populateFormData: populateFormData,
      restoreState: restoreState,
      getData: getData,
      populateFromExternalDataSource: populateFromExternalDataSource,
      setValidators:setValidators,
      add:add,
      remove:remove,
      updateIdMap:updateIdMap
    };

     /**
     *
     * Poulates the previous saved data in the component
     * @param  {} component
     * @param  {} formDataCollection
     */
    function populateFormData(component, formDataCollection) {
      component.elements = [];
      var matchingDataItems = $filter('filter')(formDataCollection, {slug: component.slug + '.'}, false);

      if(matchingDataItems.length > 0){
        //here we identify the amount of template instances
        //we do this by verifying how many items with the same slug we have on the data collection
        //for example: if we have 3 itens in the collection with the slug 'otherHealthConditions',
        //so we have three containers that represent instances of the template
        var instancesCount = countTemplateInstances(matchingDataItems);

        //he we start rebuilding the instaces based in the amount of the template instances
        for (var i = 0; i < instancesCount; i++) {
          //for each instance we add a new template
          //to the component elements array
          add(component);
          var targetInstance = component.elements[i];
          populateTemplateInstance(targetInstance, matchingDataItems,i);

          //for each template instance added we populate it,
          //based in its index.
          //As we save and repopulate the items in the same order
          //we just use the order as reference - 'i' is the instance order

        }
      }
    }

    /**
     * Populates a template instance based in the template index and the matching data items by slug
     * @param  {} targetInstance
     * @param  {} matchingDataItems
     * @param  {} instanceIndex
     */
    function populateTemplateInstance(targetInstance, matchingDataItems, instanceIndex){
      var instanceDataCollection = getTemplateInstanceData(matchingDataItems, instanceIndex);
      angular.forEach(targetInstance.elements, function (curr_element) {
        var curr_element_data = $filter('filter')(instanceDataCollection, {slug:'.' + curr_element.slug + '_index'}, false);
        var targetSlug = getElementSpecificSlug(curr_element_data[0]);
        var componentService = ComponentServiceFactory.get(curr_element.type);
        var dataToPopulate = angular.copy(curr_element_data[0]);

        //the populateFormData function only populate if the slugs of the data and compoennt matches. So we equal them
        dataToPopulate.slug = curr_element.slug;

        //populate the data of the component
        componentService.populateFormData(curr_element,[dataToPopulate]);
      });
    }

    /**
     * Gets the data of a template instance, considering its index
     * @param  {} formDataCollection
     * @param  {} instanceIndex
     */
    function getTemplateInstanceData(formDataCollection, instanceIndex){
      var dataBySlug = {};
      angular.forEach(formDataCollection, function (formData) {
        var targetSlug = getElementSpecificSlug(formData);
        if(dataBySlug[targetSlug] === undefined){
          dataBySlug[targetSlug] = [];
        }
        dataBySlug[targetSlug].push(formData);
      });

      var instanceData = [];
      for (var property in dataBySlug) {
        if (dataBySlug.hasOwnProperty(property)) {
          var data = dataBySlug[property];
          instanceData.push(data[instanceIndex]);
        }
      }
      return instanceData;
    }

    /**
     * Gets the element slug after the period separation and without the index
     * Example: if the slug is myParentslug.myslug_index0, the slug returned will be 'myslug'
     * @param  {} item
     */
    function getElementSpecificSlug(item){
      var targetSlug = false;
      if(item.slug){
        var fullSlug = item.slug;
        var slugParts = fullSlug.split('.');
        if(slugParts.length > 1){
          var childSlugParts =  slugParts[1].split('_index');
            if(childSlugParts.length > 0){
              targetSlug = childSlugParts[0];
            }
        }
      }

      return targetSlug;
    }

    /**
     * Get the dynamic list template instances count
     * @param  {} matchingItems
     */
    function countTemplateInstances(matchingItems){
       var instances = 0;
       var firstItem = matchingItems[0];
       var firstElementSlug = firstItem.slug.split('.')[1];
       var firstElementBaseSlug = firstElementSlug.split('_index')[0];

       angular.forEach(matchingItems, function (dataItem) {
        var elementSlug = dataItem.slug.split('.')[1];
        var elementBaseSlug = elementSlug.split('_index')[0];
        if(firstElementBaseSlug == elementBaseSlug){
          instances++;
        }
       });
       return instances;
    }

    /**
     * The toggle does not need a custom restores as its value is just boolean that as setd when populated
     * @param  {} component
     */
    function restoreState(component){
     //do nothing
    }

    /**
     * Gets the selected ooption data
     * @param  {} component
     */
    function getData(component){
      var items = [];

      function recur(form) {
        angular.forEach(form.elements, function (element) {
          //run inside component groups
          if (element.type === 'dynamicList' || element.type === 'container' || element.type === 'section') {
            recur(element);
          }
          else {//extract each data
            var componentService = ComponentServiceFactory.get(element.type);
            var dataCollection = componentService.getData(element);
            angular.forEach(dataCollection, function (dataItem) {
              //When saving, each data item has a slug composed by its parent slug plus a period "."
              //plus the template element slug plus a index
              dataItem.slug = component.slug + '.'+ element.slug + '_index'+ items.length;
            });
            items = items.concat(dataCollection);
          }
        });
      }
      recur(component);
      return items;
    }

    function getValidators(){
      return [];
    }

    /**
     * Populates the component options based in a external datasource.
     * This component uses the default strategy defined in the genreric component
     * @param  {} component
     */
    function populateFromExternalDataSource(component){
       return GenericComponent.populateFromExternalDataSource(component);
    }

     /**
     * Ads custom validation functions to the component
     * @param  {} component
     */
    function setValidators(component){
      component.validators = [];
    }

    /**
     * Updates the id map to reflect the collection after adding or removing items
     * @param  {} component
     */
    function updateIdMap(component){
      for(var i = 0; i < component.elements.length; i++){
        FormService.idMap[component.elements[i].slug] = component.elements[i];
      }
    }

    /**
     * Fix the template instace names to avoid duplication in the view
     * @param  {} component
     */
    function fixItemNames(component){
      for(var i = 0; i < component.elements.length; i++){
        component.elements[i].headerTitle = component.itemTitle + " #" + (i+1);
      }
    }

    /**
     * Add a component to the dynamic list elements collection based in the template defined
     * @param  {} component
     */
    function add(component){
      var newElement = angular.copy(component.elementsTemplate);
      var nextIndex = new Date().getTime(); // we can just use the timestamp!
      newElement.slug += '-' + nextIndex;
      component.elements.push(newElement);
      fixItemNames(component);
      updateIdMap(component);
    }

    function remove(component,index){
      //TODO: Remove the item from idMap
      // FormService.idMap[newElement.slug] = newElement;

      if(index >= 0)
      {
        component.elements.splice(index,1);
      }
      fixItemNames();
    }


    return service;
  }

})();

