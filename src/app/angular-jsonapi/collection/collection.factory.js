(function() {
  'use strict';

  angular.module('angularJsonapi')
  .factory('AngularJsonAPICollection', AngularJsonAPICollectionWrapper);

  function AngularJsonAPICollectionWrapper(
    $log,
    uuid4,
    JsonAPIModelFactory
  ) {

    AngularJsonAPICollection.prototype.__add = __add;
    AngularJsonAPICollection.prototype.__synchronize = __synchronize;
    AngularJsonAPICollection.prototype.__get = __get;
    AngularJsonAPICollection.prototype.__remove = __remove;

    AngularJsonAPICollection.prototype.get = get;
    AngularJsonAPICollection.prototype.all = all;
    AngularJsonAPICollection.prototype.remove = remove;
    AngularJsonAPICollection.prototype.all = all;
    AngularJsonAPICollection.prototype.clear = clear;
    AngularJsonAPICollection.prototype.fromJson = fromJson;
    AngularJsonAPICollection.prototype.toJson = toJson;

    return AngularJsonAPICollection;

    function AngularJsonAPICollection(schema, synchronization) {
      var _this = this;

      _this.Model = JsonAPIModelFactory.model(
        schema,
        _this.all,
        _this
      );

      _this.synchronization = synchronization;

      _this.data = {};
      _this.removed = {};
      _this.schema = schema;

      _this.dummy = new _this.Model({type: schema.type}, undefined, true);
      _this.dummy.form.save = __saveDummy.bind(_this.dummy);
      _this.all[schema.type] = _this;

      _this.__synchronize('init');
    }

    function fromJson(json) {
      var _this = this;
      var collection = angular.fromJson(json);

      if (collection !== null && collection.data !== undefined) {
        if (_this.updatedAt === undefined || _this.updatedAt < collection.updatedAt) {
          _this.updatedAt = collection.updatedAt;
        }

        angular.forEach(collection.data, function(objectData) {
          var data = angular.fromJson(objectData.data);
          _this.__add(data, objectData.updatedAt);
        });
      }
    }

    function toJson() {
      var _this = this;
      var json = {
        data: {}
      };

      angular.forEach(_this.data, function(object, key) {
        if (object.dummy === false) {
          json.data[key] = object.toJson();
        }
      });

      return angular.toJson(json);
    }

    function __add(validatedData, updatedAt) {
      var _this = this;
      if (validatedData.id === undefined) {
        $log.error('Can\'t add data without id!', validatedData);
        return;
      }

      if (_this.data[validatedData.id] === undefined) {
        _this.data[validatedData.id] = new this.Model(validatedData, updatedAt);
      } else {
        _this.data[validatedData.id].__setData(validatedData);
      }

      return _this.data[validatedData.id];
    }

    function __get(id) {
      var _this = this;

      if (_this.data[id] === undefined) {
        _this.data[id] = new _this.Model({type: _this.Model.prototype.schema.type}, undefined, true);
      }

      return _this.data[id];
    }

    function get(id) {
      var _this = this;
      var result;

      if (angular.isArray(id)) {
        result = [];
        angular.forEach(id, function(id) {
          result.push(_this.__get(id));
        });
      } else {
        result = _this.__get(id);
      }

      _this.__synchronize('get', result);

      return result;
    }

    function all() {
      var _this = this;

      _this.__synchronize('all');

      return this;
    }

    function clear() {
      var _this = this;
      _this.updatedAt = Date.now();
      _this.data = {};

      _this.__synchronize('clear');
    }

    function __remove(id) {
      var _this = this;
      var object = _this.data[id];

      _this.removed[id] = object;
      _this.updatedAt = Date.now();

      delete _this.data[id];
    }

    function remove(id) {
      var _this = this;
      var object = _this.data[id];

      if (object !== undefined) {
        _this.__remove(id);
        object.__remove(id);
      } else {
        $log.error('Object with this id does not exist');
      }

      _this.__synchronize('remove');
    }

    function __saveDummy() {
      var _this = this;
      var errors = _this.form.validate();
      var newModel;

      if (angular.equals(errors, {})) {
        var data = angular.copy(_this.form.data);
        if (data.id === undefined) {
          data.id = uuid4.generate();
        } else if (!uuid4.validate(data.id)) {
          $log.error('Wrong id of dummy data!');
          return;
        }

        data.links = {};

        data.type = _this.schema.type;
        newModel = _this.parentCollection.__add(data);
        _this.form.reset();
        _this.parentCollection.__synchronize('add', _this);
      }
    }

    function __synchronize(action, object) {
      var _this = this;

      $log.log('Synchro Collection', this.Model.prototype.schema.type, action, object);

      _this.synchronization.synchronize(action, _this, object);
    }
  }
})();
