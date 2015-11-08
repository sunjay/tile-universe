function CarActor(object, graph) {
  this.object = object;
  this.graph = graph;

  this.behaviour = null;
  this.behaviourData = {};
  this.speed = 0.25;

  this.targetPosition = null;

  Object.defineProperty(this, "forward", {
    enumerable: true,
    get: function() {
      return new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
    }.bind(this)
  });
  Object.defineProperty(this, "position", {
    enumerable: true,
    get: function() {
      return this.object.position;
    }.bind(this)
  });
  Object.defineProperty(this, "rotation", {
    enumerable: true,
    get: function() {
      return this.object.rotation;
    }.bind(this)
  });
}

CarActor.prototype.update = function() {
  if (this.behaviour) {
    this.behaviour();
  }
  if (this.targetPosition) {
    var newPos = this.position.clone().lerp(this.targetPosition, this.speed);
    this.lookAt(newPos);
    this.position.set(newPos.x, newPos.y, newPos.z);
  }
};

CarActor.prototype.lookAt = function() {
  return this.object.lookAt.apply(this.object, arguments);
};

CarActor.prototype.stop = function() {
  this.behaviour = null;
  this.targetPosition = null;
  this.behaviourData = {};
};

CarActor.prototype.wander = function() {
  this.stop();

  this.behaviour = this.updateWander.bind(this);
  this.behaviourData.path = [];
};

CarActor.prototype.updateWander = function() {
  // The distance to the target at which to move on to the next target
  var moveOnDistance = 0.1;
  // The number of nodes to plan ahead in the path
  // This should be enough so that we don't run out if multiple path items are shifted at once (i.e. if nodes are very close to each other)
  var lookAhead = 5;
  // The maximum rotation this actor can make
  var maximumTurn = Math.PI/3;

  if (!this.targetPosition) {
    this.behaviourData.targetNode = this.graph.nearestTo(this.position, "Asphalt");
    this.targetPosition = this.behaviourData.targetNode.position;
  }

  while (this.position.distanceTo(this.targetPosition) < moveOnDistance) {
    if (!this.behaviourData.path.length) {
      break;
    }
    var targetNodeId = this.behaviourData.path.shift();
    this.behaviourData.targetNode = this.graph.getNode(targetNodeId);
    this.targetPosition = this.behaviourData.targetNode.position;
  }

  var path = this.behaviourData.path;
  while (path.length < lookAhead) {
    var lastNode, forward;
    if (path.length) {
      var lastId = path[path.length - 1];
      lastNode = this.graph.getNode(lastId);

      var beforeLastId = path[path.length - 2];
      var beforeLastNode = this.graph.getNode(beforeLastId) || this.behaviourData.targetNode;
      forward = lastNode.position.clone().sub(beforeLastNode.position);
    }
    else {
      lastNode = this.behaviourData.targetNode;
      forward = this.forward;
    }

    var options = [];
    lastNode.adjacents.forEach(function(aid) {
      var adj = this.graph.getNode(aid);
      var vecTo = adj.position.clone().sub(lastNode.position);
      var angle = forward.angleTo(vecTo);
      if (angle < maximumTurn) {
        options.push(aid);
      }
    }.bind(this));

    if (!options.length) {
      var message = "No where to go from node " + lastNode.id;
      if (lastNode.adjacents.length) {
        console.warn(message);
      }
      else {
        throw new Error(message);
      }
    }
    var randomIndex = Math.random() * (options.length - 1);
    var nextId = options[randomIndex] || lastNode.adjacents[0];

    if (this.targetPosition) {
      path.push(nextId);
    }
    else {
      var nextNode = this.graph.getNode(nextId);
      this.behaviourData.targetNode = nextNode;
      this.targetPosition = nextNode.position;
    }
  }
};

