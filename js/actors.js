function CarActor(object, graph) {
  this.object = object;
  this.graph = graph;

  this.targetPosition = null;
  this.behaviour = null;
  this.behaviourData = {};

  this.speed = 0.1; // units/frame
  this.rotationFactor = 0.15; // spherical linear interpolation factor
  this.maxTurn = Math.PI/3;

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
  Object.defineProperty(this, "quaternion", {
    enumerable: true,
    get: function() {
      return this.object.quaternion;
    }.bind(this)
  });

  this.forwardHelper = new THREE.ArrowHelper(this.forward, new THREE.Vector3(0, 1, 0), 1, 0xff0000);
  this.object.add(this.forwardHelper);

  this.targetPositionHelper = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 2, 0x0000ff);
  this.object.add(this.targetPositionHelper);
}

CarActor.prototype.update = function() {
  if (this.behaviour) {
    this.behaviour();
  }
  if (this.targetPosition) {
    var vecTo = this.targetPosition.clone().sub(this.position).normalize();
    var forward = this.forward;
    vecTo.y = this.forward.y;

    var angle = forward.angleTo(vecTo);

    // special case where 180 degree turn is required
    var movement;
    if (Math.abs(angle - Math.PI) < 0.05) {
      movement = forward.clone().applyEuler(new THREE.Euler(0, Math.PI/180, 0));
    }
    else {
      movement = forward.clone().lerp(vecTo, this.rotationFactor);
    }
    movement.setLength(this.speed);
    movement.y = 0;

    var newPos = this.position.clone().add(movement);
    this.lookAt(newPos);

    if (angle <= this.maxTurn) {
      this.position.set(newPos.x, newPos.y, newPos.z);
    }

    // for debugging
    var targetVector = vecTo.clone();
    targetVector.applyQuaternion(this.quaternion.clone().conjugate());
    this.targetPositionHelper.setDirection(targetVector);
  }
  else {
    this.targetPositionHelper.setDirection(new THREE.Vector3(0, 0, 0));
  }

  this.forwardHelper.setDirection(this.forward.applyQuaternion(this.quaternion.clone().conjugate()));
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
  var moveOnDistance = 0.15;
  // The number of nodes to plan ahead in the path
  // This should be enough so that we don't run out if multiple path items are shifted at once (i.e. if nodes are very close to each other)
  var lookAhead = 5;

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
      if (angle <= this.maxTurn) {
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
    var randomIndex = Math.floor(Math.random() * (options.length - 1));
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

