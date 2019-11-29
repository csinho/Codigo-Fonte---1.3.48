(function () {

  'use strict';

  angular.module('app').controller('FormController', FormController);

  FormController.$inject = [
    '$window', '$scope', '$rootScope', '$state',
    '$stateParams', '$compile', 'FormService',
    'Persistence', 'ToastService',
    '$ionicPlatform', 'GlobalService', '$ionicPopup', '$timeout',
    'FormAssociationService', 'LocalizationService', 'UtilsService', 'FluxService', 'FormHandler','ValidationService'
  ];

  function FormController($window, $scope, $rootScope, $state, $stateParams, $compile,
    FormService, Persistence, ToastService, $ionicPlatform, GlobalService, $ionicPopup,
    $timeout, FormAssociationService, LocalizationService, UtilsService, FluxService, FormHandler,ValidationService) {
    var vm = this;

    // Form starts null
    vm.form = null;
    vm.formStatus = 'draft';


    /**
     * Starts the controller, gets the form and render it
     */
    function activate() {
      vm.formType = $stateParams.formType;
      vm.formSlug = $stateParams.formSlug;

      if ($stateParams.associationBack) {
        vm.formSlug = $stateParams.associationBack.from.formInfo.formSlug;
      }
      // We get the form via promise
      FormService.getFormItem(vm.formType, vm.formSlug, function (formItem, entity, err) {
        if (err) {
          ToastService.show(LocalizationService.getString('itWastNotPossibleToLoadTheForm'));
        }
        else {
          vm.form = formItem.value;
          vm.parentSlug = formItem.parentSlug;
          FormService.setCurrentForm(vm.form, vm.formType, vm.formSlug, formItem.parentSlug, formItem.status);
          $scope.$broadcast('form-loaded', vm.form);

          // We know that an association happened.
          if ($stateParams.associationFrom && $stateParams.associationBack) {
            //restoreAssociationState();
          }
        }
      });
    }

    /**
     * Restore the original form after an associated form is saved
     */
    function restoreAssociationState() {
      // We can associate the component with the slug we register
      if ($stateParams.associationBack.formInfo.formSlug) {
        var restore = $stateParams.associationBack.from;

        var container = FormService.idMap[restore.backToContainer];
        var searchedElementOfContainer = restore.componentSlug;

        var component;

        if (container) {
          component = FormHandler.getComponent(container, searchedElementOfContainer);
          FormAssociationService.addReference(component, $stateParams.associationBack.formInfo.formSlug);
        }
        else {
          // When the action is not triggered from a container the action is slightly different
          component = FormService.idMap[searchedElementOfContainer];
          FormAssociationService.addReference(component, $stateParams.associationBack.formInfo.formSlug);
        }

        // Now that we consumed the back we can erase it
        delete $stateParams.associationBack;
      }

    }

    $scope.$on("$ionicView.enter", function () {

      // We get the current view
      // If formSlug from data is set, it means that the form was created and
      // had its slug updated. We cannot update the slug right away to not
      // mess with history.
      var currentView = FluxService.currentView();
      $stateParams.formSlug = currentView.stateParams.formSlug;

      var reset = false;

      if (FormService.resetForm) {
        delete currentView.stateParams.data.formSlug;
        delete currentView.customData;
        FormService.resetForm = false;
        reset = true;
      }

      //the form slug is passed through the object data
      //because if setted directly in stateParams will gernerate another history entry
      //and mess our app history
      if (currentView.stateParams.data.formSlug) {
        $stateParams.formSlug = currentView.stateParams.data.formSlug;
      }

      if (currentView && currentView.customData && currentView.customData.associationBack) {
        $stateParams.associationBack = currentView.customData.associationBack;
      }

      // Probably we're navigating from/to the same section
      if (FormService.currentForm.formType === $stateParams.formType) {
        // We need to propagate the updated formSlug
        if (FormService.currentForm.formSlug && !$stateParams.formSlug) {
          $stateParams.formSlug = FormService.currentForm.formSlug;
          reset = true;
        }
      }

      if (FormService.currentForm.formType !== $stateParams.formType)
        reset = true;
      if (FormService.currentForm.formSlug !== $stateParams.formSlug)
        reset = true;

      // If the current form is out of sync with the controller we reload
      if(vm.form !== FormService.currentForm.form)
        reset = true;

      if (reset || !vm.form) {
        if (vm.myForm) {
          vm.myForm.$setPristine();
        }
        activate();
      }

      $scope.$broadcast("$dfform.enter");
    });

    vm.showUnopenedDialog = function (successFn, cancelFn) {
      var confirmPopup = $ionicPopup.confirm({
        title: LocalizationService.getString('confirmation'),
        template: LocalizationService.getString('saveFormWithUnopenedSections'),
        cancelText: LocalizationService.getString('cancel'),
      });

      confirmPopup.then(function (res) {
        if (res && successFn)
          successFn();
        else if (cancelFn)
          cancelFn();
      });
    };


    vm.checkUnopened = function () {
      return !vm.myForm.dfForm.allChildrenOpened();
    };

    /**
     * We actually call save the form
     */
    vm.doSave = function () {
      // If it's an association we can set the parent slug
      if ($stateParams.associationFrom) {
        vm.parentSlug = $stateParams.associationFrom.formInfo.formSlug;
      }

      // If it is a new form, removes previous qr code session
      if (!vm.formSlug && vm.form.meta.supportsQRCodeAssociationPrompt) {
        $scope.$parent.globalCtrl.currentQRCodeSession = null;
      }

      FormService.saveForm(vm.form, vm.formType, vm.formSlug, vm.formStatus, vm.parentSlug)
        .then(
          function (response) {//resolved
            var currentView = FluxService.currentView();
            currentView.stateParams.data.formSlug = response.formSlug;
            FormService.currentForm.formSlug = response.formSlug;

            // Update the formSlug
            FluxService.clearCache();
            $stateParams.formSlug = vm.formSlug = response.formSlug;

            if (vm.formStatus === 'completed') {
              ToastService.show(LocalizationService.getString('formSaved'));
            }
            else {
              ToastService.show(LocalizationService.getString('formSavedAsDraft'));
            }
            //this will ask for a qr code association
            //if it is defined in the form json declaration
            vm.checkQRCodeAssociation();

            // We can go back to the page that called the association
            FluxService.goBackFromAssociation($stateParams, FormService.currentForm);
          }
        );
    };

    /**
     * This is the view-model interface for saving. This gateway allows us to
     * ask the user if he wants to save an unopened form anyway, for instance.
     */
    vm.Save = function () {
      vm.myForm.dfForm.validate();//run angular validation
      vm.myForm.$valid = ValidationService.formIsValid(vm.form);//run custom validations
      if ($stateParams.associationFrom && !vm.myForm.$valid) {
        ToastService.show(LocalizationService.getString('toSaveAnAssociatedFormItsMandatoryFieldsMustBeCompleted'));
      }
      else {
        vm.formStatus = 'draft';
        if (vm.myForm.$valid) {
          vm.formStatus = 'completed';
        }
        if (vm.checkUnopened()) {
          // If some containers are not opened yet, we ask the user if he wants
          // to save anyway. So, we pass the doSave as a promise
          vm.showUnopenedDialog(vm.doSave);
        }
        else {
          // If all containers were opened already, we can save right away
          vm.doSave();
        }
      }
    };

    /**
     * Checks if the form may have a QR code associated and asks the user
     * if he/she wants to add a QR code
     * If the user says yes, redirects the user to the QR code association page
     */
    vm.checkQRCodeAssociation = function () {
      var globalCtrl = $scope.$parent.globalCtrl;
      if ((!vm.form.appendedData || !vm.form.appendedData[CONSTANTS.qrCodeSlug]) && vm.form.meta.supportsQRCodeAssociationPrompt) {
        //define confirming message
        var confirmMsg = LocalizationService.getString('formSavedAsDraftdoYouWantToAssociateAQRCode');
        if (vm.formStatus === 'completed') {
          confirmMsg = LocalizationService.getString('formSavedDoYouWantToAssociateAQRCode');
        }

        $ionicPopup.confirm({
          title: LocalizationService.getString('associateQRCode'),
          template: confirmMsg,
          okText: LocalizationService.getString('yes'),
          cancelText: LocalizationService.getString('no')
        }).then(function (res) {
          if (res) {
            var paramsData = {
              parentFormSlug: vm.formSlug,
              parentFormName: vm.form.meta.formName,
              parentFormType: vm.form.meta.formType
            };
            var params = { 'paramsObject': paramsData };
            globalCtrl.goToState('app.codeAssociation', false, params);
          }
        });
      }
    };

    vm.isOnRootPage = function () {
      return $state.current.name === 'app.dynamicForm';
    };
  }

})();
