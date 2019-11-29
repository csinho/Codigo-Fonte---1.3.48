(function () {
  'use strict';

  angular.module('app').config(routes);

  routes.$inject = ['$stateProvider', '$urlRouterProvider'];

  function routes($stateProvider, $urlRouterProvider) {
    angular.module('app').stateProvider = $stateProvider;
    $stateProvider
      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'GlobalController as globalCtrl'
      })
      .state('auth', {
        url: '/auth',
        templateUrl: 'templates/auth.html'
      })
      .state('app.home', {
        url: '/home',
        views: {
          'menuContent': {
            templateUrl: 'templates/home.html'
          }
        },
        data: {
          title: "Página Inicial"
        }
      })
      .state('app.dynamicForm', {
        url: '/dynamicForm',
        params: {
          formType: null,
          formSlug: null,
          associationFrom: null,
          associationBack: null,
          data : {},
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/form.html',
            controller: 'FormController as formCtrl',
          }
        }
      })
      .state('app.containerPage', {
        url: '/containerPage/{form}/{parent}/{next}',
        params : {
          formType : null,
          formSlug : null,
          data : {},
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/dynamicPage.html',
            controller: 'FormPageController'
          }
        }
      })
      .state('app.search', {
        url: '/search',
        params: {
          paramsObject: null,
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/search.html',
            controller: 'SearchController as searchCtrl'
          }
        },
        data: {
          title: "Busca"
        }
      })
      .state('app.searchIndividuo', {
        url: '/search',
        params: {
          paramsObject: null,
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/searchIndividuo.html',
            controller: 'SearchIndividuoController as searchIndCtrl'
          }
        },
        data: {
          title: "Busca"
        }
      })
      .state('app.summary', {
        url: '/summary',
        params : {
          'slug' : null
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/summary.html',
            controller: 'SummaryPageController as summaryCtrl'
          }
        },
        data: {
          title: "Sumário"
        }
      })
      .state('app.sync', {
        url: '/sync',
        params: {
          paramsObject: null,
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/sync.html'
          }
        },
        data: {
          title: "Sincronização"
        }
      })
      .state('app.events', {
        url: '/events',
        views: {
          'menuContent': {
            templateUrl: 'templates/events.html',
            controller: 'EventController as eventCtrl'
          }
        },
        data: {
          title: "Eventos"
        }
      })
      .state('app.forms', {
        url: '/forms',
        params: {
          paramsObject: null,
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/forms.html',
            controller: 'FormsController as formsCtrl'
          }
        },
        data: {
          title: "Formulários"
        }
      })
      .state('app.backend', {
        url: '/backend',
        views: {
          'menuContent': {
            templateUrl: 'templates/backend.html'
          }
        }
      })
      .state('app.associationPage', {
        url: '/associationPage',
        params: {
          paramsObject: null,
        },
        views: {
          'menuContent': {
            templateUrl: 'templates/associationPage.html',
            controller: 'AssociationPageController as associationPageCtrl'
          }
        },
        data: {
          title: "Página de Associação"
        }
      });

    $urlRouterProvider.otherwise('auth');
  }
} ());
