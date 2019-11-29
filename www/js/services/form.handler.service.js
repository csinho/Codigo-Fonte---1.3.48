(function () {
  'use strict';

  angular
    .module('app')
    .service('FormHandler', FormHandler);

  FormHandler.$inject = ['$filter', 'UtilsService', 'LocalizationService','Persistence','$q','ComponentServiceFactory'];

  function FormHandler($filter, UtilsService, LocalizationService,Persistence,$q,ComponentServiceFactory) {
    var service = {
      getFormSummary: getFormSummary,
      extractFormSummary: extractFormSummary,
      prepareForSummary:prepareForSummary,
      extractFormMetas: extractFormMetas,
      extractFormData: extractFormData,
      extractFormSearchables: extractFormSearchables,
      appendItemToForm: appendItemToForm,
      removeItemAppendToForm:removeItemAppendToForm,
      populateFormData: populateFormData,
      getComponent: getComponent,
      restoreState:restoreState,
      populateFromExternalDataSource: populateFromExternalDataSource
    };


    /**
     * Gets the form summary items
     * Gets the form summary
     * @param  {} form
     */
    function getFormSummary(form) {
      var summary = { icon: null, title: null, subtitle: null, isValid: false };
      if (form.meta && form.meta.summary) {
        summary.isValid = true;

        if (form.meta.summary.icon) summary.icon = form.meta.summary.icon;

        if (form.meta.summary.title) {
          var titleComponent = getComponent(form, form.meta.summary.title);
          summary.title = {
            value: formatContent(titleComponent.dataValue, titleComponent.dataType),
            label: titleComponent.label
          };
        }
        if (form.meta.summary.subtitle) {
          var subtitleComponent = getComponent(form, form.meta.summary.subtitle);
          summary.subtitle = {
            value: formatContent(subtitleComponent.dataValue, subtitleComponent.dataType),
            label: subtitleComponent.label
          };
        }
      }

      /**
       * Formats the summary content
       * @param  {} content
       * @param  {} dataType
       */
      function formatContent(content,dataType) {
        var dateFormat = LocalizationService.getDateTimeFormat();
        var monthFormat = LocalizationService.getYearMonthFormat();
        if (content instanceof Date) {
          content = $filter('date')(content, dateFormat);
        }
        else if(dataType == 'date') {
          var date = UtilsService.tryParseDate(content);
          if (date !== false) {
            content = $filter('date')(date, dateFormat);
          }
        }
        else if(dataType == 'month') {
          var monthDate = UtilsService.tryParseDate(content);
          if (monthDate !== false) {
            content = $filter('date')(monthDate, monthFormat);
          }
        }
        return content;
      }

      return summary;
    }

    /**
    * Extract the form meta data and returns and array of items containing each one a meta
    * @param  {} form
    * @returns []
    */
    function extractFormSummary(form,savedFormSlug) {
      var summaries = [];
      if (form.meta && form.meta.summary) {
        for (var property in form.meta.summary) {
          if (form.meta.summary.hasOwnProperty(property)) {
             var metaSlugName = form.meta.summary[property];
             var summaryElement = getComponent(form, metaSlugName);
             if(summaryElement !== null && summaryElement !== undefined){
              var formInfo = {'formVersion':form.meta.formVersion, 'formType':form.meta.formType, 'savedFormSlug':savedFormSlug};
              var items = getItemsFromObject(summaryElement,formInfo);
              summaries = summaries.concat(items);
             }

          }
        }
      }
      return summaries;
    }


    /**
     * Prepare a form item to a format the the summary understands
     * @param {} target - The target object to be prepared
     */
    function prepareForSummary(target){
      target.form = target.value;
      target.value = null;
      target.desc = null;
      target.typeDesc = target.form.meta.formName;
      target.summary = getFormSummary(target.form);
    }


    /**
     * Extract the form meta data and returns and array of items containing each one a meta
     * @param  {} form
     * @param  string savedFormSlug
     * @returns []
     */
    function extractFormMetas(form, savedFormSlug, metaValueAsString) {
      var metas = [];
      var formVersion = form.meta.formVersion;
      for (var property in form.meta) {
        if (form.meta.hasOwnProperty(property)) {
          var metaValue = form.meta[property];
          if (metaValueAsString === true) {
            metaValue = JSON.stringify(metaValue);
          }
          metas.push({
            "slug": property,
            'type': form.meta.formType,
            "value": metaValue,
            "desc": property,
            "parentSlug": savedFormSlug,
            "parentEntity": CONSTANTS.formEntity,
            "dataType": 'text',
            "formVersion": formVersion
          });
        }
      }
      return metas;
    }

    /**
    * Extracts the fields that have data from the form three object
    * @param  {} form
    * @param  string savedFormSlug
    * @param  {} options
    */
    function extractFormData(form, savedFormSlug, options) {
      if(!options) options = {};
      if(!options.onlySearchable) options.onlySearchable = false;
      var formData = [];
      var formType = null;
      var formVersion = form.meta.formVersion;
      if (form.meta) formType = form.meta.formType;
      //recursive function to extract all form(json) data
      function recur(form, formType) {
        angular.forEach(form.elements, function (element) {
          var formInfo = {'formVersion':formVersion, 'formType':formType, 'savedFormSlug':savedFormSlug};
          //run inside component groups
          if (element.type === 'container' || element.type === 'section') {
            recur(element, formType);
          }
          else {//extract each data
            if ((options.onlySearchable === true && element.searchable === true && element.dataValue) || !options.onlySearchable) {
              var items = getItemsFromObject(element,formInfo);
              formData = formData.concat(items);
            }
          }
        });
      }

      recur(form, formType);

      var appendedData = extractFormAppendedData(form, options, savedFormSlug);
      formData = formData.concat(appendedData);

      return formData;
    }


    /**
     * Extracts form appended data
     * @param  {} form
     * @param  {} options
     * @param  {} savedFormSlug
     */
    function extractFormAppendedData(form, options, savedFormSlug){
       //gets the form appended data
      var appendedData = [];
      angular.forEach(form.appendedData, function (item) {
        var isObject  = item.dataValue && typeof (item.dataValue) === 'object';
        //in case we are looking for searchable data, we extract only literal fields (not objects neither booleans)
        if (!options.onlySearchable || (item.searchable === true && !isObject && item.dataType !== 'boolean')) {
          //if we are not looking for searchable
          //field and is a object we stringify the object
          if(isObject){
            item.value = JSON.stringify(item.value);
          }
          parseAppendedItem(item, savedFormSlug);

          var formType = form.meta.formType;
          var formVersion = form.meta.formVersion;
          var formInfo = {'formVersion':formVersion, 'formType':formType, 'savedFormSlug':savedFormSlug};

          //thinking generally an object can contains several items (like a multiselect)
          //but in the case of appended data we are sure that there will be only one (if available)
          var items = getItemsFromObject(item,formInfo);
          if(items.length > 0){
            var itemAppended  = items[0];
            appendedData.push(itemAppended);
          }
        }
      });
      return appendedData;
    }



    /**
     * Get items (to be used in the sync upload) from diferent objects  like a form element, an appended
     * form item or even from a element with multiple options selected
     * @param  {} element
     * @param  {} formInfo
     */
    function getItemsFromObject(element,formInfo){
      var items = [];

      //we get the component service using a factory, based in the component type
      //each component can have its own strategy to extract its data
      //if a component does not have a specialized service, a generic component
      // service will be retured and ca be used
      var componentService = ComponentServiceFactory.get(element.type);
      var dataCollection = componentService.getData(element);

      angular.forEach(dataCollection, function (item) {
        var dataItem = getDataItem(element, formInfo, item);
        items.push(dataItem);
      });

      return items;
    }


    /**
     * Builds a data item object from a given element
     * (can be an appendedData, a component or a component option) and its value(s)
     * @param  {} element
     * @param  {} formInfo
     * @param  {} valueObj
     */
    function getDataItem(element, formInfo, valueObj){
      var dataType = valueObj.dataType? valueObj.dataType : getItemDataType(element,valueObj.value);
      adjustItemValue(valueObj, dataType);
      return  {
        "slug": valueObj.slug? valueObj.slug :element.slug,
        "desc": valueObj.desc? valueObj.desc: element.label,
        "value": valueObj.value,
        "valueDesc":valueObj.valueDesc? valueObj.valueDesc :valueObj.value,
        "parentEntity": CONSTANTS.formEntity,
        "parentSlug": formInfo.savedFormSlug,
        "type": formInfo.formType,
        "dataType": dataType,
        "formVersion": formInfo.formVersion,
        "targetReferenceCreatedAt":element.targetReferenceCreatedAt
      };
    }

    /**
     * Gets the item value dataType
     * @param  {} element
     * @param  {} itemValue
     */
    function getItemDataType(element, itemValue){
       var dataType = element.dataType;
       if(dataType === null || dataType === undefined){
         dataType = typeof (itemValue);
       }
       if(itemValue === 'true' || itemValue === 'false'){
         dataType = 'boolean';
       }
       return dataType;
    }


    /**
     * Adjusts item value and valueDesc according the dataType
     * @param  {} valueObj
     * @param  {} dataType
     */
    function adjustItemValue(valueObj, dataType){
       if (dataType === 'object') {
          valueObj.value = JSON.stringify(valueObj.value);
          dataType = 'json';
       }
       if(typeof (valueObj.desc) === 'boolean'){
        valueObj.desc  = valueObj.desc? LocalizationService.getString('yes'):LocalizationService.getString('no');
       }
    }

    /**
     * Extracts the fields that are searchables from the form three object
     * @param  {} form
     * @param  string savedFormSlug
     * @param  string formType
     */
    function extractFormSearchables(form, savedFormSlug) {
      return extractFormData(form, savedFormSlug,{'onlySearchable':true});
    }

    /**
     * Appends data to form appendedData section. It does not save the form in db
     * @param  {} item
     * @param  {}|string formOrFormSlug
     * @param  {} callback
     */
    function appendItemToForm(itemToAppend, formOrFormSlug, callback) {
      if(validateAppendParameters(itemToAppend, formOrFormSlug)) {
        if (typeof (formOrFormSlug) === 'string') {
          var formSlug = formOrFormSlug;
          getFormItem(formSlug, function (formItem) {
            addItemToFormAppendedData(formItem.value, itemToAppend);
            var form = formItem.value;
            if (callback) callback(form);
          });
        }
        else if (typeof (formOrFormSlug) === 'object') {
          var form = formOrFormSlug;
          addItemToFormAppendedData(form, itemToAppend);
          if (callback) callback(form);
        }
      }
      else{
        if (callback) callback(false);
      }
    }



    /**
     * Remove an item from the appended item form section
     * @param  {} itemSlug
     * @param  {} formOrFormSlug
     * @param  {} callback
     */
    function removeItemAppendToForm(itemSlug, formOrFormSlug, callback) {
        if (typeof (formOrFormSlug) === 'string') {
          var formSlug = formOrFormSlug;
          getFormItem(formSlug, function (formItem) {
            var form = formItem.value;
            removeItem(form, itemSlug);
            if (callback) callback(form);
          });
        }
        else if (typeof (formOrFormSlug) === 'object') {
          var form = formOrFormSlug;
          removeItem(form, itemSlug);
          if (callback) callback(form);
        }

        function removeItem(form, ititemSlugem){
          if(form.appendedData && form.appendedData.length > 0){
            for (var index = 0; index < form.appendedData.length; index++) {
              var element = form.appendedData[index];
              if(element.slug === itemSlug){
                form.appendedData.splice(index,1);
              }
            }
          }
        }
    }

     /**
     * Gets the form item from db
     *  @param  string formSlug
     * @param  function callback
     */
    function getFormItem(formSlug, callback) {
      var filters = [];
        filters.push({ leftOperand: "slug", operator: "=", rightOperand: formSlug });

        var options = { "filters": filters };
        //TODO: corect this to use the constant formEntity instead of string 'form' present in formService
        Persistence.findItems(CONSTANTS.formEntity, options, function (results, entity, err) {
          var form = {};
          if (results.length > 0) {
            form = results[0]/*.value*/;
          } else {
            err = {
              error: 'no_form_found'
            };
          }
          if (callback) callback(form, entity, err);
        });
    }

    /**
     * Add item to the form appended data array
     * @param  {} form
     * @param  {} itemToAppend
     */
    function addItemToFormAppendedData(form, itemToAppend) {
      //we accepte item from db and items from elements.
      //here we make some ajustments
      if (!itemToAppend.label) itemToAppend.label = itemToAppend.desc;
      if (!itemToAppend.dataValue) itemToAppend.dataValue = itemToAppend.value;
      if (!itemToAppend.value) itemToAppend.value = itemToAppend.dataValue;
      if (!form.appendedData) form.appendedData = [];
      form.appendedData.push(itemToAppend);
    }

    /**
     * Validates the appendItemToForm function parameters
     * @param  {} itemToAppend
     * @param  {} formOrFormSlug
     */
    function validateAppendParameters(itemToAppend, formOrFormSlug){
       var validParameters = true;
      if (!formOrFormSlug) {
        console.error('appendItemToForm error:formOrFormSlug parameter must be provided');
        validParameters = false;
      }
      if (!itemToAppend.slug) {
        console.error('appendItemToForm error:itemToAppend.slug must be setted');
        validParameters = false;
      }
      return validParameters;
    }

    /**
     * Makes adjustments in the item about to be appended to a form
     * @param  {} item
     * @param  {} parentslug
     */
    function parseAppendedItem(item, parentslug) {
      if (!item.parentSlug) item.parentSlug = parentslug;
      if (!item.dataType) item.dataType = UtilsService.getType(item.value);
      if (!item.desc) item.desc = item.label;
      // if (item.slug) item.slug = null;
    }

    /**
     * Set the data from a formData list to a form object
     * populates the formTemplate with formData
     * @param  {} formTempalte
     * @param  [] formData
     */
    function populateFormData(formTemplate, formData) {
      var form = angular.copy(formTemplate);
      var rootForm = form;
      if(!rootForm.appendedData) rootForm.appendedData = [];

      function recur(form) {
        angular.forEach(form.elements, function (element) {
          if (element.type === 'container' || element.type === 'section') {
            recur(element);
          }
          else {
            var matchingItems = [];
            if(element.type === 'dynamicList'){
              matchingItems = $filter('filter')(formData, {slug: element.slug + '.'}, false);
            }
            else{
              matchingItems = $filter('filter')(formData, {slug: element.slug}, true);
            }

            if (matchingItems.length > 0) {
              var item = matchingItems[0];

              //we just try to populate data if the formData item has a value
              if(item.value !== undefined && item.value !== null)
              {
                //we get the component service using a factory, based in the component type
                //each component can have its own strategy to populate form data
                //if a component does not have a specialized service, a generic component
                // service will be retured and ca be used
                var componentService = ComponentServiceFactory.get(element.type);
                componentService.populateFormData(element, formData);
              }
            }
            else{//here we try to handle elements that generate items with a base slug plus a sufix, like geolocalization => {geolocalization_lat, geolocalization_long}
              var componentServiceWithDerivedSlug = ComponentServiceFactory.get(element.type);
              componentServiceWithDerivedSlug.populateFormData(element, formData);
            }
          }
        });
      }
      recur(form);
      return form;
    }


    /**
     * Parses the data value according the dataType
     * @param  {} element
     * @param  {} item
     */
    function parseDataValue(element, item){
      try {
        var JSONObj = JSON.parse.options =(item.value);
        if (JSONObj) item.value = JSONObj;
      }
      catch (e) { /*silence is gold*/ }

      if(item.value){
        switch (element.dataType) {
          case 'text':
            item.value = item.value.toString();
            break;
          case 'date':
            item.value = UtilsService.tryParseDate(item.value);
            break;
          case 'month':
            item.value = UtilsService.tryParseDate(item.value);
            break;
          default:
            break;
        }
      }
    }

    /**
     * Rebuilds selected option(s) from a multi-option element
     * @param  {} element
     */
    function restoreState(element){
      //we get the component service using a factory, based in the component type
      //each component can have its own strategy to restore its state
      //if a component does not have a specialized service, a generic component
      // service will be retured and ca be used
      var componentService = ComponentServiceFactory.get(element.type);
      componentService.restoreState(element);
    }

     /**
     * Populate data from external source
     * @param  {} element
     * @returns promise
     */
    function populateFromExternalDataSource(element){
      if(element.contentType ===  undefined || element.contentType ===  null){
        element.contentType = element.slug;
      }
      //we get the component service using a factory, based in the component type
      //each component can have its own strategy to populate data from external source
      //if a component does not have a specialized service, a generic component
      // service will be retured and ca be used
      var componentService = ComponentServiceFactory.get(element.type);
      return componentService.populateFromExternalDataSource(element);
    }

    /**
     * Given a form, searches for the first component with the specified slug
     * and return it. Return null if the component wasn't found
     * @param  {} form object to search in
     * @param  string slug of the element to be found
     */
    function getComponent(form, slug) {
      var component = null;
      if (form) {
        UtilsService.recurComponent(form, function (element) {
          if (element.slug && element.slug === slug) {
            component = element;
            return true;
          }
          return false;
        });
      }

      return component;
    }
    return service;

  }
})();
