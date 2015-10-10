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
//document.getElementById("main-container").appendChild(renderer.domElement);

//controls = new THREE.TrackballControls( camera );
//
//controls.rotateSpeed = 1.0;
//controls.zoomSpeed = 1.2;
//controls.panSpeed = 0.8;
//
//controls.noZoom = false;
//controls.noPan = false;
//
//controls.staticMoving = true;
//controls.dynamicDampingFactor = 0.3;

// Setup scene
var promises = [];
function appendTile(n) {
  var modelName = 'roadTile_' + ('000' + n).slice(-3);
  promises.push(loadModel(modelName).then(function(object) {
    scene.add(object);
    render();

    var data = renderer.domElement.toDataURL("image/png");
    var img = document.createElement("img");
    img.width = 300;
    img.src = data;
    img.dataset.name = modelName + '.png';

    document.getElementById('tiles').appendChild(img);

    scene.remove(object);
  }).catch(console.error.bind(console)));
}
for (var i = 1; i <= 302; i++) {
  appendTile(i);
}

Promise.all(promises).then(console.log("Done!"));

document.getElementById('save-all').onclick = function saveAll() {
  var zip = new JSZip();

  var tiles = document.getElementById('tiles').children;
  for (var i = 0; i < tiles.length; i++) {
    var tile = tiles[i];
    zip.file(tile.dataset.name, tile.src.substr(tile.src.indexOf(',')+1), {base64: true});
  }

  console.log("Generated zip with " + tiles.length + " items");

  var content = zip.generate({type: "blob"});
  saveAs(content, "tiles.zip");
}

function render() {
  //controls.update();
	renderer.render(scene, camera);
}

function loop() {
  requestAnimationFrame(loop);
  render();
}
loop();
