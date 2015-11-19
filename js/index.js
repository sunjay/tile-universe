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

// Examples list
var github = new Github({});
var branch = "gh-pages";
var repo = github.getRepo('sunjay', 'tile-universe');
repo.contents(branch, "examples", function(err, contents) {
  var listToggle = document.getElementById("examples-list-toggle");
  if (err) {
    console.error(err);
    listToggle.parentElement.removeChild(listToggle);
    return;
  }

  var examplesList = document.getElementById("examples-list");
  var template = examplesList.getElementsByClassName("template")[0];

  var imageReferences = {};
  contents.forEach(function(file) {
    var basename = file.name.split(".").slice(0, -1).join(".");
    if (file.name.endsWith(".png")) {
      if (imageReferences[basename]) {
        imageReferences[basename].src = file //TODO
      }
    }
    else if (!file.name.endsWith(".json")) {
      return;
    }
    
    var item = template.cloneNode(true);
    item.classList.remove('template');

    var itemButton = item.getElementsByTagName("button")[0]
    itemButton.textContent = file.name;
    itemButton.addEventListener("click", function() {
      if (!confirm("Clear everything and load example?")) {
        return;
      }

      repo.read(branch, file.path, function(err, data) {
        if (err) {
          alert("An error occurred while loading the example. Please refresh the page and try again.");
          console.error(err);
          return;
        }

        data = JSON.parse(data);
        editor.loadDocument(data);

        if (listToggle.classList.contains("active")) {
          listToggle.click();
        }
      });
    });

    var itemLink = item.getElementsByTagName("a")[0];
    itemLink.href = file.html_url;

    examplesList.appendChild(item);
  });
});

var listToggle = document.getElementById("examples-list-toggle");
listToggle.addEventListener("click", function() {
  this.classList.toggle("active");
  document.getElementById("examples-list").classList.toggle("open");
});

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

  camera.left = -width/2;
  camera.right = width/2;
  camera.top = height/2;
  camera.bottom = -height/2;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize, false);

