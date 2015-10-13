var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(10, 5, -10);
camera.lookAt(scene.position);

var light = new THREE.SpotLight(0xFFFFFF, 1, 1000);
light.position.set(100, 100, -100);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEFF, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

controls = new THREE.TrackballControls(camera);

controls.rotateSpeed = 1.4;
controls.zoomSpeed = 2;
controls.panSpeed = 0.8;

controls.noZoom = false;
controls.noPan = false;

controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;

// Setup scene
editor.setup(scene, renderer);

loadModel('roadTile_201').then(scene.add.bind(scene));

function render() {
  controls.update();
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

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize, false);

