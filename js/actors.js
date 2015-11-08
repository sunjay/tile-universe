function CarActor(object, graph) {
  this.object = object;
  this.graph = graph;
  this.behaviour = null;

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
};

CarActor.prototype.lookAt = function() {
  return this.object.lookAt.apply(this.object, arguments);
};

CarActor.prototype.stop = function() {
  this.behaviour = null;
};

CarActor.prototype.wander = function() {
  this.behaviour = this.updateWander.bind(this);

  // setup wander initially
};

CarActor.prototype.updateWander = function() {
};

