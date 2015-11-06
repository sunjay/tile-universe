var models = {
  modelCache: {},
  requestedModels: {},

  tilesList: null,
  pathData: null,

  // Custom behaviour for specific models - called once after loading
  loadedCallbacks: {
    car1: function(object) {
      var children = object.children[0].children.forEach(function(child) {
        if (child.material) {
          if (child.material.name === "Car_Body") {
            child.material.emissive.r = 0.8;
          }
          else if (child.material.name === "Car_Glass") {
            child.material.emissive.r = 0.8;
            child.material.emissive.g = 0.8;
            child.material.emissive.b = 0.8;
          }
        }
      });
    }
  },

  /**
   * Loads a model and material from the given name and returns a promise
   */
  load: function(modelName) {
    if (this.modelCache.hasOwnProperty(modelName)) {
      return Promise.resolve(this.modelCache[modelName].clone());
    }

    if (this.requestedModels.hasOwnProperty(modelName)) {
      return new Promise(function(resolve, reject) {
        this.requestedModels[modelName].then(function() {
          resolve(this.load(modelName));
        }.bind(this)).catch(reject);
      }.bind(this));
    }

    var loader = new THREE.OBJMTLLoader();

    var loadingPromise = new Promise(function(resolve, reject) {
      loader.load(
        'models/' + modelName + '.obj',
        'models/' + modelName + '.mtl',
        // Function when both resources are loaded
        function (object) {
          object.rotation.order = 'YXZ';

          // Apply custom transformations on a model-to-model basis
          if (this.loadedCallbacks[modelName]) {
            this.loadedCallbacks[modelName](object);
          }

          this.modelCache[modelName] = object;
          resolve(object.clone());
          delete this.requestedModels[modelName];
        }.bind(this),
        // Function called when downloads progress
        function (xhr) {
          //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }.bind(this),
        // Function called when downloads error
        function (xhr) {
          reject('An error occurred while attempting to load ' + modelName);
        }.bind(this)
     );
    }.bind(this));
    this.requestedModels[modelName] = loadingPromise;

    return loadingPromise;
  },

  tiles: function() {
    if (this.tilesList) {
      return Promise.resolve(this.tilesList);
    }

    this.tilesList = xr.get('models/index.json').then(function(index) {
      var tiles = index.tiles;
      this.tilesList = tiles;
      this.tilesList.forEach(function(tile) {
        var thumbnail = URI("models/").filename(tile.image).toString();
        tile.image = thumbnail;
      });

      return this.tilesList;
    }.bind(this));

    return this.tilesList;
  },

  paths: function() {
    if (this.pathData) {
      return Promise.resolve(this.pathData);
    }

    this.pathData = xr.get('models/pathdata.json').then(function(pathData) {
      this.pathData = pathData;

      Object.keys(this.pathData).forEach(function(name) {
        var data = this.pathData[name];
        var makeVec = function(arr) {
          var vec = new THREE.Vector3();
          return vec.fromArray(arr);
        };

        this.pathData[name] = {
          boundingBox: new THREE.Box3(
            makeVec(data.boundingBox.min),
            makeVec(data.boundingBox.max)
          ),
          nodes: data.nodes.map(function(nodeData) {
            return Object.assign({}, nodeData, {
              position: makeVec(nodeData.position),
            })
          })
        };
      }.bind(this));

      return this.pathData;
    }.bind(this));

    return this.pathData;
  }
}

