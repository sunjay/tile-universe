var TILE_SIZE = 3;
var GRID_LINES = 17;
var GRID_SIZE = TILE_SIZE * GRID_LINES;

var editor = {
  scene: null,
  renderer: null,

  viewportControls: null,

  modelCache: {},

  // Methods
  setup: function(scene, renderer, camera) {
    this.scene = scene;
    this.renderer = renderer;
    this.camera = camera;

    this.populateTilesPanel();
    this.addGridAndAxis();

    this.setupControls();

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
    var selected = tileElement.classList.toggle("selected");
    if (selected) {

    }
  },

  cancel: function() {
    alert("Cancel");
  },

  update: function() {
    this.viewportControls.update();
  },

  bindEvents: function() {
    document.onkeydown = function(evt) {
      evt = evt || window.event;
      if (evt.keyCode == 27) {
        this.cancel();
      }
    }.bind(this);
  }
};
