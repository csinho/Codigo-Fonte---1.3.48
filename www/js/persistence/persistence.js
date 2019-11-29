(function () {

  'use strict';

  angular.module('app').factory('Persistence', Persistence);

  Persistence.$inject = ['$q', '$cordovaSQLite', '$filter', 'PersistenceFactory','UtilsService'];

  function Persistence($q, $cordovaSQLite, $filter, PersistenceFactory,UtilsService) {

    var me = this;

    //public functions
    me.countSimple = countSimple;
    me.findItems = findItems;
    me.getItems = getItems;
    me.removeItems = removeItems;
    me.emptyEntity = emptyEntity;
    me.removeItemById = removeItemById;
    me.populateParent = populateParent;
    me.removeEntity = removeEntity;
    me.insertItem = insertItem;
    me.insertItems = insertItems;
    me.rawQuery = rawQuery;
    me.insertExternalData = insertExternalData;
    me.updateItem = updateItem;

    var persistenceStrategy = PersistenceFactory.getPersistence();
    activate();

    /**
     * the initial function executed
     */
    function activate(){
      me.tableFields = [];
      var fields = persistenceStrategy.getEntityFields();
      for (var i = 0; i < fields.length; i++) {
        me.tableFields.push(fields[i].name);
      }
    }

    /**
     * Fetch the simple counting of elements given a set of filters
     * Returns a promise
     * @param {string} entity - Name of the entity (table)
     * @param {Array} filters - Set of filters
     */
    function countSimple(entity, filters) {
      var deferred = $q.defer();
      var filterObj = getFilterObject(filters);
      persistenceStrategy.checkTable(entity, function () {
        var query = "select count(*) from " + entity + " where " + filterObj.sql;
        persistenceStrategy.exec(query, filterObj.values).then(
          function (res) {
            deferred.resolve(res.rows.item(0)['count(*)']);
          },
          function (res) {
            deferred.reject(res);
          }
        );
      });
      return deferred.promise;
    }

    /**
    * Retrives generic items based in conditions definied by a filter collection
    * Parameter fromEntity - can be an Form Element object or a table name string;
    * Parameter options - an object that can contains:
    *     Parameter distinct - if the query must returns distinct rows or not [true|false];
    *     Parameter groupBy - the group by the query must do
    *     Parameter orderBy - the the columns that should be used to order the results
    *         An optional parameter 'order' define the order type (asc|desc). the default is asc
    *         An optional parameter 'orderByCast' is used to cast the column value. Examples of cast type: date, integer
    *    filters - is a list of filters (or a single object) containing  the properties leftOperand, operator and rightOperand
    *         leftOperand can contain a value or reference (string) to the entity parent;
    *         rightOperand can contain a value or a object containing a reference (string) to a Element property;
    *         Filter examples:
    *         {"leftOperand":"municipio.uf","operator":"in","rightOperand":{"elementProperty":"dataValue.value"}}
    *         {"leftOperand":"municipio","operator":"=","rightOperand":"salvador"}
    *    innerJoin - is an object containing the join entity name, the join clause and
    *          the selectFields that must be selected from the joining entity.
    *          Example:  {entity:'form',
    *                     clause:{left:'form.slug', operator:'=', right:'formSearchable.parentslug'},
    *                     selectFields:[{fieldName:"value",fieldAlias:"form"}]
    *                     }
    *          clause - an object containing the left, the operator and the right operands
    * Parameter callback - is the function that will be called when the async call finishes
    * if the query is executed successfully the callback returns the item collection and the fromEntity;
    * if the query returns error, the callback returns an empty collection, fromEntity and the error;

    * @param  {}|string fromEntity
    * @param  {} options
    * @param  function callback
    */
    function findItems(fromEntity, options, callback) {
      var entity = typeof (fromEntity) === 'object' ? (fromEntity.contentType ? fromEntity.contentType : fromEntity.entitySlug) : fromEntity;

      if (!options) options = {};
      options.distinct = (options.distinct && options.distinct === true) ? 'distinct' : '';
      options.groupBy = options.groupBy ? ' group by ' + options.groupBy : '';
      options.limit = !options.limit ? ' ' : ' limit ' + options.limit;
      options.offset = !options.offset ? ' ' : ' offset ' + options.offset;

      buildOrderBy(options);
      persistenceStrategy.checkTable(entity, function () {
        var joins = buildJoins(options);
        adjustFiltersEntity(options, entity);
        var filterObj = getFilterObject(options.filters);

        var query = "select " + options.distinct + " " + entity + ".*" + joins.joinsSelectFields + " from " + entity + joins.joinClauses;
        if (filterObj.values.length > 0) query += " where " + filterObj.sql;
        query += options.groupBy + options.orderBy + options.limit + options.offset;
        persistenceStrategy.exec(query, filterObj.values)
          .then(function (res) {
            var items = persistenceStrategy.rowsToItems(res.rows, entity, joins.aliases);
            if (callback) callback(items, fromEntity);
          },
          function (err) {
            if (callback) callback([], fromEntity, err);
          });
      });
    }

    /**
     * Updates a item keeping the item slug, but changing the autoincrement id
     * @param  {} entity
     * @param  {} item
     * @param  {} callback
     */
    function updateItem(entity, item, callback) {
      //we can only update an item if the its slug is defined!
      if (!item.slug) {
        if (callback) callback(0, entity, 'the_item_slug_must_be_setted');
      }
      else {
        //gets the ite to be updated. We need its autogenerated id
        var options = { filters: { leftOperand: "slug", operator: "=", rightOperand: item.slug } };
        findItems(entity, options, function (foundResults, foundEntity, foundErr) {
          if (foundErr) {
            if (callback) callback(foundResults, foundEntity, foundErr);
          }
          else if (foundResults.length > 0) {//we cannot update an not found item
            var oldItemId = foundResults[0].id;

            //inserts the item updated, with the defined slug
            insertItem(entity, item, function (insertResult, intoEntity, insertError) {
              if (insertError) {
                if (callback) callback(insertResult, intoEntity, insertError);
              }
              else {
                //remove the old item by autoincrement id;
                removeItemById(entity, oldItemId, function (removeResult, removeEntity, removeErr) {
                  if (removeErr) {
                    if (callback) callback(removeResult, removeEntity, removeErr);
                  }
                  else {
                    if (callback) callback(insertResult, intoEntity, insertError);
                  }
                });
              }
            });
          }
          else {//we cannot update an not found item
            if (callback) callback(0, entity, 'no_item_found_to_update');
          }
        });
      }
    }

    /**
    * Builds the orderBy/order clause - for internal usage only
    * @Returns nothing - modifies the original object
    * @param  {} options fot build the filter
    */
    function buildOrderBy(options) {
      if (options.orderBy) {
        var orderByValue = options.orderBy;
        if (options.orderByCast) {
          orderByValue = options.orderByCast + '(' + options.orderBy + ')'; //example: date(datetime)
        }
        options.orderBy = ' order by ' + orderByValue;
        if (options.order) {
          options.orderBy = (options.orderBy + ' ' + options.order);
        } else {
          options.orderBy = (options.orderBy + ' asc');
        }
      } else {
        options.orderBy = '';
      }
    }

    /**
     * Builds the joins defined in options parameters. the current join suport is only inner join
     * @param  {} options
     */
    function buildJoins(options) {
      var joinsSelectFields = '';
      var joinClauses = '';
      var joinAliases = [];

      if (options.innerJoins && Array.isArray(options.innerJoins)) {
        angular.forEach(options.innerJoins, function (innerJoinOption) {
          populateJoin(getJoin(innerJoinOption));
        });
      }
      if (options.innerJoin) {
        var singleInnerJoin = getJoin(options.innerJoin);
        populateJoin(singleInnerJoin);
      }

      if (options.joins && Array.isArray(options.joins)) {
        angular.forEach(options.joins, function (eachJoin) {
          populateJoin(getJoin(eachJoin));
        });
      }
      if (options.join) {
        populateJoin(getJoin(options.join));
      }
      options.joinsBuilt = { "joinsSelectFields": joinsSelectFields, "joinClauses": joinClauses, "aliases": joinAliases };

      return options.joinsBuilt;

      /**
      * Inner function that populates the join to the join return variables
      * @param {} join
      */
      function populateJoin(join) {
        joinsSelectFields += join.fields;
        joinClauses += join.clause;
        joinAliases = joinAliases.concat(join.aliases);
      }

      /**
       * Inner function that gets the join object
       * @param {} joinOption
       */
      function getJoin(joinOption) {
        var fields = '';
        var clause = '';
        var aliases = [];
        var joinType = joinOption.type? joinOption.type: 'join';
        var fieldEntityAlias = joinOption.entityAlias? joinOption.entityAlias : joinOption.entity;
        angular.forEach(joinOption.selectFields, function (field) {
          fields += " , " + fieldEntityAlias + "." + field.fieldName + " as " + field.fieldAlias;
          aliases.push(field.fieldAlias);
        });

        var joinEntityAlias = joinOption.entityAlias? joinOption.entityAlias : "";
        clause += " " + joinType + " " + joinOption.entity + " " + joinEntityAlias + " on " + joinOption.clause.left + " " + joinOption.clause.operator + " " + joinOption.clause.right;
        return { "fields": fields, "clause": clause, "aliases": aliases };
      }

    }

    /**
     * Adjust filters entity if a join is defined
     * This is necessary to avoid conflicts between column names
     * @param  {} options
     * @param  {} mainEntity
     */
    function adjustFiltersEntity(options, mainEntity){
       if (options.joinsBuilt) {
         angular.forEach(options.filters, function (filter) {
           if (filter && filter.leftOperand && filter.leftOperand.indexOf('.') === -1) {
             filter.entity = mainEntity;
           }
        });
       }
    }

    /**
    * Retrives generic items with no options or conditions
    * Parameter - fromEntity can be an Form Element object or a table name string;
    * Parameter callback - is the function that will be called when the async call finishes
    * if the query is executed successfully the callback returns the items collection and the fromEntity;
    * if the query returns error, the callback returns an empty collection, fromEntity and the error;

    * @param  {} fromEntity
    * @param  function callback
    */
    function getItems(fromEntity, callback) {
      findItems(fromEntity, {}, function (results, fromEntity, err) {
        if (callback) callback(results, fromEntity, err);
      });
    }

    /**
    * Removes generic items based in conditions definied by a filter collection
    * Parameter fromEntity - can be an Form Element object or a table name string;
    * Parameter options - an object that can contains:
    *     Parameter distinct - is shall return distinct rows or not [true|false];
    *     filters - is a list of filters (or a single object) containing  the properties leftOperand, operator and rightOperand
    *         leftOperand can contain a value or reference (string) to the entity parent;
    *         rightOperand can contain a value or a object containing a reference (string) to a Element property;
    *         Filter examples:
    *         {"leftOperand":"municipio.uf","operator":"in","rightOperand":{"elementProperty":"dataValue.value"}}
    *         {"leftOperand":"municipio","operator":"=","rightOperand":"salvador"}
    * Parameter callback - is the function that will be called when the async call finishes
    * Returns the amount of items removed;

    * @param  {}|string fromEntity
    * @param  {} options
    * @param  function callback
    */
    function removeItems(fromEntity, options, callback) {
      var entity = typeof (fromEntity) === 'object' ? (fromEntity.contentType ? fromEntity.contentType : fromEntity.entitySlug) : fromEntity;
      persistenceStrategy.checkTable(entity, function () {
        var filterObj = getFilterObject(options.filters);
        var query = "delete from " + entity;
        if (filterObj.values.length > 0) query += " where " + filterObj.sql;
        persistenceStrategy.exec(query, filterObj.values)
          .then(function (res) {
            if (callback) callback(res.rows.length, fromEntity);
          },
          function (err) {
            if (callback) callback([], fromEntity, err);
          });
      });
    }

    /**
    * Emptys all data from an Entity
    * Parameter fromEntity - can be an Form Element object or a table name string;
    * Parameter callback - is the function that will be called when the async call finishes
    * Returns the amount of items removed;

    * @param  {}|string fromEntity
    * @param  function callback
    */
    function emptyEntity(fromEntity, callback) {
      var entity = typeof (fromEntity) === 'object' ? (fromEntity.contentType ? fromEntity.contentType : fromEntity.entitySlug) : fromEntity;
      persistenceStrategy.checkTable(entity, function () {
        var query = "delete from " + entity;// + " where status <> 'draft'";
        persistenceStrategy.exec(query)
          .then(function (res) {
            if (callback) callback(res.rows.length, fromEntity);
          },
          function (err) {
            if (callback) callback([], fromEntity, err);
          });
      });
    }

    /**
    * Removes a generic item based in the item id
    * Parameter fromEntity - can be an Form Element object or a table name string;
    * Parameter itemId - the autoincrement item id generated in the database;
    * Parameter call{}|back - is the function that will be called when the async call finishes
    * Returns the a boolean which represent if the item was removed or not

    * @param  {}|string fromEntity
    * @param  {} itemId
    * @param  function callback
    */
    function removeItemById(fromEntity, itemId, callback) {
      var entity = typeof (fromEntity) === 'object' ? (fromEntity.contentType ? fromEntity.contentType : fromEntity.entitySlug) : fromEntity;
      persistenceStrategy.checkTable(entity, function () {
        var query = "delete from " + entity + " where id = ?";
        persistenceStrategy.exec(query, [itemId])
          .then(function (res) {
            var removed = res.rows.lengt > 0;
            if (callback) callback(removed, fromEntity);
          },
          function (err) {
            if (callback) callback(false, fromEntity, err);
          });
      });
    }




    /**
    * If the item has a parent, the parent object is retrived from DB and populated in the item's parentEntity property;
    * Parameter item  - is an object containing id,value,slug,desc, parentSlug, parentEntity
    * Parameter callback  - is the function that will be called after the async execution. The callback will send the item as parameter
    * Example: if item.parentEntity == 'uf' after executed the item will have the property item.uf property with the uf object

    * @param  {} item
    * @param  function callback
    */
    function populateParent(item, callback) {
      if (!item.parentSlug || item.parentSlug === 0 || item.parentSlug === '') {
        callback(item);
      }
      else {
        var filter = {"leftOperand": 'slug',"operator": "=","rightOperand": item.parementSlug};
        var options = {filters: filter};
        findItems(item.parentEntity, options, function (result) {
          if (result.length > 0) {
            item[item.parentEntity] = result[0];
          }
          callback(item);
        });
      }
    }

    /**
    * Internal function that converts conditions filters in sql query and a collection
    * of values to be binded to the query as parameter
    * Parameter filters - is a collection (or single object) of type filter that will be parsed to a sql
    * Returns an object with the properties {sql:<partial-query-sql>, values:<collection>}
    * @param  {}|[] filtersObjOrList
    */
    function getFilterObject(filtersObjOrList) {
      var sql = '';
      var values = [];
      var filters = [];

      //checks if was send a single filter or a filter array
      if (Array.isArray(filtersObjOrList)) {
        filters = filtersObjOrList;
      } else {
        filters.push(filtersObjOrList);
      }
      if (filters && filters.length > 0) {
        angular.forEach(filters, function (filter) {

          if (filter && filter.leftOperand && filter.operator && filter.rightOperand) {
            filter.entity = filter.entity ? filter.entity + "." : "";
            if (values.length > 0) sql += " and ";

            //defines if the left operand points to a parent property
            var externalParentPropertyCompare = null;
            if (filter && filter.leftOperand.indexOf('.') > -1) {
              var leftOperandNavigation = filter.leftOperand.split('.')[1];
              if (me.tableFields.indexOf(leftOperandNavigation) === -1) {
                externalParentPropertyCompare = leftOperandNavigation;
              }
            }

            //mount filter based in parent value
            if (externalParentPropertyCompare) {
              var parentEntity = externalParentPropertyCompare;
              persistenceStrategy.checkTable(parentEntity);
              sql += " " + filter.entity + "parentSlug " + filter.operator + " (select slug from " + parentEntity + " where " + parentEntity + ".value = ?)";
              values.push(filter.rightOperand);
            }
            //mount filter based in like
            else {
              if (filter.operator === 'like') {
                sql += " lower(" + filter.entity + filter.leftOperand + ")" + " like ?";
                var valueLower = '%' + filter.rightOperand.toString().toLowerCase() + '%';
                values.push(valueLower);
              }
              //mount default filter
              else {
                sql += " " + filter.entity + filter.leftOperand + " " + filter.operator + " ? ";

                //convert date to string pattern if rightOperand is date object
                if ((filter.rightOperand instanceof Date)) {
                  //var dateStr = $filter('date')(filter.rightOperand, 'yyyy-MM-dd');
                  var dateStr = $filter('date')(filter.rightOperand, 'yyyy-MM-dd HH:mm:ss');
                  filter.rightOperand = dateStr;
                }
                values.push(filter.rightOperand);
              }
            }
          }
        });
      }
      return {
        "sql": sql,
        "values": values
      };
    }


    /**
    Internal function that checks if a given table exists. If not the table is created;
    Parameter - fromEntity can be an Form Element object or a table name string;
    Parameter callback - is the function that will be called when the async execution is finished passing the entity
    Returns a boollen representing if the entity was removed and the entity
    If an error has occurred, the callback will include an second parameter 'err'

    * @param  {}|string fromEntity
    * @param  function callback
    */
    function removeEntity(fromEntity, callback) {
      var entity = typeof (fromEntity) === 'object' ? (fromEntity.contentType ? fromEntity.contentType : fromEntity.entitySlug) : fromEntity;
      persistenceStrategy.exec(db, "DROP TABLE IF EXISTS " + entity)
        .then(function (res) {
          var removed = res.rows.lengt > 0;
          if (callback) callback(removed, entity);
        },
        function (err) {
          if (callback) callback(false, entity, err);
        });
    }



    /**
    Internal function to appends item properties to a bind parameters list used to execute a query
    Parameter item  - is an object containing id,value,slug,desc, parentSlug, parentEntity
    Parameter valuesData  - is an array where the item properties will be binded to;
    THE VALUESDATA CORRECT ORDER IS CRUCIAL!

    * @param  {} item
    * @param  [] valuesData
    */
    function appendValueData(item, valuesData) {
      if(!valuesData) valuesData = [];
      var fields = persistenceStrategy.getEntityFields();
      for (var i = 0; i < fields.length; i++) {
        //the pk is autoincremented, and must not be passed
        if(fields[i].pk !== true){
          var itemValue = item[fields[i].name];
          valuesData.push(itemValue);
        }
      }
      return valuesData;
    }

    /**
    Internal function to prepare the items. It set default values when they are note set;
    the funnction also verify if the property values contains an object. If yes, it is converted to a string;
    Parameter entityName - is the name of the entity which the item belong to;
    Parameter item - is an object containing id,value,slug,desc, parentSlug, parentEntity

    * @param  string entityName
    * @param  {} item
    */
    function prepareItem(entityName, item) {
      if (!item.desc) {
        if (entityName) {
          item.desc = entityName;
        } else {
          item.desc = 'desc not provided';
        }
        //item.desc = item.value == 'object'? entityName : item.value;
      }
      if(!item.valueDesc) item.valueDesc = item.desc;

      if (typeof (item.value) === 'object') item.value = JSON.stringify(item.value);
      if (!item.slug) item.slug = entityName + "_" + guid();
      if (!item.type) item.type = null;
      if (!item.parentSlug) item.parentSlug = null;
      if (!item.parentEntity) item.parentEntity = null;
      if (item.parentSlug && !item.parentEntity) item.parentEntity = entityName;

      if (!(item.createdAt instanceof Date)) {
        item.createdAt  = UtilsService.tryParseDate(item.createdAt);
         if (!item.createdAt){
          item.createdAt = new Date();
        }
      }
      item.createdAt = $filter('date')(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      if (item.status === undefined) item.status = 'saved';
      return item;
    }

    /**
    Insert an item in a entity table;
    Parameter entity - is the entity which the item belong to;
    Parameter item - is an object containing id,value,slug,desc, parentSlug, parentEntity
    Parameter callback - the function that will be called when the async call is finished
    The callback will return the inserted item (which contains a id property) of the insert item or the zero value and a second parameter containing the error;

    * @param  {}|string intoEntity
    * @param  {} item
    * @param  function callback
    */
    function insertItem(intoEntity, item, callback) {
      var entity = typeof (intoEntity) === 'object' ? (intoEntity.contentType ? intoEntity.contentType : intoEntity.entitySlug) : intoEntity;
      var valuesData = [];
      var itemToInsert = angular.copy(item);
      itemToInsert = prepareItem(entity, itemToInsert);
      appendValueData(itemToInsert, valuesData);
      var valuesPlaceholder = '(' + getFieldsPlaceHolder() + ')';
      saveData(entity, valuesPlaceholder, valuesData, function (result, err) {
        if (!err) {
          itemToInsert.id = result; //in this case result returns the saved item id
          itemToInsert.value = item.value;
          if (callback) callback(itemToInsert, intoEntity, err);
        } else {
          if (callback) callback(result, intoEntity, err);
        }

      });
    }

    /**
    Insert an item collection in a entity table;
    Parameter entity - is the entity who the item belong to;
    Parameter item - is an object containing id,value,slug,desc, parentSlug, parentEntity
    Parameter callback - the function that will be called when the async call is finished
    The callback will return number of items inserted or the zero value and a second parameter containing the error;

    * @param  {}|string intoEntity
    * @param  {} items
    * @param  function callback
    */
    function insertItems(intoEntity, items, callback) {
      var entity = typeof (intoEntity) === 'object' ? (intoEntity.contentType ? intoEntity.contentType : intoEntity.entitySlug) : intoEntity;
      if (items.length) {
        var valuesPlaceholder = '';
        var counter = 0;
        var valuesData = [];
        angular.forEach(items, function (item) {
          var itemToInsert = angular.copy(item);
          itemToInsert = prepareItem(entity, itemToInsert);
          appendValueData(itemToInsert, valuesData);
          if (counter > 0) valuesPlaceholder += ', ';
          valuesPlaceholder += '(' + getFieldsPlaceHolder() + ')';
          counter++;
        });

        saveData(entity, valuesPlaceholder, valuesData, function (result, err) {
          if (callback) callback(result, intoEntity, err);
        });
      } else {
        if (callback) callback(0, intoEntity, "items_must_be_greater_than_zero");
      }
    }

    /**
    Internal function that save data in db. It is used by other methods like insertItem and insertItems;
    Parameter entity - is the entity who the item belong to;
    Parameter valuesPlaceholder - a string containing the sql questio marks as place holders to the values that will be binded;
    Parameter valuesData - an array of values to be binded to the query;
    Parameter callback - the function that will be called when the async call is finished
    The callback will return number of items inserted, the id if it was inserted only one or the zero value and a second parameter containing the error;

    * @param  string entity
    * @param  string valuesPlaceholder
    * @param  [] valuesData
    * @param  function callback
    */
    function saveData(entity, valuesPlaceholder, valuesData, callback) {
      persistenceStrategy.checkTable(entity, function () {
        //var fields = persistenceStrategy.getEntityFields();
        var fieldsSql = getFieldsSql();
        var query = "INSERT INTO " + entity + " (" + fieldsSql + ") VALUES " + valuesPlaceholder;
        persistenceStrategy.exec(query, valuesData).then(function (res) {
          var returnValue = res.rows.length > 1 ? res.rows.length : res.insertId;
          //console.log('inserted item in '+entity+' with id ' + res.insertId);
          if (callback) callback(returnValue);
        },
          function (err) {
            //console.log('error while inserting item in '+entity+ ' error:'+err);
            if (callback) callback(0, err);
          });
      });
    }

    /**
     * Gets the sql string containing the entity fields sql
     */
    function getFieldsSql(){
      var fields = persistenceStrategy.getEntityFields();
      var fieldsSql = '';
      for (var i = 0; i < fields.length; i++) {
        //the pk is autoincremented, and must not be passed
        if(fields[i].pk !== true){
          if(fieldsSql !== '') fieldsSql += ', ';
          fieldsSql += fields[i].name;
        }
      }
      return fieldsSql;
    }

    /**
     * Gets the sql string containing the entity fields sql
     */
    function getFieldsPlaceHolder(){
      var fields = persistenceStrategy.getEntityFields();
      var fieldsSql = '';
      for (var i = 0; i < fields.length; i++) {
        //the pk is autoincremented, and must not be passed
        if(fields[i].pk !== true){
          if(fieldsSql !== '') fieldsSql += ', ';
          fieldsSql += '?';
        }
      }
      return fieldsSql;
    }

    /**
    Executes a raw query
    Parameter sqlQuery - is the string containing the sql query
    Parameter callback - the function that will be called when the async call is finished
    The callback will return number of items inserted, the id if it was inserted only one or the zero value and a second parameter containing the error;

    * @param  string sqlQuery
    * @param  function callback
    */
    function rawQuery(sqlQuery, callback) {
      try {
        persistenceStrategy.exec(sqlQuery)
          .then(function (res) {
            var returnValue = res.insertId ? res.insertId : res.rows.length;
            var items = persistenceStrategy.rowsToItems(res.rows, 'unknown');
            if (items.length > 0) {
              returnValue = items;
            }
            if (callback) callback(returnValue);
          },
          function (err) {
            if (callback) callback(0, err);
          });
      } catch (err) {
        if (callback) callback(0, err);
      }
    }


    /**
     * Convert a list of values in the respective string
     * Useful to mount huge sql string without passing valuesData as parameter
     */
    function convertValuesData(valuesData) {
      var result = "(";
      for (var i = 0; i < valuesData.length; i++) {
        if (valuesData[i]) {
          if (typeof valuesData[i] === 'string') result += '"' + valuesData[i] + '"';
          else result += valuesData[i];
        }
        else result += 'null';
        if (i < valuesData.length - 1) result += ',';
      }
      result += ')';
      return result;
    }

    function insertExternalItem(entity) {
      var deferred = $q.defer();
      var entityStr = typeof (entity) === 'object' ? (entity.contentType ? entity.contentType : entity.entitySlug) : entity;
      persistenceStrategy.checkTable(entityStr, function () {
        var counter = 0;

        var success = function (tx, result) {
            counter++;
        };

        var error = function (tx, error) {
          counter++;
          console.log("Error inserting items: " + error.message);
          return true;
        };

        // We start the transaction so we can speed things up
        persistenceStrategy.db.transaction(function (tx) {
          // We prepare and insert each of the items
          angular.forEach(entity.items, function (item) {
            var itemToInsert = angular.copy(item);
            itemToInsert = prepareItem(entity, itemToInsert);
            var valuesData = [];
            appendValueData(itemToInsert, valuesData);
            var query = "INSERT INTO " + entityStr + " (" + getFieldsSql()+ ") VALUES (" + getFieldsPlaceHolder() + ")";
            tx.executeSql(query, valuesData, success, error);
          });
        },
        function (response) { // ERROR
          deferred.reject(response);
        },
        function () { // SUCCESS
          deferred.resolve(counter);
        });
       });

      return deferred.promise;
    }


    /**
    Temporary method used to insert mocked sync data;
    Parameter externalEntities - is a list of entities with items to be inserted in the db;
    Each entity must have: a property 'entitySlug', a collection of 'items' and an optional property 'emptyExistingItems'
    Returns three parameters: results(a counter), null for entity (considering it is a collection of entity) and a collection of errors
        Each error is an object containing the entity name and the error object

    * @param  [] externalEntitiesCollection
    * @param  function callback
    */
    function insertExternalData(externalEntitiesCollection) {
      var deferred = $q.defer();

      angular.forEach(externalEntitiesCollection, function (entity) {
        if (entity.emptyExistingItems && entity.emptyExistingItems === true) {
          emptyEntity(entity, function (itemsDeleted, fromEntity, err) {
            deferred.resolve(insertExternalItem(fromEntity));
          });
        } else {
          //insertExternalItem(entity);
          deferred.resolve(insertExternalItem(entity));
        }
      });

      return deferred.promise;
    }

    /**
    Generates pseudo unique id based in random values and current datetime;
    Returns a string with the pseudo unique id;
    */
    function guid() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }
      var randon = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
      return new Date().getTime() + '_' + randon;
    }

    return me;
  }
})();
