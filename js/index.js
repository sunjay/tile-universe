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

var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();
var TILE_SIZE = 3;
var GRID_LINES = 17;
var GRID_SIZE = TILE_SIZE * GRID_LINES;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(4, 2, -4);
camera.lookAt(scene.position);

var light = new THREE.SpotLight(0xFFFFFF, 1, 100);
light.position.set(10, 10, -10);
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
var axisHelper = new THREE.AxisHelper(52);
axisHelper.position.z = 0.05;
scene.add(axisHelper);

var gridHelper = new THREE.GridHelper(GRID_SIZE, TILE_SIZE);
scene.add(gridHelper);

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
