function Graph() {
  this.nodes = {};
}

var idx = Math.floor(Math.random() * 203);
Graph.uniqueId = function() {
  return ++idx;
};

Graph.prototype.getNode = function(id) {
  return this.nodes[id];
};

Graph.prototype.createNode = function(position, material) {
  var node = new Node(Graph.uniqueId(), position, material);
  this.nodes[node.id] = node;
  return node;
};

/**
 * Returns an array of THREE.Geometry objects representing
 * the paths throughout the entire graph
 * Multiple geometries are required because THREE represents
 * one line per geometry. In other words, branching is only
 * possible with multiple geometries.
 */
Graph.prototype.toGeometries = function() {
  //TODO
};

function Node(id, position, material) {
  this.id = id;
  this.position = position;
  this.material = material;
  this.adjacents = [];
}

Node.prototype.addAdjacent = function(node) {
  this.adjacents.push(node.id);
};
