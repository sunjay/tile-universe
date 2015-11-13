var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();

var scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera(-WINDOW_WIDTH/2, WINDOW_WIDTH/2, WINDOW_HEIGHT/2, -WINDOW_HEIGHT/2, -10000, 10000);
camera.zoom = 20;
camera.updateProjectionMatrix();
camera.position.set(16, 12, -24);
camera.lookAt(scene.position);

var light = new THREE.PointLight(0xffffff, 0.5, 1000);
light.position.set(100, 500, -100);
scene.add(light);

var light2 = new THREE.PointLight(0xffffff, 0.5, 1000);
light2.position.set(-100, 500, 100);
scene.add(light2);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEFF, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

// Setup scene
editor.setup(scene, renderer, camera);

function render() {
  editor.update();
	renderer.render(scene, camera);
}

function loop() {
  requestAnimationFrame(loop);
  render();
}
loop();

function windowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}

function windowHeight() {
  return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
}

function onWindowResize(event) {
  var width = windowWidth();
  var height = windowHeight();

  camera.left = -WINDOW_WIDTH/2;
  camera.right = WINDOW_WIDTH/2;
  camera.top = WINDOW_HEIGHT/2;
  camera.bottom = -WINDOW_HEIGHT/2;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize, false);

