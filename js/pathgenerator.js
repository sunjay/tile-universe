var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();

var views = [
  {
    left: 0.5,
    bottom: 0,
    width: 0.5,
    height: 1.0,
    position: new THREE.Vector3(3, 10, -1),
    target: function() {
      return this.position.clone().setY(0);
    }
  },
  {
    left: 0,
    bottom: 0,
    width: 0.5,
    height: 1.0,
    position: new THREE.Vector3(10, 5, -10),
    target: function() {
      return scene.position.clone().setY(scene.position.y - 2);
    }
  },
];

var scene = new THREE.Scene();
views.forEach(function(view) {
  var width = WINDOW_WIDTH * view.width;
  var height = WINDOW_HEIGHT * view.height;
  var camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 1000);
  camera.zoom = 50;
  camera.position.set(view.position.x, view.position.y, view.position.z);

  view.camera = camera;
});

var light = new THREE.PointLight(0xffffff, 0.5, 1000);
light.position.set(100, 500, -100);
scene.add(light);

var light2 = new THREE.PointLight(0xffffff, 0.5, 1000);
light2.position.set(-100, 500, 100);
scene.add(light2);

var axisHelper = new THREE.AxisHelper(52);
axisHelper.position.z = 0.02;
scene.add(axisHelper);

var gridHelper = new THREE.GridHelper(20 * 3, 3);
scene.add(gridHelper);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEFF, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

setup();

function render() {
  renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);

  views.forEach(function(view) {
    var camera = view.camera;

    var width = Math.floor(WINDOW_WIDTH * view.width);
    var height = Math.floor(WINDOW_HEIGHT * view.height);

    var left = Math.floor(WINDOW_WIDTH  * view.left);
    var bottom = Math.floor(WINDOW_HEIGHT * view.bottom);

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);
    renderer.enableScissorTest(true);

    camera.left = -width/2;
    camera.right = width/2;
    camera.top = height/2;
    camera.bottom = -height/2;
    camera.lookAt(view.target());

    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  });
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
  var WINDOW_WIDTH = windowWidth();
  var WINDOW_WIDTH = windowHeight();
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

        }

        tile.classList.add("selected");
        select(tile);
      });

      var thumb = document.createElement('img');
      thumb.src = tileData.image;

      tile.appendChild(thumb);
      tilesParent.appendChild(tile);
    }.bind(this));
  }.bind(this));
}

var selected = null;
function select(tileElement) {
  if (selected) {
    scene.remove(selected);
  }

  return models.load(tileElement.dataset.model).then(function(object) {
    selected = object;
    var info = tileInfo(object.clone());

    var verticesGeometry = new THREE.Geometry();
    traverseGeometries(object, function(o) {
      o.geometry.vertices.forEach(function(v) {
        verticesGeometry.vertices.push(v);
      });
    });
    var verticesMaterial = new THREE.PointsMaterial({color: 0xffff00, size: 0.3});
    var points = new THREE.Points(verticesGeometry, verticesMaterial);
    object.add(points);

    scene.add(object);
  });
}

function traverse(object, callback) {
  callback(object);

  object.children.forEach(function(child) {
    traverse(child, callback);
  });
}

function traverseGeometries(object, callback) {
  return traverse(object, function(found) {
    if (found.geometry) {
      callback(found);
    }
  });
}

function tileInfo(target) {
  traverseGeometries(target, function(object) {
    console.log(object.material.name);
  });
  return {};
}

