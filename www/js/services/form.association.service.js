(function () {

  'use strict';

  angular.module('app').factory('FormAssociationService', FormAssociationService);

  FormAssociationService.$inject = ['$q', '$state', '$stateParams', '$ionicHistory',
                                    '$filter','ToastService','LocalizationService', 'FormService', 'Persistence'];

 function FormAssociationService($q, $state, $stateParams, $ionicHistory,
     $filter, ToastService, LocalizationService, FormService, Persistence) {
    var service = {
      // State:
      lastAssociation: null,
      addReference: addReference,
      prepareAssociation: prepareAssociation,
      consolidateAssociation: consolidateAssociation,
      triggerAssociationAction: triggerAssociationAction,
      registerNew : registerNew,
      updateReferences : updateReferences,
      disassociate : disassociate,
      updateFormParent: updateFormParent
    };

    var deferred;

	  /**
	   * We start the action of opening a new window and
	   * returning the info to the previous page
	   */
    function triggerAssociationAction(params) {
      deferred = $q.defer();
      $state.go('app.associationPage', { 'paramsObject': params });
      return deferred.promise;
    }

	  /**
	   * We make a reference component based on the info passed to us
	   */
    function addReference(component, value) {
      var newElement = {type: "itemReference",dataValue: value};

      // Verifies if the form to be added as associated is not already associated
      if (component.elements.length > 0) {
        var matchingItem = $filter('filter')(component.elements, { dataValue: value }, true);
        if (matchingItem.length === 0) {
          component.elements.push(newElement);
        }
        else{
          ToastService.show(LocalizationService.getString('itemAlreadyAssociated'));
        }
      }
      else {
        component.elements.push(newElement);
      }
    }


	  /**
	   * On the association page we prepare an association.
	   * It was made this was to maintain the flow and allow the user
	   * to just go back to the previous page.
	   */
    function prepareAssociation(result) {
      service.lastAssociation = result;
    }

	  /**
	   * When returning of an association page, we check for pending
	   * associations, and then we consolidate it
	   */
    function consolidateAssociation() {
      // If a association was made, we're ready to consume it
      if (service.lastAssociation) {
        deferred.resolve(service.lastAssociation);
        service.lastAssociation = null;
      }
    }


    /**
     * Redirects to the target page, constructing the 'associationFrom' object
     */
    function redirect(component){
      //$ionicHistory.nextViewOptions({historyRoot: true});

      var params = {
          //'formSlug' : null,
          'formType' : component.associationTargetType,
          'associationFrom' : {
              formInfo : angular.copy(FormService.currentForm),
              stateParams : angular.copy($stateParams),
              componentSlug : component.slug,
              backToContainer : $stateParams.form
          },
          'data' : {}
      };

      FormService.goToForm(params, true, true);
    }


    /**
     * Saves the current form and then redirects to the target page
     */
    function registerNew(component){
      // Save the current form as draft before go to the target form
      FormService.saveCurrentForm().then(
        function(response){
          $stateParams.formSlug = response.formSlug;
          redirect(component);
        },
        function(error){
          console.log("Error while making partial saving");
        }
      );
    }


    /**
     * Update the list of references.
     * TODO: This should return a promise
     */
    function updateReferences(component, parentSlug){

      // We look at the db to find the individuals
      FormService.findForms(
        // We want to find all the individuals who have as the parent slug the
        // parentSlug (that is the current domiciliar slug) passed as param
        {filters : [{"leftOperand":"parentSlug","operator":"=","rightOperand":parentSlug}]},
        // This function will return all the forms that have as parent slug
        // the slug we passed as param.
        function(items){
          angular.forEach(items, function(item){  // We can have more than one
            if(item.type === component.associationTargetType){
              addReference(component, item.slug);
            }
          });
        }
      );
    }

    /**
     * Execs the association
     * @param  {} result
     */
    function updateFormParent(formSearchableItem, parentFormSlug) {
      var deferred = $q.defer();
      FormService.getFormItem(null,formSearchableItem.parentSlug, function(formItem){
        formItem.parentSlug = parentFormSlug;
        formItem.createdAt = new Date();//its necessary to update the date so the form will be sent in the next syncing process
        Persistence.updateItem(CONSTANTS.formEntity, formItem, function(formUpdated){
          var result = {formSlug: formUpdated.slug,formInsertedId: formUpdated.id};
          deferred.resolve(result);
          //the association is saved in real time, not when the form is saved
          ToastService.show(LocalizationService.getString('associationSavedSucessfuly'));
        });
      });
      return deferred.promise;
    }


    function disassociate(slug){
      var deferred = $q.defer();
      FormService.findForms({filters : {"leftOperand":"slug","operator":"=","rightOperand":slug}}, function(items){
        if(items.length > 0){
          var item = items[0];
          item.parentSlug = null;
          item.createdAt = new Date();//its necessary to update the date so the form will be sent in the next syncing process
          Persistence.updateItem(CONSTANTS.formEntity, item, function(response){
            deferred.resolve(response);
            //the dissociation is saved in real time, not when the form is saved
            ToastService.show(LocalizationService.getString('dissociationSavedSucessfuly'));
          });
        }
      });

      return deferred.promise;
    }

    return service;
  }

})();
