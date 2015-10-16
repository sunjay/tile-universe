var TILE_SIZE = 3;
var GRID_LINES = 20;
var GRID_SIZE = TILE_SIZE * GRID_LINES;
var HEIGHT_DELTA = 0.10;

var editor = {
  scene: null,
  renderer: null,
  camera: null,

  raycaster: null,
  modelsGroup: null,
  groundPlane: null,

  history: null,

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

    this.history = new HistoryQueue();

    this.populateTilesPanel();
    this.addGridAndAxis();

    this.setupControls();
    this.disableControls();

    this.bindEvents();

    if (!this.loadLocal()) {
      this.loadRemote("examples/park.json");
    }
  },

  populateTilesPanel: function() {
    xr.get('models/index.json').then(function(index) {
      var tiles = index.tiles;

      var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
      tiles.forEach(function(tileData) {
        var tile = document.createElement('li');
        tile.dataset.name = tileData.name;
        tile.dataset.model = tileData.model;
        tile.addEventListener('mousedown', function(evt) {
          this.mouseStart = new THREE.Vector2(evt.clientX, evt.clientY);
          this.selectTile(tile);
        }.bind(this));

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

    document.getElementById('tile-duplicate').addEventListener('click', this.selectionDuplicate.bind(this));
    document.getElementById('tile-move-up').addEventListener('click', this.selectionMoveUp.bind(this));
    document.getElementById('tile-move-down').addEventListener('click', this.selectionMoveDown.bind(this));
    document.getElementById('tile-rotate').addEventListener('click', this.selectionRotate.bind(this));
    document.getElementById('tile-delete').addEventListener('click', this.selectionDelete.bind(this));

    document.getElementById('tile-undo').addEventListener('click', function() {
      this.clearSelection();
      this.history.undo();
      this.updateUndoRedoButtons();
    }.bind(this));
    document.getElementById('tile-redo').addEventListener('click', function() {
      this.clearSelection();
      this.history.redo();
      this.updateUndoRedoButtons();
    }.bind(this));

    document.getElementById('tile-clear').addEventListener('click', function() {
      if (confirm("Irreversibly clear everything?")) {
        this.clear();
      }
    }.bind(this));
    document.getElementById('tile-export').addEventListener('click', this.saveExportedDocument.bind(this));
    document.getElementById('tile-import').addEventListener('click', this.selectImportFile.bind(this));
    document.getElementById('imported-file').addEventListener('change', this.loadImportFile.bind(this));
  },

  updateUndoRedoButtons: function() {
    document.getElementById('tile-undo').disabled = !this.history.canUndo();
    document.getElementById('tile-redo').disabled = !this.history.canRedo();
  },

  selectionDuplicate: function(evt) {
    if (this.selectedObject) {
      var selected = this.selectedObject;
      this.clearSelection();

      var copy = selected.clone();
      this.modelsGroup.add(copy);

      this.selectObject(copy);

      this.mouseStart = new THREE.Vector2(evt.clientX, evt.clientY);
      this.beginDrag(this.selectedObject);
    }
  },

  selectionMoveUp: function() {
    if (this.selectedObject) {
      var object = this.selectedObject;
      var action = this.createAction(function() {
        object.position.y += HEIGHT_DELTA;
      }.bind(this), function() {
        object.position.y -= HEIGHT_DELTA;
      }.bind(this));
      action.forward();
      this.pushAction(action);
    }
  },

  selectionMoveDown: function() {
    if (this.selectedObject) {
      var object = this.selectedObject;
      var action = this.createAction(function() {
        object.position.y -= HEIGHT_DELTA;
      }.bind(this), function() {
        object.position.y += HEIGHT_DELTA;
      }.bind(this));
      action.forward();
      this.pushAction(action);
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

      var rotation = this.selectedObject.rotation.clone();
      rotation.y -= Math.PI / 2;

      this.moveAndRotate(this.selectedObject, position, rotation);
    }
  },

  selectionDelete: function() {
    if (this.selectedObject) {
      var previousSelection = this.selectedObject;
      this.clearSelection();

      var action = this.createAction(function() {
        this.modelsGroup.remove(previousSelection);
      }.bind(this), function() {
        this.modelsGroup.add(previousSelection);
      }.bind(this));
      action.forward();
      this.pushAction(action);
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

  load: function(model) {
    return models.load(model).then(function(object) {
      object.userData = {
        model: model
      };
      return object;
    });
  },

  selectTile: function(tileElement) {
    var wasSelected = tileElement.classList.contains("selected");

    this.cancel();

    if (!wasSelected) {
      this.deselectAllTiles();
      tileElement.classList.add("selected");

      this.showLoading();
      this.load(tileElement.dataset.model).then(function(object) {
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

    // Need to reset and re-apply rotation before selection so that the box helper is applied properly
    var rotation = this.selectedObject.rotation.clone();
    this.selectedObject.rotation.set(0, 0, 0);

    this.selectionIndicator = new THREE.BoxHelper(this.selectedObject);
    this.selectionIndicator.position.set(-this.selectedObject.position.x, -this.selectedObject.position.y, -this.selectedObject.position.z);
    this.selectedObject.add(this.selectionIndicator);

    this.selectedObject.setRotationFromEuler(rotation);

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
    document.body.classList.add("dragging");
    this.dragTarget = object;
    this.dragOrigin = origin || null;
  },

  cancelDrag: function() {
    if (!this.dragTarget) {
      return;
    }

    // If there is no drag origin, this must be a new object
    if (this.dragOrigin) {
      this.dragTarget.position.set(this.dragOrigin.x, this.dragOrigin.y, this.dragOrigin.z);
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
    document.body.classList.remove("dragging");
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

    var snapStep = TILE_SIZE/6;
    intersection.divideScalar(snapStep).floor().multiplyScalar(snapStep);
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
      evt.preventDefault();
      evt.stopPropagation();

      this.drag(evt.clientX, evt.clientY);
    }.bind(this));

    renderer.domElement.addEventListener('mousedown', this.onmousedown.bind(this));
    renderer.domElement.addEventListener('mouseup', this.onmouseup.bind(this));
  },

  onmousedown: function(evt) {
    if (this.dragTarget) {
      return;
    }
    this.mouseStart = new THREE.Vector2(evt.clientX, evt.clientY);

    var target = this.objectAtMouse(evt.clientX, evt.clientY);
    if (!target) {
      return;
    }

    // Select first, then drag on next click
    if (this.selectedObject === target) {
      this.beginDrag(target, target.position.clone());
      return;
    }
  },

  onmouseup: function(evt) {
    // Click selection if this is a click and not a drag
    var distance = this.mouseStart.distanceTo(new THREE.Vector2(evt.clientX, evt.clientY));
    if (distance <= 10) {
      this.cancelDrag();
      this.clearSelection();
    }

    if (this.dragTarget) {
      if (this.dragOrigin) {
        this.finishMove(this.dragTarget, this.dragOrigin);
      }
      else {
        this.createObject(this.dragTarget);
      }

      this.endDrag();
      return;
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
  },

  finishMove: function(object, start) {
    var newPosition = object.position.clone();
    var oldPosition = start.clone();

    var action = this.createAction(function() {
      object.position.set(newPosition.x, newPosition.y, newPosition.z);
    }, function() {
      object.position.set(oldPosition.x, oldPosition.y, oldPosition.z);
    });
    this.pushAction(action);
  },

  createObject: function(object) {
    var action = this.createAction(function() {
      this.modelsGroup.add(object);
    }.bind(this), function() {
      this.modelsGroup.remove(object);
    }.bind(this));
    this.pushAction(action);
  },

  moveAndRotate: function(object, position, rotation) {
    var oldPosition = object.position.clone();
    var oldRotation = object.rotation.clone();

    var action = this.createAction(function() {
      object.position.set(position.x, position.y, position.z);
      object.rotation.set(rotation.x, rotation.y, rotation.z);
    }.bind(this), function() {
      object.position.set(oldPosition.x, oldPosition.y, oldPosition.z);
      object.rotation.set(oldRotation.x, oldRotation.y, oldRotation.z);
    }.bind(this));
    action.forward();
    this.pushAction(action);
  },

  createAction: function(forward, backward) {
    return HistoryQueue.createAction(function() {
      forward();
      
      this.afterChange();
    }.bind(this), function() {
      backward();
      
      this.afterChange();
    }.bind(this));
  },

  pushAction: function(action) {
    this.history.pushAction(action);
    this.updateUndoRedoButtons();

    this.afterChange();
  },

  afterChange: function() {
    this.saveLocal();
  },

  saveLocal: function() {
    localStorage.setItem("map", JSON.stringify(this.exportDocument()));
  },

  loadLocal: function() {
    var text = (localStorage.getItem("map") || "").trim();
    if (!text) {
      return false;
    }

    var data = JSON.parse(text);
    this.loadDocument(data);

    return true;
  },

  saveExportedDocument: function() {
    var doc = this.exportDocument();
    var content = JSON.stringify(doc, null, 2);
    var blob = new Blob([content], {type: "application/json;charset=utf-8"});
    saveAs(blob, "map.json");
  },

  exportDocument: function() {
    var doc = {tiles: []};
    this.modelsGroup.children.forEach(function(model) {
      doc.tiles.push(Object.assign({}, model.userData, {
        position: model.position.toArray(),
        rotation: model.rotation.toArray()
      }));
    });

    return doc;
  },

  selectImportFile: function() {
    document.getElementById("imported-file").click();
  },

  loadImportFile: function() {
    var fileInput = document.getElementById('imported-file');

    var reader = new FileReader();

    reader.addEventListener('load', function(e) {
      var text = reader.result;
      var data = JSON.parse(text);
      this.loadDocument(data);
    }.bind(this));

    var file = fileInput.files[0];
    reader.readAsText(file);

    fileInput.value = "";
  },

  loadDocument: function(data) {
    this.clear();

    this.showLoading();
    return Promise.all(data.tiles.map(function(tile) {
      return this.load(tile.model).then(function(object) {
        object.position.fromArray(tile.position);
        object.rotation.fromArray(tile.rotation);

        this.modelsGroup.add(object);
      }.bind(this));
    }.bind(this))).then(function() {
      this.hideLoading();
      this.saveLocal();
    }.bind(this));
  },

  loadRemote: function(url) {
    this.showLoading();
    xr.get(url).then(function(data) {
      this.loadDocument(data);
    }.bind(this));
  },

  clear: function() {
    this.clearSelection();
    this.history.clear();
    this.updateUndoRedoButtons();

    var children = this.modelsGroup.children;
    for (var i = children.length - 1; i >= 0; i--) {
      this.modelsGroup.remove(children[i]);
    }

    this.saveLocal();
  }
};

