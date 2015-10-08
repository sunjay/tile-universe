/**
 * Loads a model and material from the given name and returns a promise
 */
function loadModel(modelName) {
  var loader = new THREE.OBJMTLLoader();

  return new Promise(function(resolve, reject) {
    loader.load(
      'models/' + modelName + '.obj',
      'models/' + modelName + '.mtl',
      // Function when both resources are loaded
      function (object) {
        resolve(object);
      },
      // Function called when downloads progress
      function (xhr) {
        //console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      // Function called when downloads error
      function (xhr) {
        reject('An error occurred while attempting to load ' + modelName);
      }
   );
  });
}

