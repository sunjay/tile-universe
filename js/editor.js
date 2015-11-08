var TILE_SIZE = 3;
var GRID_LINES = 20;
var GRID_SIZE = TILE_SIZE * GRID_LINES;
var HEIGHT_DELTA = 0.10;

var MODE_EDIT = "edit-mode";
var MODE_PLAY = "play-mode";

var editor = {
  scene: null,
  renderer: null,
  camera: null,

  raycaster: null,
  modelsGroup: null,
  graphGroup: null,
  labelsGroup: null,
  groundPlane: null,

  graph: null,

  mode: null,
  history: null,

  viewportControls: null,

  selectedObject: null,
  selectionIndicator: null,

  dragTarget: null,
  dragOrigin: null,

  mouseStart: null,
  mousePosition: new THREE.Vector2(),

  // Methods
  setup: function(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(this.scene.up);

    this.modelsGroup = new THREE.Group();
    this.scene.add(this.modelsGroup);
    this.graphGroup = new THREE.Group();
    this.graphGroup.position.y += 0.1;
    this.scene.add(this.graphGroup);

    this.history = new HistoryQueue();

    this.enableEditMode();

    this.populateTilesPanel();
    this.addGridAndAxis();

    this.setupControls();
    this.disableControls();

    this.bindEvents();

    if (!this.loadLocal()) {
      this.loadRemote("examples/park.json");
    }
  },

  isPlayMode: function() {
    return this.mode === MODE_PLAY;
  },

  isEditMode: function() {
    return this.mode === MODE_EDIT;
  },

  enableEditMode: function() {
    this.mode = MODE_EDIT;

    var button = document.getElementById("switch-modes");
    button.textContent = "Play";
    button.classList.remove("btn-primary");

    this.hideElements([
      document.getElementsByClassName("view-controls")[0]
    ]);
    this.showElements([
      document.getElementsByClassName("history-controls")[0],
      document.getElementsByClassName("file-controls")[0],
      document.getElementById("tiles-container"),
      document.getElementById("controls-container")
    ]);

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        this.clearGraph();
        this.clearSelection();
        this.removeCar();

        resolve();
      }.bind(this), 1);
    }.bind(this));
  },

  enablePlayMode: function() {
    this.mode = MODE_PLAY;

    var button = document.getElementById("switch-modes");
    button.textContent = "Edit";
    button.classList.add("btn-primary");

    this.showElements([
      document.getElementsByClassName("view-controls")[0]
    ]);
    this.hideElements([
      document.getElementsByClassName("history-controls")[0],
      document.getElementsByClassName("file-controls")[0],
      document.getElementById("tiles-container"),
      document.getElementById("controls-container")
    ]);

    this.clearSelection();

    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        this.generateGraph().then(function(graph) {
          this.graph = graph;

          this.clearGraph();

          this.executeStepsAsync([
            this.displayGraph.bind(this),
            this.displayGraphLabels.bind(this),
            this.displayGraphMaterialLabels.bind(this),
            this.setupCar.bind(this),
            this.toggleGraphVisiblity.bind(this),
            resolve
          ]);
        }.bind(this));
      }.bind(this), 1);
    }.bind(this));
  },

  hideElements: function(elems) {
    elems.forEach(function(e) {
      e.classList.add('hidden');
    });
  },

  showElements: function(elems) {
    elems.forEach(function(e) {
      e.classList.remove('hidden');
    });
  },

  executeStepsAsync: function(steps) {
    var step = function(i) {
      setTimeout(function() {
        var stepFunc = steps[i];
        var returnValue = stepFunc();

        if (!(returnValue instanceof Promise)) {
          returnValue = Promise.resolve(returnValue);
        }

        returnValue.then(function() {
          i += 1;
          if (i < steps.length) {
            step(i);
          }
        });
      }, 1);
    };
    step(0);
  },

  toggleMode: function() {
    this.showLoading();
    var promise;
    if (this.mode === MODE_EDIT) {
      promise = this.enablePlayMode();
    }
    else if (this.mode === MODE_PLAY) {
      promise = this.enableEditMode();
    }
    else {
      throw new Error("You messed up...I don't know how to toggle mode: " + this.mode);
    }
    promise.then(function() {
      this.hideLoading();
    }.bind(this));
  },

  populateTilesPanel: function() {
    models.tiles().then(function(tiles) {
      var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
      tiles.forEach(function(tileData) {
        var tile = document.createElement('li');
        tile.title = tileData.name;
        tile.dataset.name = tileData.name;
        tile.dataset.model = tileData.model;
        tile.addEventListener('mousedown', function(evt) {
          if (!this.isEditMode()) return;
          this.mouseStart = new THREE.Vector2(evt.clientX, evt.clientY);
          this.selectTile(tile);
        }.bind(this));

        var thumb = document.createElement('img');
        thumb.src = tileData.image;

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
    this.setupTileControls();
    this.setupPlayControls();

    document.getElementById('switch-modes').addEventListener('click', this.toggleMode.bind(this));
  },

  setupTileControls: function() {
    document.getElementById('tile-duplicate').addEventListener('click', this.selectionDuplicate.bind(this));
    document.getElementById('tile-move-up').addEventListener('click', this.selectionMoveUp.bind(this));
    document.getElementById('tile-move-down').addEventListener('click', this.selectionMoveDown.bind(this));
    document.getElementById('tile-rotate').addEventListener('click', this.selectionRotate.bind(this));
    document.getElementById('tile-delete').addEventListener('click', this.selectionDelete.bind(this));

    document.getElementById('tile-undo').addEventListener('click', this.undo.bind(this));
    document.getElementById('tile-redo').addEventListener('click', this.redo.bind(this));

    document.getElementById('tile-clear').addEventListener('click', function() {
      if (confirm("Irreversibly clear everything?")) {
        this.clear();
      }
    }.bind(this));
    document.getElementById('tile-export').addEventListener('click', this.saveExportedDocument.bind(this));
    document.getElementById('tile-import').addEventListener('click', this.selectImportFile.bind(this));
    document.getElementById('imported-file').addEventListener('change', this.loadImportFile.bind(this));
  },

  setupPlayControls: function() {
    document.getElementById('play-toggle-graph').addEventListener('click', this.toggleGraphVisiblity.bind(this));
    document.getElementById('play-toggle-labels').addEventListener('click', this.toggleGraphLabelsVisiblity.bind(this));
  },

  updateUndoRedoButtons: function() {
    document.getElementById('tile-undo').disabled = !this.history.canUndo();
    document.getElementById('tile-redo').disabled = !this.history.canRedo();
  },

  selectionDuplicate: function() {
    if (this.selectedObject) {
      var selected = this.selectedObject;
      this.clearSelection();

      var copy = selected.clone();
      this.modelsGroup.add(copy);

      this.selectObject(copy);

      this.mouseStart = this.mousePosition.clone();
      this.beginDrag(this.selectedObject);
    }
  },

  selectionMoveUp: function(event) {
    this.selectionMove(event, HEIGHT_DELTA);
  },

  selectionMoveDown: function(event) {
    this.selectionMove(event, -HEIGHT_DELTA);
  },

  selectionMove: function(event, amount) {
    if (this.selectedObject) {
      var multiplier = 1;
      if (event.shiftKey) {
        multiplier = 4;
      }

      var object = this.selectedObject;
      var action = this.createAction(function() {
        object.position.y += multiplier * amount;
      }.bind(this), function() {
        object.position.y -= multiplier * amount;
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

  undo: function() {
    if (this.history.canUndo()) {
      this.clearSelection();
      this.history.undo();
      this.updateUndoRedoButtons();
    }
  },

  redo: function() {
    if (this.history.canRedo()) {
      this.clearSelection();
      this.history.redo();
      this.updateUndoRedoButtons();
    }
  },

  setupViewportControls: function() {
    var controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    controls.dampingFactor = 5;
    controls.zoomSpeed = 1.2;

    this.viewportControls = controls;
  },

  loadTile: function(model) {
    return models.load({
      objName: model,
      mtlName: "roadTile"
    }).then(this.afterLoad.bind(this, model));
  },

  loadModel: function(model) {
    return models.loadModel(model).then(this.afterLoad.bind(this, model));
  },

  afterLoad: function(model, object) {
    object.userData = {
      model: model
    };
    return object;
  },

  selectTile: function(tileElement) {
    var wasSelected = tileElement.classList.contains("selected");

    this.cancel();

    if (!wasSelected) {
      this.deselectAllTiles();
      tileElement.classList.add("selected");

      this.showLoading();
      this.loadTile(tileElement.dataset.model).then(function(object) {
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
    this.viewportControls.enableRotate = false;
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
    this.viewportControls.enableRotate = true;
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
    if (this.car) {
      this.car.update();
    }
  },

  bindEvents: function() {
    document.addEventListener('keyup', function(evt) {
      if (!this.isEditMode()) return;
      evt = evt || window.event;
      if (evt.keyCode == 27) {
        this.cancel();
        return;
      }
      
      if (this.dragTarget) {
        return;
      }

      switch (evt.keyCode) {
        case 90: // z
          if (evt.ctrlKey && evt.shiftKey) {
            this.redo();
          }
          else if (evt.ctrlKey) {
            this.undo();
          }
          break;
        case 68: // d
          this.selectionDuplicate(evt);
          break;
        case 88: // x
        case 46: // delete
          this.selectionDelete();
          break;
        case 82: // r
          this.selectionRotate();
          break;
        case 74: // j
          this.selectionMoveDown(evt);
          break;
        case 75: // k
          this.selectionMoveUp(evt);
          break;
        default:
          break;
      }
    }.bind(this));

    document.addEventListener('mousemove', function(evt) {
      if (!this.isEditMode()) return;
      evt.preventDefault();
      evt.stopPropagation();

      this.mousePosition.set(evt.clientX, evt.clientY);

      this.drag(evt.clientX, evt.clientY);
    }.bind(this));

    renderer.domElement.addEventListener('mousedown', this.onmousedown.bind(this));
    renderer.domElement.addEventListener('mouseup', this.onmouseup.bind(this));
  },

  onmousedown: function(evt) {
    if (!this.isEditMode()) return;
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
    if (!this.isEditMode()) return;
    if (!this.mouseStart) {
      return;
    }
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
      return this.loadTile(tile.model).then(function(object) {
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
  },

  toggleGraphVisiblity: function() {
    this.graphGroup.visible = !this.graphGroup.visible;
  },

  toggleGraphLabelsVisiblity: function() {
    this.labelsGroup.visible = !this.labelsGroup.visible;
  },

  generateGraph: function() {
    return models.paths().then(function(pathData) {
      var graph = new Graph();
      this.modelsGroup.children.forEach(function(tile) {
        var pathNodes = pathData[tile.userData.model].nodes;

        var originalNodes = {};
        var idMapping = {};
        pathNodes.forEach(function(node) {
          originalNodes[node.id] = node;

          var position = node.position.clone();
          // It is important to apply the rotation first while the position
          // is still relative to the origin
          position.applyEuler(tile.rotation);
          position.add(tile.position);

          var graphNode = graph.createNode(position, node.material);

          idMapping[node.id] = graphNode.id;
        });

        Object.keys(idMapping).forEach(function(originalId) {
          var originalNode = originalNodes[originalId];
          var graphNode = graph.getNode(idMapping[originalId]);
          originalNode.adjacents.forEach(function(aid) {
            graphNode.addAdjacent(graph.getNode(idMapping[aid]));
          });
        });
      });

      graph.reduce();
      return graph;
    }.bind(this));
  },

  clearGraph: function() {
    var children = this.graphGroup.children;
    for (var i = children.length - 1; i >= 0; i--) {
      this.graphGroup.remove(children[i]);
    }
  },
  
  displayGraph: function() {
    var color = 0xFFFF00;

    // Graph nodes
    var nodesGeometry = new THREE.Geometry();
    this.graph.nodeIds().forEach(function(nid) {
      var node = this.graph.getNode(nid);
      nodesGeometry.vertices.push(node.position);
    }.bind(this));

    var nodesMaterial = new THREE.PointsMaterial({color: color, size: 0.3});
    var nodesPoints = new THREE.Points(nodesGeometry, nodesMaterial);
    this.graphGroup.add(nodesPoints);

    // Graph edges
    var graphEdgesMaterial = new THREE.LineBasicMaterial({color: color});

    var seen = new Set();
    this.graph.nodeIds().forEach(function(nid) {
      if (seen.has(nid)) {
        return;
      }

      var node = this.graph.getNode(nid);
      var edgesGeometries = this.graphPathEdgeGeometries(node, seen);
      edgesGeometries.forEach(function(geo) {
        this.graphGroup.add(new THREE.Line(geo, graphEdgesMaterial));
      }.bind(this));
    }.bind(this));
  },

  displayGraphLabels: function() {
    var textMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

    var textGeometry = new THREE.Geometry();
    this.graph.nodeIds().forEach(function(nid) {
      var node = this.graph.getNode(nid);
      // Add a label
      var textObj = this.createTextLabel(nid.toString(), textMaterial);
      var textBox = new THREE.Box3().setFromObject(textObj);
      var width = Math.abs(textBox.max.z - textBox.min.z);
      var height = Math.abs(textBox.max.x - textBox.min.x);

      textObj.position.set(node.position.x - height/2, node.position.y + 0.1, node.position.z + width/2);

      textGeometry.mergeMesh(textObj);
    }.bind(this));

    var textMesh = new THREE.Mesh(this.bufferGeometry(textGeometry), textMaterial);
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.visible = false;
    this.labelsGroup.add(textMesh);
    this.graphGroup.add(this.labelsGroup);
  },

  displayGraphMaterialLabels: function() {
    var textMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

    var textGeometry = new THREE.Geometry();
    this.graph.nodeIds().forEach(function(nid) {
      var node = this.graph.getNode(nid);
      // Add a label
      var textObj = this.createTextLabel(node.material, textMaterial);
      var textBox = new THREE.Box3().setFromObject(textObj);
      var width = Math.abs(textBox.max.z - textBox.min.z);
      var height = Math.abs(textBox.max.x - textBox.min.x);

      textObj.position.set(node.position.x + height, node.position.y + 0.1, node.position.z + width/2);

      textGeometry.mergeMesh(textObj);
    }.bind(this));

    var textMesh = new THREE.Mesh(this.bufferGeometry(textGeometry), textMaterial);
    this.labelsGroup.add(textMesh);
  },

  bufferGeometry: function(geometry) {
    return (new THREE.BufferGeometry()).fromGeometry(geometry);
  },

  createTextLabel: function(content, textMaterial) {
    var text = new THREE.TextGeometry(content, {size: 0.2, height: 0.05, curveSegments: 2});
    var textObj = new THREE.Mesh(text, textMaterial);
    textObj.rotation.set(Math.PI/2, Math.PI, -Math.PI/2)

    return textObj;
  },

  graphPathEdgeGeometries: function(start, seen) {
    var geometry = new THREE.Geometry();
    var geometries = [geometry];

    var current = start;
    while (current) {
      geometry.vertices.push(current.position.clone());
      seen.add(current.id);

      var next = 0;
      while (next < current.adjacents.length && seen.has(current.adjacents[next])) {
        next += 1;
      }

      current.adjacents.forEach(function(aid, index) {
        if (index === next) {
          return;
        }
        var node = this.graph.getNode(aid);
        if (seen.has(aid)) {
          var single = new THREE.Geometry();
          single.vertices.push(current.position.clone());
          single.vertices.push(node.position.clone());
          geometries.push(single);
          return;
        }
        var nodeGeometries = this.graphPathEdgeGeometries(node, seen);
        nodeGeometries[0].vertices.unshift(current.position.clone());
        geometries.push.apply(geometries, nodeGeometries);
      }.bind(this));

      current = this.graph.getNode(current.adjacents[next]);
    }

    return geometries;
  },

  setupCar: function() {
    if (this.car) {
      this.placeCar();
      return Promise.resolve(this.car);
    }

    return this.loadModel("car1").then(function(car) {
      this.car = new CarActor(car, this.graph);
      this.placeCar();
    }.bind(this));
  },

  placeCar: function() {
    var asphaltNodes = this.graph.nodesWithMaterial("Asphalt");
    if (asphaltNodes.length <= 2) {
      return;
    }
    var randomIndex = Math.floor(Math.random() * (asphaltNodes.length - 1));
    var randomNode = this.graph.getNode(asphaltNodes[randomIndex]);
    this.car.position.set(randomNode.position.x, randomNode.position.y, randomNode.position.z);
    // Set direction towards an adjacent
    if (randomNode.adjacents) {
      var adjacent = this.graph.getNode(randomNode.adjacents[0])
      this.car.lookAt(adjacent.position);
    }

    this.car.wander();

    this.scene.add(this.car.object);
  },

  removeCar: function() {
    this.scene.remove(this.car);
  }
};

