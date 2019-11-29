(function () {

  'use strict';

  angular.module('app').factory('PersistenceFactory', PersistenceFactory);

  PersistenceFactory.$inject = ['SqlitePersistence','RemotePersistence'];

  function PersistenceFactory(SqlitePersistence, RemotePersistence) {

    var me = this;
    me.getPersistence = getPersistence;

    /**
     * Gets the persistence strategy, Currenctly only local sqlite
     */
    function getPersistence() {
      return SqlitePersistence;
    }

    return me;
  }
})();
