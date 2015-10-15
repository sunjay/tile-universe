function HistoryQueue() {
  this.previous = [];
  this.next = [];
}

HistoryQueue.createAction = function(forward, backward) {
  return {
    forward: forward,
    backward: backward
  };
};

HistoryQueue.prototype.processAction = function(action) {
  action.forward();
  this.previous.push(action);
};

HistoryQueue.prototype.undo = function() {
  var action = this.previous.pop();
  action.backward();
  this.next.push(action);
};

HistoryQueue.prototype.redo = function() {
  var action = this.next.pop();
  action.forward();
  this.previous.push(action);
};

HistoryQueue.prototype.canUndo = function() {
  return !!this.previous.length;
};

HistoryQueue.prototype.canRedo = function() {
  return !!this.next.length;
};

