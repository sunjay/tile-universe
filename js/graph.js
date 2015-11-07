function Graph() {
  this.nodes = {};
}

Graph.idx = Math.floor(Math.random() * 203);
Graph.uniqueId = function() {
  return ++Graph.idx;
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

Graph.prototype.connect = function(node1, node2) {
  node1.addAdjacent(node2);
  node2.addAdjacent(node1);
};

Graph.prototype.nodesWithMaterial = function(materialName) {
  return Object.keys(this.nodes).filter(function(nid) {
    return this.getNode(nid).material === materialName;
  }.bind(this));
};

/**
 * Merges node 2 into node 1 and removes node 2
 */
Graph.prototype.merge = function(node1, node2) {
  if (node1.material !== node2.material) {
    throw new Error("Attempt to merge two different materials");
  }
  if (node1.id === node2.id) {
    throw new Error("Attempt to merge the same node");
  }

  node1.position.add(node2.position).divideScalar(2);

  node2.adjacents.forEach(function(aid) {
    if (aid !== node1.id) {
      var adj = this.getNode(aid);
      if (!adj) {
        throw new Error("Expected the adjacent with ID = " + aid + " to exist (node ID = " + this.id + ")");
        return;
      }
      this.connect(node1, adj);
    }
  }.bind(this));

  this.remove(node2);
};

Graph.prototype.remove = function(node) {
  node.adjacents.forEach(function(aid) {
    var adj = this.getNode(aid);
    adj.removeAdjacent(node);
  }.bind(this));

  delete this.nodes[node.id];
};

/**
 * Merges nearby nodes of the same material
 * Results in a more connected graph with fewer nodes
 */
Graph.prototype.reduce = function() {
  console.log("Original graph size:", Object.keys(this.nodes).length);

  // Any nodes closer than this threshold will be merged
  var reductionThreshold = 0.1;

  this.nodeIds().forEach(function(nid1) {
    var node = this.getNode(nid1);
    if (!node) {
      return;
    }

    this.nodeIds().forEach(function(nid2) {
      if (nid1 === nid2) {
        return;
      }
      var other = this.getNode(nid2);
      var distance = node.position.distanceTo(other.position);

      if (node.material === other.material && distance < reductionThreshold) {
        this.merge(node, other);
      }
    }.bind(this));
  }.bind(this));

  console.log("Reduced graph size:", Object.keys(this.nodes).length);
};

function Node(id, position, material) {
  this.id = id;
  this.position = position;
  this.material = material;
  this.adjacents = [];
}

Node.prototype.addAdjacent = function(node) {
  if (!node.id) {
    throw new Error("No node ID");
  }
  if (node.id === this.id) {
    throw new Error("Attempt to add self as adjacent");
  }
  if (this.adjacents.indexOf(node.id) >= 0) {
    return;
  }
  this.adjacents.push(node.id);
};

Node.prototype.removeAdjacent = function(node) {
  var index = this.adjacents.indexOf(node.id);
  if (index < 0) {
    throw new Error("Attempt to remove adjacent that is not an adjacent");
  }
  return this.adjacents.splice(index, 1)[0];
};
