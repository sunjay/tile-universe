var WINDOW_WIDTH = 600;
var WINDOW_HEIGHT = 400;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(0, 50, -0);
camera.lookAt(scene.position);

var light = new THREE.AmbientLight(0xFFFFFF);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEEE, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

// Setup scene
var object_width = 4;
var row_size = 18;
var row_width = object_width * row_size;
for (var i = 1; i <= 302; i++) {
  (function(index) {
    var num = ('000' + index).slice(-3);
    loadModel('roadTile_' + num).then(function(object) {
      var horizontal_offset = object_width * (index - 1);
      object.position.z = -(horizontal_offset % row_width - row_width/2);
      object.position.x = Math.floor(horizontal_offset / row_width) * object_width - row_width/2;

      scene.add(object);

      console.log('Finished loading ' + index);
    }).catch(console.log.bind(console));
  })(i);
}

function render() {
	requestAnimationFrame(render);
	renderer.render(scene, camera);
}
render();
