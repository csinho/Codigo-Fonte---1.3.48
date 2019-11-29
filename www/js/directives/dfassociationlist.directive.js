(function() {

  'use strict';

  angular.module('app').directive('dfAssociationList', function(FormService, LocalizationService){
    return {

      templateUrl: 'templates/components/associationList.html',
      scope : {
        component : "=ngModel",
      },

      controller : function($scope, FormAssociationService) {

        //associate a form to a parent
        $scope.associate = function(){
          // We need to save the current form before we can make an association
          // This is to get a slug from the database service.
          // Maybe this kind of stuff should be done at the creation of the form
          FormService.saveCurrentForm().then(function(response){
            var params = {
                searchFormType : $scope.component.associationTargetType,
                pageTitle : LocalizationService.getString('associationOf') +  $scope.component.itemTitle,
                parentSlug : FormService.currentForm.formSlug
            };

            // We can trigger the action
            FormAssociationService.triggerAssociationAction(params).then(function(response){
              //not necessary anymore
              //FormAssociationService.addReference($scope.component, response.parentSlug);
            });
          });
        };

        $scope.openAssociation = function(type, slug){
          var params = {
              'formType' : type,
              'formSlug' : slug,
              'data' : {}
          };
          FormService.goToForm(params, true, true);
        };

        $scope.disassociate = function(item){
          var slug = item.dataValue;
          FormAssociationService.disassociate(slug).then(
            function success(response){
              for(var i = 0; i < $scope.component.elements.length; i++){
                if($scope.component.elements[i].dataValue === slug){
                  $scope.component.elements.splice(i,1);
                  i--;
                }
              }
              //remove the item setted as main item
              if($scope.component.mainItem && $scope.component.dataValue === slug){
                $scope.component.dataValue = null;
              }
              $scope.removeAsMainItem(slug);
            }
          );
        };

        $scope.removeAsMainItem = function(itemSlug){
          if($scope.component.mainItem && FormService.currentForm.form.appendedData){
            var appended = FormService.currentForm.form.appendedData;
            for (var index = 0; index < appended.length; index++) {
              var element = appended[index];
              if(element.value === itemSlug && element.slug === $scope.component.mainItem.slug){
                 FormService.currentForm.form.appendedData.splice(index,1);
              }
            }
          }
        };

        // We delegate this to the service
        $scope.registerNew = function(){
          FormAssociationService.registerNew($scope.component);
        };

        // This will update the list, fetching from the database
        $scope.update = function(){
          if(FormService.currentForm.formSlug && $scope.component){
            // We reset the current references elements
            $scope.component.elements = [];
            FormAssociationService.updateReferences($scope.component, FormService.currentForm.formSlug);
          }
        };

        //TODO: We can do avoid this update correcting the defer
        // When the form sends a message to revalidate we can update too
        $scope.$on('$dfform.enter', function(){
          $scope.update();
        });

        // Update right away
        $scope.update();
      },
      link : function(scope){
        scope.component.parent = scope.parent ? scope.parent.slug : null;
      }
    };
  });


  angular.module('app').directive('dfAssociationButton', function(FormAssociationService) {
    return {
      templateUrl: 'templates/components/associationButton.html',
      scope : {
        component : "=ngModel"
      },
      controller : function($scope) {
        // We delegate this to the service
        $scope.registerNew = function(){
          FormAssociationService.registerNew($scope.component);
        };
      }
    };
  });

  angular.module('app').directive('dfAssociationItem', function(FormHandler, FormService, ValidationService){
    return {
      templateUrl: function () {
        return 'templates/components/associationItem.html';
      },
      scope : {
        slug: "=",
        component : "=ngModel",
        onItemClick:'='
      },
      link : function(scope){
        scope.type =  scope.component.associationTargetType;
        scope.$watch('slug', function(newVal){
          var filters = [];
          filters.push({leftOperand:"slug",operator:"=",rightOperand:newVal});
          var options = {"filters":filters};
          FormService.findForms(options, function(results, entity, err){
            if(!err && results.length > 0){
              scope.formAssociated = results[0].value;

              // We can set the title and subtitle here
              if(scope.formAssociated){
                scope.summary = FormHandler.getFormSummary(scope.formAssociated);
              }
            }
          });
        });


        scope.onItemClickEvent = function () {
          scope.onItemClick(scope.component.associationTargetType, scope.slug);
        };

        scope.onSelectMainItemClick = function(){
          if(scope.component.mainItem.dependsOnTargetFormFieldBeFilled){
            scope.validateAndSetMainItem();
          }
          else{
            scope.setMainItem();
          }
        };

        scope.validateAndSetMainItem = function(){
          ValidationService.validateMainItem(scope.slug, scope.component.mainItem).then(function(isValid){
             if(isValid){
                scope.setMainItem();
              }
              else{
                ValidationService.showCustomValidatiomMessage(scope.component.mainItem.invalidMessage);
              }
          });

          scope.setMainItem = function(){
            scope.component.mainItem.selectedItemSlug = scope.slug;
            var item = {
              value:scope.slug,
              desc:scope.component.mainItem.label,
              slug:scope.component.mainItem.slug,
              dataType: 'slug',
              type:'formReference',
              targetReferenceCreatedAt:''
            };
            FormHandler.removeItemAppendToForm(scope.component.mainItem.slug, FormService.currentForm.form, function(formCleaned){
              //we need to get the formItem in db to get its createdAt date;
              FormService.getFormItem(null, item.value, function(formItem){
                FormService.currentForm.form = formCleaned;
                //as the unique of a refernce is composed by a slug and a date, we need to set the formReference createdAt
                item.targetReferenceCreatedAt = formItem.createdAt;
                FormHandler.appendItemToForm(item, FormService.currentForm.form, function(formWithAppendedItem){
                  FormService.currentForm.form = formWithAppendedItem;
                });
              });
            });
          };
        };
      }
    };
  });

})();
