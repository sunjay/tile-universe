function Graph() {
  this.nodes = {};
}

var idx = Math.floor(Math.random() * 203);
Graph.uniqueId = function() {
  return ++idx;
};

Graph.prototype.nodeIds = function() {
  return Object.keys(this.nodes);
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
 * Merges nearby nodes of the same material
 * Results in a more connected graph with fewer nodes
 */
Graph.prototype.reduce = function() {
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
