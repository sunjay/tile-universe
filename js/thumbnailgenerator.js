var WINDOW_WIDTH = 500;
var WINDOW_HEIGHT = 500;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, WINDOW_WIDTH / WINDOW_HEIGHT, 0.1, 1000);
camera.position.set(4, 2, -4);
camera.lookAt(scene.position);

var light = new THREE.SpotLight(0xFFFFFF, 1, 100);
light.position.set(10, 10, -10);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEEE, 1);
//document.getElementById("main-container").appendChild(renderer.domElement);

// Setup scene
function generateThumbnails() {
  models.clearModelsCache();
  clearThumbnails();
  return models.tiles().then(function(tiles) {
    return Promise.all(tiles.map(function(tile) {
      return models.load({
        objName: tile.model,
        mtlName: "roadTile"
      }).then(function(object) {
        scene.add(object);
        render();

        var data = renderer.domElement.toDataURL("image/png");
        var img = document.createElement("img");
        img.width = 150;
        img.src = data;
        img.dataset.name = tile.model + '.png';

        document.getElementById('tiles').appendChild(img);

        scene.remove(object);

        console.log("Finished making", tile.model);
      });
    }));
  });
}

function clearThumbnails() {
  document.getElementById('tiles').innerHTML = '';
}

var previousPromise = generateThumbnails().then(function() {
  console.log("Done!");
  previousPromise = null;
});

document.getElementById('thumbnails-generate').addEventListener('click', function() {
  if (previousPromise) {
    alert("Currently in the middle of generating");
    return;
  }
  previousPromise = generateThumbnails().then(function() {
    console.log("Done!");
    previousPromise = null;
  });
});

document.getElementById('thumbnails-export').addEventListener('click', function saveAll() {
  var zip = new JSZip();

  var tiles = document.getElementById('tiles').children;
  for (var i = 0; i < tiles.length; i++) {
    var tile = tiles[i];
    zip.file(tile.dataset.name, tile.src.substr(tile.src.indexOf(',')+1), {base64: true});
  }

  console.log("Generated zip with " + tiles.length + " items");

  var content = zip.generate({type: "blob"});
  saveAs(content, "tiles.zip");
});

function render() {
	renderer.render(scene, camera);
}
