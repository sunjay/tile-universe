var editor = {
  // Methods
  setup: function() {
    this.populateTilesPanel();
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
  }
};
