;(function () {
  'use strict'

  angular
    .module('app')
    .factory('ValidationService', ValidationService)

  ValidationService.$inject = ['ToastService', 'FormService', 'LocalizationService', '$q', 'FormHandler', '$filter', 'DependencyService','UtilsService','ComponentServiceFactory'];

  function ValidationService (ToastService, FormService, LocalizationService, $q, FormHandler, $filter, DependencyService, UtilsService,ComponentServiceFactory) {
    var service = {
      pastDate: pastDate,
      maxReasonableAge: maxReasonableAge,
      minMultiQuantity: minMultiQuantity,
      showCustomValidatiomMessage: showCustomValidatiomMessage,
      validateMainItem: validateMainItem,
      cnsIsValid: cnsIsValid,
      validateToggle: validateToggle,
      validateList: validateList,
      validateQrCodeButton: validateQrCodeButton,
      validateGeoLocation: validateGeoLocation,
      validateMultiSelect: validateMultiSelect,
      validateComponent: validateComponent,
      formIsValid:formIsValid
    };

    /**
     * Passes the validation if the date is inferior
     * than the current date.
     */
    function pastDate (component) {
      var date = component.dataValue;
      var now = new Date();
      if (date - now > 0) {
        return false;
      }
      return true;
    }

    /**
     * Passes the validation if the difference between now and
     * the entered date is less than
     */
    function maxReasonableAge (component) {
      var date = component.dataValue;
      //here we check if the dataValue is a Date. if not,
      //we try to parse it (considering it is a string representing a date)
      if(!(date instanceof Date)){
        var parsedDate = UtilsService.tryParseDate(date);
        if(parsedDate){
          date = parsedDate;
        }
      }
      if(!(date instanceof Date)){
        return false;
      }
      if (date !== null && date !== undefined && date !== '') {
        var now = new Date();
        if (now.getYear() - date.getYear() > 130) {
          ToastService.show(LocalizationService.getString('maxReasonableAge'));
          return false;
        }
      }
      return true;
    }

    /**
     * Custom validation to verify if the CNS is valid
     * @param  {} component
     */
    function cnsIsValid (component) {
      var s = component.dataValue;
      if (/[1-2]\d{10}00[0-1]\d/.test(s) || /[7-9]\d{14}/.test(s)) {
        var sum = 0;
        var str = s.toString();
        for (var i = 0; i < str.length; i++) {
          var charInt = parseInt(str.charAt(i), 10);
          sum += charInt * (15 - i);
        }
        var rest = sum % 11;
        return rest === 0;
      }
      return false;
    }

    /**
     * Some fields represents quantities related to the selection
     * of a multi-selection component. We shouldn't allow that to
     * be less than the number of selected values.
     */
    function minMultiQuantity (component) {
      var newVal = component.dataValue;
      if (component && component.multiSelectReference) {
        // We search in the idMap for the actual reference
        var multi = FormService.idMap[component.multiSelectReference];
        if (multi.dataValue && newVal < multi.dataValue.length) {
          ToastService.show(LocalizationService.getString('minMultiQuantity'));
          return false;
        }
      }
      return true;
    }

    /**
     * Shows a custom validation message
     * @param  {} msg
     */
    function showCustomValidatiomMessage (msg) {
      if (msg) {
        ToastService.show(msg);
      }
    }

    /**
     * Validates a list component checking the requiredAtLeast attribute
     * @param  {} listComponent
     */
    function validateList (listComponent) {
      var isvalid = true;
      if (listComponent.mainItem && listComponent.mainItem.required === true) {
        isvalid = listComponent.dataValue !== null && listComponent.dataValue !== undefined;
      }
      /*else if(){

      }*/
      if (isvalid === true && listComponent.requiredAtLeast) {
        isvalid = listComponent.elements && listComponent.elements.length >= listComponent.requiredAtLeast;
      }
      return isvalid;
    }

    /**
    * Validates a list component checking the requiredAtLeast attribute
    * @param  {} listComponent
    */
    function validateMultiSelect (multiSelectComponent) {
      var isvalid = true;
      var isRequired = DependencyService.isRequired(multiSelectComponent, FormService.idMap);
      if (isRequired === true && multiSelectComponent.requiredAtLeast && multiSelectComponent.requiredAtLeast > 0) {
        var selectedItems = $filter('filter')(multiSelectComponent.options, { selected: true });
        isvalid = selectedItems && selectedItems.length >= multiSelectComponent.requiredAtLeast;
      }
      return isvalid;
    }

    /**
     * Validates the main item attribute, if required
     * @param  {} formSlug
     * @param  {} mainItem
     */
    function validateMainItem(formReferenceSlug, mainItem) {
      var deferred = $q.defer();
      FormService.getFormItem(null, formReferenceSlug, function (formItem, entity, err) {
        var form = formItem.value;
        var targetFormComponent = FormHandler.getComponent(form, mainItem.dependsOnTargetFormFieldBeFilled);
        var targetFieldIsFilled = false;
        if (targetFormComponent) {
          targetFieldIsFilled = targetFormComponent.dataValue !== undefined && targetFormComponent.dataValue !== null;
        }
        deferred.resolve(targetFieldIsFilled);
      });
      return deferred.promise;
    }

    /**
     * Validates a toogle component
     * @param  {} component
     */
    function validateToggle (component) {
      var isValid = true;
      var isRequired = DependencyService.isRequired(component, FormService.idMap);
      if (isRequired === true) {
        isValid = component.dataValue !== null && component.dataValue !== undefined;
      }
      return isValid;
    }

    /**
    * Validates a geolocation component
    * @param  {} component
    */
    function validateGeoLocation (component) {
      var isValid = true;
      var isRequired = DependencyService.isRequired(component, FormService.idMap)
      if (isRequired === true && (!component.transient.lat || !component.transient.long)) {
        isValid = false;
      }
      return isValid;
    }

    /**
    * Validates a geolocation component
    * @param  {} component
    */
    function validateQrCodeButton (component) {
      var isValid = true;
      var qrAppended = null;
      var isRequired = DependencyService.isRequired(component, FormService.idMap);
      if (FormService.currentForm.form.appendedData && FormService.currentForm.form.appendedData.length > 0) {
        var matchingItem = $filter('filter')(FormService.currentForm.form.appendedData, { slug: component.slug });
        if (matchingItem && matchingItem.length > 0) {
          qrAppended = matchingItem[0];
          component.dataValue = qrAppended.dataValue;
        }
      }

      if (isRequired === true && component.dataValue === undefined) {
        isValid = false;
      }
      return isValid;
    }

    /**
     * Set the default validator for custom elements
     * @param  {} component
     */
    function setDefaultValidators(component){
      //if the validator arrya is not initialized, we do it
      if(!component.validators) component.validators = [];

      //if is not setted to do not run the default validation, we run
      if(!component.skipDefaultValidation){
        var componentService = ComponentServiceFactory.get(component.type);
        componentService.setValidators(component);
      }
    }

    /**
     * Validate a component
     * @param  {} component
     */
    function validateComponent (component) {

      var isValid = true;
      var isRequired = DependencyService.isRequired(component, FormService.idMap);
      var isFilled = component.dataValue !== undefined && component.dataValue !== null;
      // we need to validate if it is requirede or if it is filled (some components
      // are not required but if filled must respect a pattern)
      if (isRequired || isFilled) {

        //here the default validatros are built for custom components
        setDefaultValidators(component);

        if(component.validators && component.validators.length > 0){
          for (var i = 0; i < component.validators.length; i++) {
            var validator = component.validators[i];

            // If the validator exists in the validation service we can call it
            if (typeof service[validator] === 'function') {
              isValid = service[validator](component);

              // If the validation failed we can break the validators loop
              if (!isValid && (component.required && component.dataValue) ) {
                // show custom component validation message
                service.showCustomValidatiomMessage(component.additionalValidationMessage);
              }
            }
          }
        }
        else if(isRequired){
          isValid = isFilled && component.dataValue !== '';
        }
      }
      return isValid;
    }

    /**
     * Iterates over a form and validate all the components. Can validate also a part of a form, like a component, section etc..
     * @param  {} form
     */
    function formIsValid(form){
      if(!form) form = FormService.currentForm.form;
      var formIsValid = true;
      if (form) {
        UtilsService.recurComponent(form, function (element) {
          if (element.slug && element.type) {
            var elementIsValid = true;
            if(element.type !== 'section' && element.type !== 'container'){
              if(element.slug === "numeroResidencia"){
                var t = 2;
              }
             elementIsValid = validateComponent(element);
            }
            if(elementIsValid === false){
              formIsValid = elementIsValid;
              //here we return true to tell the recurComponent function
              //to stop the iteration as we found a invalid item
              return true;
            }
          }
        });
      }
      else{
        formIsValid = false;
      }
      return formIsValid;
    }

    return service;
  }
})();
