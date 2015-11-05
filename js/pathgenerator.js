var WINDOW_WIDTH = windowWidth();
var WINDOW_HEIGHT = windowHeight();

var Y_AXIS = new THREE.Vector3(0, 1, 0);

var views = [
  {
    left: 0.5,
    bottom: 0,
    width: 0.5,
    height: 1.0,
    position: new THREE.Vector3(3, 10, -1),
    target: function() {
      return this.position.clone().setY(0);
    }
  },
  {
    left: 0,
    bottom: 0,
    width: 0.5,
    height: 1.0,
    position: new THREE.Vector3(10, 5, -10),
    target: function() {
      return scene.position.clone().setY(scene.position.y - 2);
    }
  },
];

var scene = new THREE.Scene();
views.forEach(function(view) {
  var width = WINDOW_WIDTH * view.width;
  var height = WINDOW_HEIGHT * view.height;
  var camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 1000);
  camera.zoom = 60;
  camera.position.set(view.position.x, view.position.y, view.position.z);

  view.camera = camera;
});

var light = new THREE.PointLight(0xffffff, 0.5, 1000);
light.position.set(100, 500, -100);
scene.add(light);

var light2 = new THREE.PointLight(0xffffff, 0.5, 1000);
light2.position.set(-100, 500, 100);
scene.add(light2);

var axisHelper = new THREE.AxisHelper(52);
axisHelper.position.z = 0.02;
scene.add(axisHelper);

var gridHelper = new THREE.GridHelper(20 * 3, 3);
scene.add(gridHelper);

var renderer = new THREE.WebGLRenderer();
renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);
renderer.setClearColor(0xEEEEFF, 1);
document.getElementById("main-container").appendChild(renderer.domElement);

setup();

function render() {
  renderer.setSize(WINDOW_WIDTH, WINDOW_HEIGHT);

  views.forEach(function(view) {
    var camera = view.camera;

    var width = Math.floor(WINDOW_WIDTH * view.width);
    var height = Math.floor(WINDOW_HEIGHT * view.height);

    var left = Math.floor(WINDOW_WIDTH  * view.left);
    var bottom = Math.floor(WINDOW_HEIGHT * view.bottom);

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);
    renderer.enableScissorTest(true);

    camera.left = -width/2;
    camera.right = width/2;
    camera.top = height/2;
    camera.bottom = -height/2;
    camera.lookAt(view.target());

    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  });
}

function loop() {
  requestAnimationFrame(loop);
  render();
}
loop();

function windowWidth() {
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
}

function windowHeight() {
  return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
}

function onWindowResize(event) {
  var WINDOW_WIDTH = windowWidth();
  var WINDOW_WIDTH = windowHeight();
}
window.addEventListener('resize', onWindowResize, false);

function setup() {
  models.tiles().then(function(tiles) {
    var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
    tiles.forEach(function(tileData) {
      var tile = document.createElement('li');
      tile.dataset.name = tileData.name;
      tile.dataset.model = tileData.model;
      tile.addEventListener('click', function(evt) {
        select(tile);
      });

      var thumb = document.createElement('img');
      thumb.src = tileData.image;

      tile.appendChild(thumb);
      tilesParent.appendChild(tile);
    }.bind(this));
  }.bind(this));
}

var selected = {};
function select(tileElement, displayInfo) {
  displayInfo = displayInfo === undefined ? true : displayInfo;
  if (selected.object) {
    scene.remove(selected.object);
    selected = {};
  }
  var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
  var children = tilesParent.getElementsByClassName("selected");
  for (var i = 0; i < children.length; i++) {
    var child = children.item(i);
    child.classList.remove("selected");
  }
  tileElement.classList.add("selected");

  return models.load(tileElement.dataset.model).then(function(object) {
    scene.add(object);

    selected = {};
    selected.object = object;
    var info = tileInfo(object.clone());

    if (!displayInfo) {
      return;
    }
    setupDebugObjects(object, selected);

    setTimeout(function() {
      setupDebugPaths(object, selected, info);

      setTimeout(function() {
        var refinedNodes = refineGraph(info.nodes, info.boundingBox);
        var refinedInfo = Object.assign({}, info, {nodes: refinedNodes});
        object.remove(selected.debugPaths);
        setupDebugPaths(object, selected, refinedInfo);
      }, 1000);
    }, 100);
  });
}

