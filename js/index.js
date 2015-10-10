var WINDOW_WIDTH = 600;
var WINDOW_HEIGHT = 400;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(4, 2, -4);
camera.lookAt(scene.position);

var light = new THREE.SpotLight(0xFFFFFF, 1, 100);
light.position.set(10, 10, -10);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xFFFFFF, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

controls = new THREE.TrackballControls( camera );

controls.rotateSpeed = 1.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;

controls.noZoom = false;
controls.noPan = false;

controls.staticMoving = true;
controls.dynamicDampingFactor = 0.3;

// Setup scene

function render() {
  controls.update();
	renderer.render(scene, camera);
}

function loop() {
  requestAnimationFrame(loop);
  render();
}
loop();
