var models = {
  modelCache: {},
  requestedModels: {},

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
  }
}

