var TILE_SIZE = 3;
var GRID_LINES = 17;
var GRID_SIZE = TILE_SIZE * GRID_LINES;

var editor = {
  scene: null,
  renderer: null,

  viewportControls: null,
  objectControls: null,

  // Methods
  setup: function(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;

    this.populateTilesPanel();
    this.addGridAndAxis();

    this.setupControls(camera);
  },

  populateTilesPanel: function() {
    xr.get('models/index.json').then(function(index) {
      var tiles = index.tiles;

      var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
      tiles.forEach(function(tileData) {
        var tile = document.createElement('li');
        tile.dataset.name = tileData.name;
        tile.dataset.model = tileData.model;

        var thumbnail = URI("models/").filename(tileData.image).toString();
        var thumb = document.createElement('img');
        thumb.src = thumbnail;

        tile.appendChild(thumb);
        tilesParent.appendChild(tile);
      });
    });
  },

  addGridAndAxis: function() {
    var axisHelper = new THREE.AxisHelper(52);
    axisHelper.position.z = 0.02;
    this.scene.add(axisHelper);

    var gridHelper = new THREE.GridHelper(GRID_SIZE, TILE_SIZE);
    this.scene.add(gridHelper);
  },

  setupControls: function(camera) {
    this.setupViewportControls(camera);
    this.setupObjectControls(camera);
  },

  setupViewportControls: function(camera) {
    controls = new THREE.TrackballControls(camera, this.renderer.domElement);

    controls.rotateSpeed = 1.4;
    controls.zoomSpeed = 2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    this.viewportControls = controls;
  },

  setupObjectControls: function(camera) {
    var controls = new THREE.TransformControls(camera, this.renderer.domElement);
    this.objectControls = controls;
  },

  update: function() {
    this.viewportControls.update();
    this.objectControls.update();
  }
};
