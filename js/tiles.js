var models = {
  modelCache: {},
  requestedModels: {},
  materialsCache: {},

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
   * Shortcut when both obj and mtl have same name
   * Options are any additional options of load that you want to override
   */
  loadModel: function(modelName, options) {
    return this.load(Object.assign({
      objName: modelName,
      mtlName: modelName
    }, options || {}));
  },

  load: function(options) {
    var settings = Object.assign({
      objName: null, // Name of .obj file without extension
      mtlName: null, // Name of .mtl file without extension
      baseUrl: 'models/' // base URL common to both obj and mtl
    }, options);

    if (!settings.objName || !settings.mtlName) {
      throw new Error("Please specify both an obj and mtl name to be loaded");
    }

    var modelName = settings.objName;
    if (this.modelCache.hasOwnProperty(modelName)) {
      return Promise.resolve(this.modelCache[modelName].clone());
    }

    if (this.requestedModels.hasOwnProperty(modelName)) {
      return new Promise(function(resolve, reject) {
        this.requestedModels[modelName].then(function() {
          resolve(this.modelCache[modelName].clone());
        }.bind(this)).catch(reject);
      }.bind(this));
    }

    var objURL = URI(settings.baseUrl).filename(settings.objName + '.obj').toString();
    var mtlURL = URI(settings.baseUrl).filename(settings.mtlName + '.mtl').toString();

    var loadingPromise = new Promise(function(resolve, reject) {
      this.loadMaterial(mtlURL).then(function(materials) {
        var loader = new THREE.XHRLoader();
        loader.load(objURL, 
          // Function called on success
          function (text) {
            var objloader = new THREE.OBJMTLLoader();
            var object = objloader.parse(text);

            this.optimizeObject(object);
            this.applyMaterials(object, materials);

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
    }.bind(this));
    this.requestedModels[modelName] = loadingPromise;

    return loadingPromise;
  },

  /**
   * Loads a .mtl file and returns a promise that resolves into
   * an object that maps material name to a THREE.Material instance
   */
  loadMaterial: function(url) {
    if (this.materialsCache[url]) {
      return this.materialsCache[url];
    }

    this.materialsCache[url] = new Promise(function(resolve, reject) {
      var loader = new THREE.MTLLoader();
      console.log("Loading...", url);
      loader.load(url, function(materialsCreator) {
        materialsCreator.preload();

        var materials = {};
        Object.keys(materialsCreator.materialsInfo).forEach(function(materialName) {
          materials[materialName] = materialsCreator.create(materialName);
        });

        this.materialsCache[url] = Promise.resolve(materials);

        resolve(materials);
      }.bind(this));
    }.bind(this));

    return this.materialsCache[url];
  },

  optimizeObject: function(object) {
    object.traverse(function(object) {
      if (object instanceof THREE.Mesh && object.geometry instanceof THREE.Geometry) {
        object.geometry = (new THREE.BufferGeometry()).fromGeometry(object.geometry);
      }
    });
  },

  applyMaterials: function(object, materials) {
    object.traverse(function(object) {
      if (object instanceof THREE.Mesh) {
        if (object.material.name) {
          var material = materials[object.material.name];
          if (material) object.material = material;
        }
      }
    });
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

