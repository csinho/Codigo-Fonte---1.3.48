(function () {

  'use strict';

  angular
    .module('app')
    .factory('FormService', FormService);

  FormService.$inject = ['$q', 'Persistence', '$filter', 'DependencyService', 'UtilsService', 'GlobalService', 'LocalizationService', 'FormHandler','FluxService'];

  function FormService($q, Persistence, $filter, DependencyService, UtilsService, GlobalService, LocalizationService, FormHandler,FluxService) {
    //TODO: We can replace this for the dbitem
    var currentFormTemplate = {
        form: null,
        formSlug: null,
        formType: null,
        parentSlug: null
    };

    var service = {
      idMap: {},
      validationMap: {},
      currentForm: angular.copy(currentFormTemplate),
      goToForm: goToForm,
      reset: reset,
      getEntitiesName:getEntitiesName,
      getFormItem: getFormItem,
      findRootForm: findRootForm,
      getChildrenFormItems: getChildrenFormItems,
      updateForm: updateForm,
      getFormTemplates: getFormTemplates,
      setSubmitted: setSubmitted,
      buildChildren: buildChildren,
      getNextSibling: getNextSibling,
      saveForm: saveForm,
      setCurrentForm: setCurrentForm,
      saveCurrentForm: saveCurrentForm,
      getSyncableFormSets: getSyncableFormSets,
      findForms: findForms,
      findMetas: findMetas,
      getSavedForm:getSavedForm
    };

    // local const
    var formEntity = CONSTANTS.formEntity;
    var formSearchableEntity = CONSTANTS.formSearchableEntity;
    var formDataEntity = CONSTANTS.formDataEntity;
    var metaEntity = CONSTANTS.metaEntity;

    service.idMap.defaultVisibility = {
      dataValue: true
    };
    service.idMap.defaultRequirement = {
      dataValue: false
    };

    /**
     * Removes the references in idMap and validation map
     */
    function reset() {
      service.idMap = {};
      service.validationMap = {};
      service.currentForm = angular.copy(currentFormTemplate);
      service.resetForm = true;
    }

    function getEntitiesName(){
      return {
        formEntity:formEntity,
        formSearchableEntity:formSearchableEntity,
        formDataEntity:formDataEntity,
        metaEntity:metaEntity
      };
    }


    /**
     * Goes to a specified  (in dataParam) form
     * @param  {} dataParams
     * @param  boolean keepHistory
     * @param  boolean clearCache
     */
    function goToForm(dataParams, keepHistory, clearCache) {
      if(clearCache){
        service.reset();
      }
      FluxService.goToForm(dataParams,keepHistory,clearCache);
    }


    /**
     * @param  string formType
     * @param  string formSlug
     * @param  function callback
     */
    function getFormItem(formType, formSlug, callback) {
      if(formSlug){//a saved form
        getSavedForm(formSlug).then(
          function(savedform){
            if (callback) callback(savedform, formEntity, err);
          },
          function(resson){
            if (callback) callback({}, formEntity, resson);
          }
        );
      }
      else if(!formSlug && formType){//new form
        getFormTemplateItem(formType, function (formTemplateItem, entity, err) {
          if (callback) callback(formTemplateItem, entity, err);
        });
      }
      else {
        if (callback) {
          var err = 'invalid_parameters';
          callback(null, null, err);
        }
      }
    }

    /**
     * Gets the a formItem saved from db.
     * As this function is async the context param may be used to return context data that will be used in a iteration
     * @param  {} formSlug
     * @param  {} context
     */
    function getSavedForm(formSlug, context){
      var deferred = $q.defer();
      var options = { "filters": [{ leftOperand: "slug", operator: "=", rightOperand: formSlug }] };
      Persistence.findItems(formEntity, options, function (results, entity, err) {
          if (results.length > 0) {
            var savedForm = results[0];
            getFormTemplateItem(savedForm.type, function (formTemplateItem, entity, err) {
              getFormData(savedForm.slug, formDataEntity, function(formData){
                savedForm.value = FormHandler.populateFormData(formTemplateItem.value, formData);
                savedForm.context = context;
                deferred.resolve(savedForm);
              });
            });
          }
          else{
            deferred.reject('form_not_found');
          }
      });
      return deferred.promise;
    }

    /**
     * Given a slug we find the root form recursively.
     * @param slug - The reference slug
     * @return [promise] (formItem) - The form item of the root form
     */
    function findRootForm(slug){
      var deferred = $q.defer();
      var lastItem = null;

      function recur(slug){
        // We cannnot just ask if exists (count) as we should get the parent also
        getFormItem(null, slug, function (formItem){
          if(!Object.keys(formItem).length){
            deferred.resolve(lastItem);
          }
          else if(!formItem.parentSlug){ // Base case
            deferred.resolve(formItem);
          }
          else {
            lastItem = formItem;
            recur(formItem.parentSlug)
          }
        });
      }

      recur(slug);
      return deferred.promise;
    }


    /**
     * Given a slug, retrieve all the immediate children of this form.
     * In other words, returns all forms that have *slug* as *parentSlug*
     * @param string slug - Slug of the reference form
     * @return [promise] (items) - A list of formItems
     */
    function getChildrenFormItems(slug, additionalOptions){
      var deferred = $q.defer();

      var options = {filters : [{"leftOperand":"parentSlug","operator":"=","rightOperand":slug}]};
      if(additionalOptions){
        angular.extend(options, additionalOptions);
      }
      // We look at the db to find the children
      findForms(options, function(items){
        deferred.resolve(items);
      });

      return deferred.promise;
    }

    /**
     * @param  {} options
     * @param  function callback
     */
    function findMetas(options, callback) {
      Persistence.findItems(metaEntity, options, function (results, entity, err) {
        if (callback) callback(results, entity, err);
      });
    }

    /**
     * @param  {} options
     * @param  function callback
     */
    function getMetas(savedFormSlug, entity, callback) {
      var options = {"filters": [{leftOperand: "parentSlug",operator: "=",rightOperand: savedFormSlug}]};
      Persistence.findItems(metaEntity, options, function (results, entity, err) {
        if (callback) callback(results, entity, err);
      });
    }

    /**
     * @param  string savedFormSlug
     * @param  {} entity
     * @param  function callback
     */
    function getFormData(savedFormSlug, entity, callback) {
      var options = {"filters": [{leftOperand: "parentSlug",operator: "=",rightOperand: savedFormSlug}]};
      Persistence.findItems(formDataEntity, options, function (results, entity, err) {
        if (callback) callback(results, entity, err);
      });
    }

    /**
     * @param  string savedFormSlug
     * @param  function callback
     */
    function getFormType(savedFormSlug, callback) {
      var formType = null;
      var options = {"filters": [{leftOperand: "slug",operator: "=",rightOperand: savedFormSlug}]};
      Persistence.findItems(CONSTANTS.formEntity, options, function (results, entity, err) {
        if (!err && results.length > 0) {
          formType = results[0].value.type;
        }
        if (callback) callback(formType);
      });
    }

    function findForms(options, callback) {
      Persistence.findItems(formEntity, options, function (results, entity, err) {
        if (callback) callback(results, entity, err);
      });
    }

    /**
     * @param  string formType
     * @param  function callback
     */
    function getFormTemplateItem(formType, callback) {
      var filters = [];
      var formTemplateItem = {};
      filters.push({leftOperand: "type",operator: "=",rightOperand: formType});
      var options = {"filters": filters};
      Persistence.findItems(CONSTANTS.formTemplateEntity, options, function (results, entity, err) {
        if (!err && results.length > 0) {
          formTemplateItem = results[0];
          delete formTemplateItem.status;
        }
        if (callback) callback(formTemplateItem, entity, err);
      });
    }

    /**
     * @param  string formType
     * @param  function callback
     */
    function getFormTemplates(formType, callback) {
      if (GlobalService.formTemplates.length > 0) {
        if (callback) callback(GlobalService.formTemplates, CONSTANTS.formTemplateEntity);
      }
      else {
        var options = {};
        if (formType) { //an specific form type
          var filters = [];
          filters.push({leftOperand: "type",operator: "=",rightOperand: formType});
          options = {filters: filter,distinct: true,groupBy: 'type'};
        }
        Persistence.findItems(CONSTANTS.formTemplateEntity, options, function (results, entity, err) {
          GlobalService.formTemplates = results;
          if (callback) callback(results, entity, err);
        });
      }

    }

    /**
     * @param  {} form
     * @param  string typeSlug
     * @param  string formSlug
     */
    function setCurrentForm(form, typeSlug, formSlug, parentSlug, status) {
      service.currentForm.form = form;
      service.currentForm.formType = typeSlug;
      service.currentForm.formSlug = formSlug;
      service.currentForm.parentSlug = parentSlug;
      service.currentForm.status = status;

      service.idMap = {};
      UtilsService.recurComponent(form, function (element) {
        if (element && element.slug) {
          service.idMap[element.slug] = element;
          return false;
        }
      });
    }

    /**
     * Saves the current form
     * @param  string form to be saved status
     */
    function saveCurrentForm() {
      var status = service.currentForm.status;
      var savePromise = saveForm(
        service.currentForm.form,
        service.currentForm.formType,
        service.currentForm.formSlug,
        status,
        service.currentForm.parentSlug
      );

      return savePromise.then(function (response) {
        FluxService.setCurrentViewStateParam('formSlug',response.formSlug);
        service.currentForm.formSlug = response.formSlug;
        return response;
      });
    }


    /**
     * Updates a form
     * @param  {} form
     * @param  {} setAsCurrent
     */
    function updateForm(form, autoGeneratedFormSlug) {
      var deferred = $q.defer();
      if(autoGeneratedFormSlug === form.meta.formType){
        deferred.resolve(form);
        console.warn('the form seems to be a template!');
      }
      else{
        getFormItem(null, autoGeneratedFormSlug, function(formItem){
          saveForm(
            form,
            form.meta.formType,
            autoGeneratedFormSlug,
            formItem.status,
            formItem.parentSlug,
            false
          ).then(
            function(){//success
              deferred.resolve(true);
            },
            function(){//error
              deferred.reject(false);
            }
          );
        });
      }
     return deferred.promise;
    }

    /**
     * @param  {} form
     * @param  string typeSlug
     * @param  string formSlug
     */
    function saveForm(form, typeSlug, formSlug, status, parentSlug, doNotSetAsCurrent) {
      var deferred = $q.defer();
      if (!status) status = 'draft';

      var doSaveForm = function(form, typeSlug, formSlug, status, parentSlug){
        Persistence.insertItem(formEntity, {
          value: form,
          type: typeSlug,
          status: status,
          slug: formSlug,      // We pass this to save under the same slug
          parentSlug: parentSlug,
          desc: form.meta.formName,
          dataType: 'json'
        }, function (insertedItem) {
          //Better to return insertedItem, then, right?
          var result = {
            formSlug: insertedItem.slug,
            parentSlug: insertedItem.parentSlug,
            formInsertedId: insertedItem.id,
            formItem:insertedItem
          };

          //Capture the metas of the component
          var formData = FormHandler.extractFormData(form, result.formSlug);

          // Insert the metadata in the db as well. Only then we can resolve our promise
          Persistence.insertItems(formDataEntity, formData, function () {
            // After we insert the metadata we can calculate and insert the searchables as well
            var formSearchables = FormHandler.extractFormSearchables(form, result.formSlug);
            Persistence.insertItems(formSearchableEntity, formSearchables, function () {
              // Im some cases we update the info of the current form
              //TODO: REFACTOR THIS TO SET CURRENT OUTSITE THE saveForm
              if (!doNotSetAsCurrent) {
                setCurrentForm(form, typeSlug, result.formSlug, result.parentSlug, status);
              }
              // We can resolve our promise
              deferred.resolve(result);
            });
          });
        });
      };

      var oldSlug = angular.copy(formSlug);

      // Remove old form version, if any
      if (oldSlug) {
        removePreviousVersion(oldSlug).then(
          // Then on the success we can actually save the form under the same id
          function success() {
            doSaveForm(form, typeSlug, formSlug, status, parentSlug);
          }
        );
        deferred.notify(LocalizationService.getString('deletingOldFormVersion'));
      }
      else {
        doSaveForm(form, typeSlug, formSlug, status, parentSlug);
      }

      return deferred.promise;
    }




    /**
     * Deletes the previous version of the form in database
     * @param  string oldSlug
     */
    function removePreviousVersion(oldSlug) {
      // We need a defered for each callback (since we were not use promises
      // at the time). The callback will resolve each promise.
      var qA = $q.defer();
      var qB = $q.defer();
      var qC = $q.defer();
      var qD = $q.defer();

      var options = {"filters": [{leftOperand: "slug",operator: "=",rightOperand: oldSlug}]};
      Persistence.removeItems(formEntity, options, function () { qA.resolve(); });

      // We remove the form metas, searchables and data
      options = {"filters": [{leftOperand: "parentSlug",operator: "=",rightOperand: oldSlug}]};
      Persistence.removeItems(formSearchableEntity, options, function () { qB.resolve(); });
      Persistence.removeItems(metaEntity, options, function () { qC.resolve(); });
      Persistence.removeItems(formDataEntity, options, function () { qD.resolve(); });

      // We return a promise for all subpromises
      return $q.all(qA, qB, qC, qD);
    }


    /**
     * Sets all children ng-forms submitted (no such default functionality)
     * @param  {} form
     * @param  {} model
     */
    function setSubmitted(form, model) {
      if (model) {
        model.$submitted = true;
      }
      form.$setSubmitted();
      angular.forEach(form, function (item) {
        if (item && item.$$parentForm === form && item.$setSubmitted) {
          setSubmitted(item);
        }
      });
    }

    /**
     * builds the children elements of and element
     * @param  {} elements
     */
    function buildChildren(elements) {
      var html = '';

      for (var j = 0; j < elements.length; j++) {
        var element = elements[j];
        element.bindtRefStr = 'component.elements[' + j + ']';

        // Configure the information on the idMap
        if (element.slug) service.idMap[element.slug] = element;

        // Configure dependency and requirement relations
        DependencyService.defineDependencyObject(element);
        DependencyService.defineRequirementObject(element);

        // Configure external sources of each element
        if (element.optionsExternalSource) {
          //if the item external datasource content type
          //is not setted the slug is the content type
          FormHandler.populateFromExternalDataSource(element).then(FormHandler.restoreState);
        }
        else {
          // We should restore state here too, but we don't need to wait a promise
          FormHandler.restoreState(element);
        }

        var template = formManager.getTemplate(element.type, element);
        html += template;
      }
      return html;
    }

    /**
     * Get the next sibling in the hierarchy of the object.
     * This is used to improve navigation between pages.
     * @param  {} current
     * @param  {} parent
     */
    function getNextSibling(current, parent) {
      if (parent) {
        for (var i = 0; i < parent.elements.length - 1; i++) {
          if (parent.elements[i] === current) {
            return parent.elements[i + 1];
          }
        }
      }
      return null;
    }

    /**
     * Gets the forms that are candidates to be synchronized,
     * based in the date of the last sync and the forms saved after that
     * @param  {} params
     * @param  {} callback
     */
    function getSyncableFormSets(params, callback) {
      var options = {"filters": params.filters,"limit": params.itemPerUpload,"offset": params.offset};
      options.filters.push({ leftOperand: "status", operator: "<>", rightOperand: 'draft' });

      options.join = {
        entity:CONSTANTS.formEntity,
        type:'left join',
        entityAlias:'parentForm',
        clause:{left:'parentForm.slug', operator:'=', right:CONSTANTS.formEntity +'.parentslug'},
        selectFields:[{fieldName:"createdAt",fieldAlias:"parentCreatedAt"}]
      };

      Persistence.findItems(CONSTANTS.formEntity, options, function (results, entity, errors) {
        var formsSync = [];
        if (results.length > 0) {
          var toBeSent = results.length;
          angular.forEach(results, function (item) {
            var itemForm = angular.copy(item);

            // As we are in a loop and  the function below is async,
            // we pass the current itemForm as context
            // and when the async callback occours for each item,
            // we know in which item we must populate the returned data
            getSavedForm(itemForm.slug,itemForm).then(function(savedform){//success

                //restore the item from the callback data context
                var currentItemForm = angular.copy(savedform.context);

                //remove the context from the returned data to avoid circular reference
                delete savedform.context;

                //avoid circular reference
                currentItemForm.value = angular.copy(savedform.value);
                var formSet = {
                  formMetas: FormHandler.extractFormMetas(currentItemForm.value, currentItemForm.slug, true),
                  formSummaryDatas:FormHandler.extractFormSummary(currentItemForm.value,currentItemForm.slug),
                  formData: FormHandler.extractFormData(currentItemForm.value, currentItemForm.slug),
                  formSearchables: FormHandler.extractFormSearchables(currentItemForm.value, currentItemForm.slug)
                };

                //id is local property and must not be exported because
                //the remote database generates its own id.
                //The identifier used is the slug
                currentItemForm.id = null;

                var tryedDate =  UtilsService.tryParseDate(currentItemForm.parentCreatedAt);
                currentItemForm.parentCreatedAt = tryedDate !== false? tryedDate : null;
                //set form additional ttributes to export
                currentItemForm.dataType = 'json';
                currentItemForm.formVersion = currentItemForm.value.meta.formVersion;

                // As the formData, formMeta and formSearchable is sent and received separetedly
                // it is not necessary any more to send the form json itself
                currentItemForm.value = null;//JSON.stringify(currentItemForm.value);

                //the form will only be sent if it has formData
                if(formSet.formData && formSet.formData.length> 0){
                  formSet.form = currentItemForm;
                  formsSync.push(formSet);
                }
                else{//if it does not have formData, we decrement the amount of items expected to be sent
                  toBeSent--;
                }

                //if we are retriving more than one, we must callback
                //only if we have accquired all forms
                if(toBeSent === formsSync.length){
                   if (callback) callback(formsSync, errors);
                }
              }
            );
          });

        }
        else {
          if (callback) callback([], errors);
        }

      });
    }

    return service;
  }

})();
