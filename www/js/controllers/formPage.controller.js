(function () {

  'use strict';

  angular.module('app').controller('FormPageController', function ($scope, $state, $stateParams, FormService, FormAssociationService, FluxService, FormHandler) {

    function updateParams(){
      // We pass the name of the form through the $stateParams.form
      if ($stateParams.form) {
        $scope.form = FormService.idMap[$stateParams.form];
        if(!$scope.form){
          $scope.form = FormHandler.getComponent(FormService.currentForm.form, $stateParams.form);
        }
      }
      if ($stateParams.next) $scope.next = FormService.idMap[$stateParams.next];
      if ($stateParams.parent) $scope.parent = FormService.idMap[$stateParams.parent];
    }

    $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams, options) {
      // We check is we need to save the form partially before leaving the page
      if($scope.saveBeforeLeave && FormService.currentForm.form){
        // We then prevent the state change, save, and only then we can continue
        event.preventDefault();

        // We can now save current form
        FormService.saveCurrentForm().finally(function(){
          // After saving we can continue to the target state
          $scope.saveBeforeLeave = false;
          $state.go(toState, toParams, options);
        });
      }
    });

    $scope.$on("$ionicView.enter", function () {
      $scope.saveBeforeLeave = true;

      // We get the current view
      // If formSlug from data is set, it means that the form was created and
      // had its slug updated. We cannot update the slug right away to not
      // mess with history.
      var currentView = FluxService.currentView();
      if(currentView.stateParams.data.formSlug){
        $stateParams.formSlug = currentView.stateParams.data.formSlug;
        delete currentView.stateParams.data.formSlug;
      }

      var reset = false;

      // Probably we're navigating from/to the same section
      if(FormService.currentForm.formType === $stateParams.formType){
        // We need to propagate the updated formSlug
        if(FormService.currentForm.formSlug && !$stateParams.formSlug){
          $stateParams.formSlug = FormService.currentForm.formSlug;
          reset = true;
        }
      }

      if(FormService.currentForm.formType !== $stateParams.formType) reset = true;
      if(FormService.currentForm.formSlug !== $stateParams.formSlug) reset = true;

      if(reset && ($stateParams.formType || $stateParams.formSlug)){
        // We should reload the form as the FormService needs to be updated
        FormService.getFormItem($stateParams.formType, $stateParams.formSlug, function (formItem) {
          FormService.setCurrentForm(formItem.value, $stateParams.formType, $stateParams.formSlug, formItem.parentSlug, formItem.status);
          updateParams();
        });
      }
      else {
        updateParams();
      }

      // We must consolidate pending association here
      FormAssociationService.consolidateAssociation();

      $scope.$broadcast("$dfform.enter");
    });
  });

})();
