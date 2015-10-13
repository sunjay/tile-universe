var TILE_SIZE = 3;
var GRID_LINES = 20;
var GRID_SIZE = TILE_SIZE * GRID_LINES;

var editor = {
  scene: null,
  renderer: null,
  camera: null,

  raycaster: null,
  modelsGroup: null,
  groundPlane: null,

  viewportControls: null,

  selectedObject: null,
  selectionIndicator: null,

  dragTarget: null,
  dragOrigin: null,

  mouseStart: null,

  // Methods
  setup: function(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.raycaster = new THREE.Raycaster();
    this.modelsGroup = new THREE.Group();
    this.scene.add(this.modelsGroup);
    this.groundPlane = new THREE.Plane(this.scene.up);

    this.populateTilesPanel();
    this.addGridAndAxis();

    this.setupControls();
    this.disableControls();

    this.bindEvents();
  },

  populateTilesPanel: function() {
    xr.get('models/index.json').then(function(index) {
      var tiles = index.tiles;

      var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
      tiles.forEach(function(tileData) {
        var tile = document.createElement('li');
        tile.dataset.name = tileData.name;
        tile.dataset.model = tileData.model;
        tile.onclick = this.selectTile.bind(this, tile);

        var thumbnail = URI("models/").filename(tileData.image).toString();
        var thumb = document.createElement('img');
        thumb.src = thumbnail;

        tile.appendChild(thumb);
        tilesParent.appendChild(tile);
      }.bind(this));
    }.bind(this));
  },

  addGridAndAxis: function() {
    var axisHelper = new THREE.AxisHelper(52);
    axisHelper.position.z = 0.02;
    this.scene.add(axisHelper);

    var gridHelper = new THREE.GridHelper(GRID_SIZE, TILE_SIZE);
    this.scene.add(gridHelper);
  },

  setupControls: function() {
    this.setupViewportControls();

    document.getElementById('tile-move-up').addEventListener('click', this.selectionMoveUp.bind(this));
    document.getElementById('tile-move-down').addEventListener('click', this.selectionMoveDown.bind(this));
    document.getElementById('tile-rotate').addEventListener('click', this.selectionRotate.bind(this));
    document.getElementById('tile-delete').addEventListener('click', this.selectionDelete.bind(this));
  },

  selectionMoveUp: function() {
    if (this.selectedObject) {
      this.selectedObject.position.y += 0.5;
    }
  },

  selectionMoveDown: function() {
    if (this.selectedObject) {
      this.selectedObject.position.y -= 0.5;
    }
  },

  selectionRotate: function() {
    if (this.selectedObject) {
      var rotation = this.selectedObject.rotation.y % (2*Math.PI);
      var cos = Math.round(Math.cos(rotation));
      var sin = Math.round(Math.sin(rotation));

      var offsetToCenter = new THREE.Vector3(TILE_SIZE/2, 0, -TILE_SIZE/2);
      offsetToCenter.x *= cos - sin;
      offsetToCenter.z *= cos + sin;

      var origin = this.selectedObject.position.clone().add(offsetToCenter);
      var relativePosition = this.selectedObject.position.clone().sub(origin);
      relativePosition.set(-relativePosition.z, relativePosition.y, relativePosition.x);
      var position = relativePosition.add(origin);
      this.selectedObject.position.set(position.x, position.y, position.z);

      this.selectedObject.rotation.y -= Math.PI / 2;
    }
  },

  selectionDelete: function() {
    if (this.selectedObject) {
      var previousSelection = this.selectedObject;
      this.clearSelection();

      this.modelsGroup.remove(previousSelection);
    }
  },

  setupViewportControls: function() {
    controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);

    controls.rotateSpeed = 1.4;
    controls.zoomSpeed = 2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    this.viewportControls = controls;
  },

  selectTile: function(tileElement) {
    var wasSelected = tileElement.classList.contains("selected");

    this.cancel();

    if (!wasSelected) {
      this.deselectAllTiles();
      tileElement.classList.add("selected");

      this.showLoading();
      models.load(tileElement.dataset.model).then(function(object) {
        if (this.selectedObject) {
          return;
        }

        this.modelsGroup.add(object);
        this.hideLoading();

        this.selectObject(object);
        this.beginDrag(this.selectedObject);
      }.bind(this));
    }
  },

  deselectAllTiles: function() {
    var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
    var tiles = tilesParent.children;
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("selected");
    }
  },

  cancel: function() {
    // There is a very specific order to these cancellations
    if (this.dragTarget) {
      this.cancelDrag();
      return;
    }

    if (this.selectedObject) {
      this.clearSelection();
      return;
    }

    this.deselectAllTiles();
  },

  selectObject: function(object) {
    this.selectedObject = object;

    this.selectionIndicator = new THREE.BoxHelper(this.selectedObject);
    this.selectionIndicator.position.set(-this.selectedObject.position.x, -this.selectedObject.position.y, -this.selectedObject.position.z);
    this.selectedObject.add(this.selectionIndicator);

    this.enableControls();
  },

  clearSelection: function() {
    if (!this.selectedObject) {
      return;
    }

    this.selectedObject.remove(this.selectionIndicator);
    this.selectedObject = null;

    this.disableControls();
  },

  beginDrag: function(object, origin) {
    this.viewportControls.noRotate = true;
    renderer.domElement.classList.add("dragging");
    this.dragTarget = object;
    this.dragOrigin = origin || null;
  },

  cancelDrag: function() {
    if (!this.dragTarget) {
      return;
    }

    // If there is no drag origin, this must be a new object
    if (this.dragOrigin) {
      this.dragTarget.position = this.dragOrigin;
    }
    else {
      this.clearSelection();
      this.modelsGroup.remove(this.dragTarget);
    }

    this.endDrag();
  },

  endDrag: function() {
    this.dragTarget = null;
    this.dragOrigin = null;
    renderer.domElement.classList.remove("dragging");
    this.viewportControls.noRotate = false;
    this.deselectAllTiles();
  },

  drag: function(x, y) {
    if (!this.dragTarget) {
      return;
    }

    this.setRaycasterFromMouse(x, y);

    var intersection = this.raycaster.ray.intersectPlane(this.groundPlane);
    if (!intersection) {
      return;
    }

    intersection.multiplyScalar(1/TILE_SIZE).floor().multiplyScalar(TILE_SIZE);
    this.dragTarget.position.set(intersection.x, this.dragTarget.position.y, intersection.z);
  },

  update: function() {
    this.viewportControls.update();
  },

  bindEvents: function() {
    document.addEventListener('keyup', function(evt) {
      evt = evt || window.event;
      if (evt.keyCode == 27) {
        this.cancel();
      }
    }.bind(this));

    document.addEventListener('mousemove', function(evt) {
      this.drag(evt.clientX, evt.clientY);
    }.bind(this));

    renderer.domElement.addEventListener('mousedown', this.onmousedown.bind(this));
    renderer.domElement.addEventListener('mouseup', this.onmouseup.bind(this));
  },

  onmousedown: function(evt) {
    this.mouseStart = new THREE.Vector2(evt.clientX, evt.clientY);
    if (this.dragTarget) {
      return;
    }

    var target = this.objectAtMouse(evt.clientX, evt.clientY);
    if (!target) {
      return;
    }

    // Select first, then drag on next click
    if (this.selectedObject === target) {
      this.beginDrag(target);
      return;
    }
  },

  onmouseup: function(evt) {
    if (this.dragTarget) {
      this.endDrag();
      return;
    }

    // Click selection if this is a click and not a drag
    var distance = this.mouseStart.distanceTo(new THREE.Vector2(evt.clientX, evt.clientY));
    if (distance <= 10) {
      this.clearSelection();
    }

    var target = this.objectAtMouse(evt.clientX, evt.clientY);
    if (!target || this.selectedObject === target) {
      return;
    }

    this.clearSelection();
    this.selectObject(target);
  },

  showLoading: function() {
    document.getElementById("loading").style.display = "block";
  },

  hideLoading: function() {
    document.getElementById("loading").style.display = "none";
  },

  enableControls: function() {
    var controls = document.getElementById('controls-container').getElementsByClassName('controls')[0].children;
    for (var i = 0; i < controls.length; i++) {
      controls[i].disabled = false;
    }
  },

  disableControls: function() {
    var controls = document.getElementById('controls-container').getElementsByClassName('controls')[0].children;
    for (var i = 0; i < controls.length; i++) {
      controls[i].disabled = true;
    }
  },

  objectAtMouse: function(x, y) {
    this.setRaycasterFromMouse(x, y);

    var selectionGroup = this.modelsGroup.children;
    var intersect = this.raycaster.intersectObjects(selectionGroup, true)[0];
    if (!intersect) {
      return null;
    }

    intersect = intersect.object;
    while (selectionGroup.indexOf(intersect) < 0 && intersect.parent) {
      intersect = intersect.parent;
    }

    return intersect;
  },

  setRaycasterFromMouse: function(x, y) {
    // Normalizing coordinates to values between -1 and 1
    var mouse = new THREE.Vector2();
    mouse.x = 2 * (x / this.renderer.domElement.width) - 1;
    mouse.y = 1 - 2 * (y / this.renderer.domElement.height);

    this.raycaster.setFromCamera(mouse, this.camera);
  }
};
