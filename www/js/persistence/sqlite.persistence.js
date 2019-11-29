(function () {

  'use strict';

  angular.module('app').factory('SqlitePersistence', SqlitePersistence);

  SqlitePersistence.$inject = ['$cordovaSQLite'];

  function SqlitePersistence($cordovaSQLite) {

    var me = this;
    me.db = null;
    me.dbName = 'dbMapaDaSaudeMacs152';

    //public functions
    me.rowsToItems = rowsToItems;
    me.checkTable = checkTable;
    me.exec = exec;
    me.getEntityFields = getEntityFields;


    /*
     * Gets the entity fields
     */
    function getEntityFields(){
      //YOU CAN NOT REMOVE THESE FIELDS!!
      var mandatoryFields = [
        {name:'id',type:'integer', pk: true}, //a local unique identifier that is auto-incremented. Only one field must be defined as pk
        {name:'slug', type:'text'}, //a semantic identifier that is suposed to be globaly unique
        {name:'value',type:'text'}, //the registry value (can be a string, an integer, a json object, a datatime or whatever)
        {name:'valueDesc',type:'text'}, //the value desc. For example, when selcting a state the value can be a code, like 17 and the desc can be the name, Florida
        {name:'type',type:'text'}, //the type of content
        {name:'desc',type:'text'}, //the description of the value.For example, in the case of the Florida the value would 17, the valueDesc 'Florida' and the desc 'State'
        {name:'parentSlug',type:'text'}, //the globaly semantic identifier of the parent
        {name:'parentEntity',type:'text'}, //the entity where the parent is sotored
        {name:'createdAt',type:'DATETIME'}, //the date of creation
        {name:'status',type:'text'}, //the status, like 'draft', 'saved','completed' or whatever is needed
      ];
      //YOUR CUSTOM FIELDS, IF NECESSARY, COMES HERE
      var optionalFields = [
        //add here additional fields following the structure of the mandatoryFields
      ];

      var allFields = mandatoryFields.concat(optionalFields);
      return allFields;
    }


    /**
    * Converts the resource result of a query in a items collection
    * Parameter - results is resource returned by a query
    * Parameter - entityName can be an Form Element object or a table name string;
    * Each item is an object with the following properties:id,value,slug,desc, parentSlug, parentEntity

    * @param  [] results
    * @param  string entityName
    */
    function rowsToItems(results, entityName, aditionalFields) {
      var items = [];
      for (var i = 0; i < results.length; i++) {
        try {
          items.push(results.item(i));
          var JSONvalue = tryParseJSON(items[i].value);
          if (JSONvalue !== false) items[i].value = JSONvalue;

          items[i].entity = entityName;

          //set the desc as value is desc is null and value is not an object
          var valueIsObject = typeof (items[i].value) === 'object';
          if ((!items[i].desc || items[i].desc === null) && !valueIsObject) {
            items[i].desc = items[i].value;
          }

          //restore boolean data
          if(items[i].value === 'false' || items[i].value === 'true'){
            if(items[i].value === 'false') items[i].value = false;
            if(items[i].value === 'true') items[i].value = true;
          }
          items[i].createdAt = new Date(Date.parse(items[i].createdAt));

          //try parse additional fields
          if (aditionalFields && Array.isArray(aditionalFields)) {
            for (var j = 0; j < aditionalFields.length; j++) {
              var fieldName = aditionalFields[j];
              var additionalJSONvalue = tryParseJSON(items[i][fieldName]);
              if (additionalJSONvalue !== false) items[i][fieldName] = additionalJSONvalue;
            }
          }

        } catch (error) {
          //silence is gold!
        }
      }

      return items;
    }

    /**
    Checks if a string is a valid JSON. If yes, returns the JSON object. If not, returns false;
    Parameter str - the string to be verified if is a JSON;
    * @param string str
    */
    function tryParseJSON(str) {
      var JSONObj = false;
      try {
        JSONObj = JSON.parse(str);
      } catch (e) {
        //silence is gold
      }
      return JSONObj;
    }

    /**
    * Internal function that checks if a given table exists. If not the table is created;
    * Parameter entity  - is the table name that will be checked/created
    * Parameter callback - is the function that will be called when the async execution is finished passing the entity
    * If an error has occurred, the callback will include an second parameter 'err'
    * @param  string entity
    * @param  function callback
    */
    function checkTable(entity, callback) {
      var fields = getEntityFields();
      var createFieldsSql = '';
      for (var i = 0; i < fields.length; i++) {
        if(createFieldsSql !== '') createFieldsSql += ', ';
        createFieldsSql += fields[i].name + ' ' + fields[i].type;
        if(fields[i].pk === true ){
          createFieldsSql += ' primary key';
        }
      }
      var createTableSql = "CREATE TABLE IF NOT EXISTS " + entity + " (" + createFieldsSql + ")";
      exec(createTableSql).then(
        function (res) {
          if (callback) callback(entity);
        },
        function (err) {
          if (callback) callback(entity, err);
        }
      );
    }

    /**
     * Executes any call to the db
     * @param  string query
     * @param  [] valuesData
     */
    function exec(query, valuesData) {
       var db = getDB();
       return $cordovaSQLite.execute(db, query, valuesData);
    }

     /**
    Internal function that gets the current instance of the db object. If not setted yet, set the db object;
    Set the db to the db class pŕoperty and also returns the db object;
    */
    function getDB() {
      var dbFileName = me.dbName + ".db";
      if (me.db === null) {
        me.db = $cordovaSQLite.openDB({
          name: dbFileName,
          location: "default",
          bgType: 1
        });
      }
      return me.db;
    }

    return me;
  }
})();