function setupDebugObjects(object, selected) {
    var verticesGeometry = new THREE.Geometry();
    var facesGeometry = new THREE.Geometry();
    traverseGeometries(object, function(o) {
      o.geometry.vertices.forEach(function(v) {
        verticesGeometry.vertices.push(v);
      });

      applicableFaces(o.geometry.faces).forEach(function(f) {
        facesGeometry.vertices.push(o.geometry.vertices[f.a].clone());
        var a = facesGeometry.vertices.length - 1;
        facesGeometry.vertices.push(o.geometry.vertices[f.b].clone());
        var b = facesGeometry.vertices.length - 1;
        facesGeometry.vertices.push(o.geometry.vertices[f.c].clone());
        var c = facesGeometry.vertices.length - 1;

        var newFace = new THREE.Face3(a, b, c, f.normal.clone(), f.color.clone(), f.materialIndex);
        facesGeometry.faces.push(newFace);
      });
    });
    var verticesMaterial = new THREE.PointsMaterial({color: 0xFFFF00, size: 0.3});
    var facesMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000});

    var debugVertices = new THREE.Points(verticesGeometry, verticesMaterial);
    object.add(debugVertices);

    var debugFaces = new THREE.Mesh(facesGeometry, facesMaterial);
    var normals = new THREE.FaceNormalsHelper(debugFaces, 2, 0x0000FF, 2);
    debugFaces.add(normals);
    var edges = new THREE.WireframeHelper(debugFaces, 0xFFFF00);
    edges.position.y += 0.1;
    debugFaces.add(edges);

    object.add(debugFaces);

    selected.debugVertices = debugVertices;
    selected.debugFaces = debugFaces;
}

function setupDebugPaths(object, selected, info) {
  var color = 0x00FF00;
  var textMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

  var graph = new THREE.Group();
  graph.position.y += 0.1;

  var debugLabels = new THREE.Group();
  debugLabels.visible = false;
  graph.add(debugLabels);

  var nodesGeometry = new THREE.Geometry();
  Object.keys(info.nodes).forEach(function(nid) {
    var node = info.nodes[nid];
    nodesGeometry.vertices.push(node.position);

    var text = new THREE.TextGeometry(nid.toString(), {size: 0.2, height: 0.05});
    var textObj = new THREE.Mesh(text, textMaterial);
    textObj.rotation.set(Math.PI/2, Math.PI, -Math.PI/2)
    textObj.position.set(node.position.x + 0.1, node.position.y + 0.1, node.position.z + 0.1);
    debugLabels.add(textObj);
  });

  var nodesMaterial = new THREE.PointsMaterial({color: color, size: 0.3});

  var nodes = new THREE.Points(nodesGeometry, nodesMaterial);
  graph.add(nodes);

  var pathEdgeMaterial = new THREE.LineBasicMaterial({color: color});

  var seen = new Set();
  Object.keys(info.nodes).forEach(function(nid) {
    if (seen.has(nid)) {
      return;
    }

    var node = info.nodes[nid];
    var pathEdgeGeometries = graphPathEdges(info.nodes, node, seen);
    pathEdgeGeometries.forEach(function(geo) {
      graph.add(new THREE.Line(geo, pathEdgeMaterial));
    });
  });

  object.add(graph);
  selected.debugPaths = graph;

  selected.debugLabels = debugLabels;
}

function graphPathEdges(nodes, start, seen) {
  var geometry = new THREE.Geometry();
  var geometries = [geometry];

  var current = start;
  while (current) {
    geometry.vertices.push(current.position.clone());
    seen.add(current.id);

    var next = 0;
    while (next < current.adjacents.length && seen.has(current.adjacents[next])) {
      next += 1;
    }

    current.adjacents.slice(next + 1).forEach(function(aid) {
      if (seen.has(aid)) {
        return;
      }
      var node = nodes[aid];
      var nodeGeometries = graphPathEdges(nodes, node, seen);
      nodeGeometries[0].vertices.unshift(current.position.clone());
      geometries.push.apply(geometries, nodeGeometries);
    });

    current = nodes[current.adjacents[next]];
  }

  return geometries;
}

document.getElementById("debug-faces").addEventListener("click", function() {
  if (selected.debugFaces) {
    selected.debugFaces.visible = !selected.debugFaces.visible;
  }
});

