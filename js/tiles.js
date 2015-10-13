var models = {
  modelCache: {},

  /**
   * Loads a model and material from the given name and returns a promise
   */
  load: function(modelName) {
    if (this.modelCache.hasOwnProperty(modelName)) {
      return Promise.resolve(this.modelCache[modelName]);
    }

    var loader = new THREE.OBJMTLLoader();

    return new Promise(function(resolve, reject) {
      loader.load(
        'models/' + modelName + '.obj',
        'models/' + modelName + '.mtl',
        // Function when both resources are loaded
        function (object) {
          this.modelCache[modelName] = object;
          resolve(object);
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
  }
}

