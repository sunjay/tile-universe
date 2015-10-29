var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(0, 12, 0);
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

setup();

function render() {
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

function setup() {
  models.tiles().then(function(tiles) {
    var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
    tiles.forEach(function(tileData) {
      var tile = document.createElement('li');
      tile.dataset.name = tileData.name;
      tile.dataset.model = tileData.model;
      tile.addEventListener('click', function(evt) {
        var children = tilesParent.getElementsByClassName("selected");
        for (var i = 0; i < children.length; i++) {
          var child = children.item(i);
          child.classList.remove("selected");

          select(tileData);
        }

        tile.classList.add("selected");
      });

      var thumb = document.createElement('img');
      thumb.src = tileData.image;

      tile.appendChild(thumb);
      tilesParent.appendChild(tile);
    }.bind(this));
  }.bind(this));
}