document.getElementById("debug-vertices").addEventListener("click", function() {
  if (selected.debugVertices) {
    selected.debugVertices.visible = !selected.debugVertices.visible;
  }
});

document.getElementById("debug-paths").addEventListener("click", function() {
  if (selected.debugPaths) {
    selected.debugPaths.visible = !selected.debugPaths.visible;
  }
});

document.getElementById("debug-labels").addEventListener("click", function() {
  if (selected.debugLabels) {
    selected.debugLabels.visible = !selected.debugLabels.visible;
  }
});

function applicableFaces(faces) {
  return faces.filter(function(face) {
    // Returns if the face is in any way upright
    return Math.abs(Y_AXIS.angleTo(face.normal)) < Math.PI/2;
  });
}

function traverse(object, callback) {
  callback(object);

  object.children.forEach(function(child) {
    traverse(child, callback);
  });
}

function traverseGeometries(object, callback) {
  return traverse(object, function(found) {
    if (found.geometry) {
      callback(found);
    }
  });
}

function tileInfo(target) {
  var info = {nodes: {}, boundingBox: null};
  Node.reset_ids();

  var boundingBox = new THREE.Box3().setFromObject(target);
  info.boundingBox = boundingBox;

  traverseGeometries(target, function(o) {
    // edge hash : related node
    var seenEdges = {};
    applicableFaces(o.geometry.faces).forEach(function(f) {
      var v1 = o.geometry.vertices[f.a];
      var v2 = o.geometry.vertices[f.b];
      var v3 = o.geometry.vertices[f.c];
      var midpoint = v1.clone().add(v2).add(v3).divideScalar(3);

      var node = new Node(midpoint, o.material, f.clone());
      info.nodes[node.id] = node;

      var faceVerts = [v1, v2, v3];
      // This is a little wasteful because each hashedEdge is actually
      // inserted twice
      faceVerts.forEach(function(va) {
        faceVerts.forEach(function(vb) {
          if (va.equals(vb)) {
            return;
          }
          var hashedEdge = hashEdge(va, vb);
          if (!seenEdges[hashedEdge] && isOuterEdge(boundingBox, va, vb)) {
            // create new outer node at the midpoint of this edge
            var edgeMid = va.clone().add(vb).divideScalar(2);
            var edgeNode = new Node(edgeMid, o.material);
            info.nodes[edgeNode.id] = edgeNode;

            node.addAdjacent(edgeNode);
            edgeNode.addAdjacent(node);
          }

          if (seenEdges[hashedEdge] && seenEdges[hashedEdge] !== node) {
            node.addAdjacent(seenEdges[hashedEdge]);
            seenEdges[hashedEdge].addAdjacent(node);
          }
          seenEdges[hashedEdge] = node;
        });
      });
    });
  });
  return info;
}

function refineGraph(nodes, boundingBox) {
  var seen = new Set();

  var closenessThreshold = 0.4;

  // Technically we should clone nodes here...but oh well!
  Object.keys(nodes).forEach(function(nid) {
    if (seen.has(nid) || !nodes[nid]) {
      return;
    }
    var node = nodes[nid];
    seen.add(nid);

    if (isEdgeVertex(boundingBox, node.position)) {
      return;
    }

    node.adjacents.forEach(function(aid) {
      if (seen.has(aid) || !nodes[aid]) {
        return;
      }
      var adj = nodes[aid];
      if (isEdgeVertex(boundingBox, adj.position)) {
        return;
      }

      if (node.position.distanceTo(adj.position) <= closenessThreshold) {
        node.mergeWith(adj, nodes);
        adj.remove(nodes);
      }
    });
  });

  return nodes;
}

function hashEdge(a, b) {
  return [[a.x, b.x], [a.y, b.y], [a.z, b.z]].map(hashPair).join(":");
}

function hashPair(p) {
  var a = p[0];
  var b = p[1];
  return ((a < b) ? [a, b] : [b, a]).join(",");
}

function isOuterEdge(box, a, b) {
  return (a.x === box.min.x && b.x === box.min.x)
    || (a.x === box.max.x && b.x === box.max.x)
    || (a.z === box.min.z && b.z === box.min.z)
    || (a.z === box.max.z && b.z === box.max.z);
}

function isEdgeVertex(box, a) {
  return (a.x === box.min.x
    || a.x === box.max.x
    || a.z === box.min.z
    || a.z === box.max.z);
}

var idx = 1;
function Node(position, material, face) {
  this.id = idx++;
  this.position = position;
  this.material = material;
  this.face = face;
  this.adjacents = [];
}

Node.reset_ids = function() {
  idx = 1;
};

Node.prototype.addAdjacent = function(node) {
  if (!node.id) {
    throw new Error("No node ID");
  }
  if (this.adjacents.indexOf(node.id) >= 0) {
    return;
  }
  this.adjacents.push(node.id);
};

Node.prototype.mergeWith = function(node, nodes) {
  if (this.material !== node.material) {
    throw new Error("Attempt to merge two different materials");
  }
  this.position.add(node.position).divideScalar(2);
  //losing face information for other node

  // merge adjacents
  this.adjacents.push.apply(this.adjacents, node.adjacents);
  this.adjacents = Array.from(new Set(this.adjacents));

  Array.from(this.adjacents).forEach(function(aid) {
    var adj = nodes[aid];
    if (!adj) {
      this.adjacents.splice(this.adjacents.indexOf(aid), 1);
      return;
    }
    adj.addAdjacent(this);
  }.bind(this));
};

Node.prototype.remove = function(nodes) {
  var id = this.id;
  this.adjacents.forEach(function(aid) {
    var adj = nodes[aid];
    if (!adj) {
      this.adjacents.splice(this.adjacents.indexOf(aid), 1);
      return;
    }
    var index = adj.adjacents.indexOf(id);
    if (index < 0) {
      throw new Error("Attempt to remove adjacent that doesn't exist");
    }
    adj.adjacents.splice(index, 1);
  }.bind(this));
  delete nodes[this.id];
};

Node.prototype.toJSON = function() {
  return {
    id: this.id,
    position: this.position.toArray(),
    material: this.material.name,
    adjacents: this.adjacents
  };
};

/**** Exporting ****/
document.getElementById("export-paths").addEventListener("click", function() {
  disableAll();

  var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
  var tiles = tilesParent.children;

  exportNext(tiles, 0).then(function(exported) {
    console.log("Resulting data");
    console.log(exported);
    var content = JSON.stringify(exported, null, 2);
    var blob = new Blob([content], {type: "application/json;charset=utf-8"});
    reenableAll();
    saveAs(blob, "pathdata.json");
  });

});

function exportNext(tiles, currentIndex, aggregate) {
  aggregate = aggregate || {};
  var tileElement = tiles[currentIndex];

  var tilesParent = document.getElementById("tiles-container").getElementsByClassName("tiles")[0];
  tilesParent.scrollLeft = tileElement.offsetLeft;
  return select(tileElement, false).then(function() {
    return new Promise(function(resolve, reject) {
      setTimeout(function() {
        resolve(processModel(tileElement.dataset.model).then(function(tileInfo) {
          setupDebugPaths(selected.object, selected, tileInfo);
          aggregate[tileElement.dataset.name] = {
            boundingBox: {
              min: tileInfo.boundingBox.min.toArray(),
              max: tileInfo.boundingBox.max.toArray()
            },
            nodes: Object.keys(tileInfo.nodes).map(function(nid) {
              return tileInfo.nodes[nid].toJSON();
            })
          };

          currentIndex++;
          if (currentIndex < tiles.length) {
            return new Promise(function(resolve, reject) {
              setTimeout(function() {
                resolve(exportNext(tiles, currentIndex, aggregate));
              }, 10);
            });
          }
          else {
            return Promise.resolve(aggregate);
          }
        }));
      }, 0);
    });
  });
}

function processModel(model) {
  return models.load(model).then(function(object) {
    var info = tileInfo(object.clone());
    var refinedNodes = refineGraph(info.nodes, info.boundingBox);
    var refinedInfo = Object.assign({}, info, {nodes: refinedNodes});

    return refinedInfo;
  });
}

var disabled = [];
function disableAll() {
  var buttons = document.getElementsByTagName("button");
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    if (!b.disabled) {
      disabled.push(b);
      b.disabled = true;
    }
  }
}

function reenableAll() {
  disabled.forEach(function(b) {
    b.disabled = false;
  });
}

