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
      tile.title = tileData.name;
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

  return models.load({
    objName: tileElement.dataset.model,
    mtlName: "roadTile",
    optimize: false
  }).then(function(object) {
    scene.add(object);

    selected = {};
    selected.object = object;
    if (!displayInfo) {
      return;
    }
    window.info = tileInfo(object.clone());

    setupDebugObjects(object, selected);

    setTimeout(function() {
      setupDebugPaths(object, selected, info);

      /*setTimeout(function() {
        var refinedNodes = refineGraph(info.nodes, info.boundingBox);
        var refinedInfo = Object.assign({}, info, {nodes: refinedNodes});
        object.remove(selected.debugPaths);
        setupDebugPaths(object, selected, refinedInfo);
        }, 1000);*/
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
      var node = nodes[aid];
      if (seen.has(aid)) {
        var single = new THREE.Geometry();
        single.vertices.push(current.position.clone());
        single.vertices.push(node.position.clone());
        geometries.push(single);
        return;
      }
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

document.addEventListener("keyup", function(evt) {
  if (!selected.object) {
    return;
  }
  switch (evt.keyCode) {
    case 38: // up arrow
      break;
    case 37: // left arrow
      rotateSelection(+1);
      break;
    case 39: // right arrow
      rotateSelection(-1);
      break
      break;
    case 40: // down arrow
      break;
    default:
      break;
  }
});

function rotateSelection(direction) {
  var turn = (new THREE.Quaternion()).setFromAxisAngle(new THREE.Vector3(0, 1, 0), 15*Math.PI/180);
  if (direction < 0) {
    turn.inverse();
  }
  var rotation = selected.object.quaternion.clone().multiply(turn);
  var TILE_SIZE = 3;

  // tiles have their center in the top left corner
  var defaultCenter = new THREE.Vector3(TILE_SIZE/2, 0, -TILE_SIZE/2);
  var centerBefore = defaultCenter.clone().applyQuaternion(selected.object.quaternion)
  var centerAfter = defaultCenter.clone().applyQuaternion(rotation);

  var offsetToCenter = centerBefore.sub(centerAfter);

  selected.object.position.add(offsetToCenter);
  selected.object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  //selected.debugFaces.traverse(function(o) {
  //  if (o instanceof THREE.WireframeHelper) {
  //    var quat = rotation.clone().inverse();
  //    o.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  //  }
  //});
}

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
    // edge hash : [edge node 1, edge node 2, material, face]
    var outsideEdges = {};
    var boundaryEdges = {};
    var seenEdges = new Set();
    applicableFaces(o.geometry.faces).forEach(function(f) {
      var v1 = o.geometry.vertices[f.a];
      var v2 = o.geometry.vertices[f.b];
      var v3 = o.geometry.vertices[f.c];

      var faceHash = [f.a, f.b, f.c].join(';');

      var faceVerts = [v1, v2, v3];
      faceVerts.forEach(function(va) {
        faceVerts.forEach(function(vb) {
          if (va.equals(vb)) {
            return;
          }
          var hashedEdge = hashEdge(va, vb);

          var hashedEdgeAndFace = faceHash + '&' + hashedEdge;
          if (seenEdges.has(hashedEdgeAndFace)) {
            return;
          }
          seenEdges.add(hashedEdgeAndFace);

          if (!boundaryEdges[hashedEdge] && isBoundaryEdge(boundingBox, va, vb)) {
            boundaryEdges[hashedEdge] = true;
          }

          outEdge = outsideEdges[hashedEdge];
          if (!outEdge) {
            outsideEdges[hashedEdge] = [va, vb, o.material.name, f];
          }
          else if (outEdge[3] !== f) {
            // found connected face and therefore not an outside edge
            delete outsideEdges[hashedEdge];
          }
        });
      });
    });

    // vector hash : node ID
    var vertNodes = {};
    Object.keys(outsideEdges).forEach(function(edgeHash) {
      var verts = outsideEdges[edgeHash];
      var va = verts[0];
      var vaHash = hashVector3(va);
      var vb = verts[1];
      var vbHash = hashVector3(vb);
      var material = verts[2];

      var nodeA, nodeB;
      if (!vertNodes[vaHash]) {
        nodeA = new Node(va.clone(), material, boundaryEdges[edgeHash] || false);
        info.nodes[nodeA.id] = nodeA;
        vertNodes[vaHash] = nodeA;
      }
      else {
        nodeA = vertNodes[vaHash];
      }

      if (!vertNodes[vbHash]) {
        nodeB = new Node(vb.clone(), material, boundaryEdges[edgeHash] || false);
        info.nodes[nodeB.id] = nodeB;
        vertNodes[vbHash] = nodeB;
      }
      else {
        nodeB = vertNodes[vbHash];
      }

      nodeA.addAdjacent(nodeB);
      nodeB.addAdjacent(nodeA);
    });
  });
  return info;
}

function refineGraph(nodes, boundingBox) {
  nodes = refineByDistance(nodes, boundingBox);
  nodes = refineByEdgeConnectedNodes(nodes, boundingBox);
  nodes = refineByAngle(nodes, boundingBox);
  nodes = refineByOrphans(nodes, boundingBox);

  return nodes;
}

function refineByDistance(nodes, boundingBox) {
  // Merge adjacent vertices by distance
  var closenessThreshold = 0.38;

  // Technically we should clone nodes here...but oh well!
  Object.keys(nodes).forEach(function(nid) {
    if (!nodes[nid]) {
      return;
    }
    var node = nodes[nid];

    Array.from(node.adjacents).forEach(function(aid) {
      if (!nodes[aid]) {
        return;
      }
      var adj = nodes[aid];

      if (node.position.distanceTo(adj.position) <= closenessThreshold) {
        var originalNodePosition = node.position.clone();

        node.mergeWith(adj, nodes);
        adj.remove(nodes);

        if (isEdgeVertex(boundingBox, originalNodePosition)) {
          node.position = originalNodePosition;
        }
        else if (isEdgeVertex(boundingBox, adj.position)) {
          node.position = adj.position.clone();
        }
      }
    });
  });

  return nodes;
}

function refineByEdgeConnectedNodes(nodes, boundingBox) {
  // Maximizes the number of edge-connected vertices on any node by merging together adjacent vertices that both have more than 1 edge-connection
  // An edge-connected vertex is just a vertex that has a path leading to an edge -- usually when considering two vertices, the other vertex is removed from consideration
  // An edge-connection is just any adjacent that connects to an edge
  var isEdge = function(v) {
    return isEdgeVertex(boundingBox, v);
  };
  var edgeConnections = function(n, seen) {
    seen = seen || new Set();
    seen.add(n.id);
    return n.adjacents.filter(function(aid) {
      var a = nodes[aid];
      if (!a || seen.has(aid)) {
        return false;
      }
      return isEdge(a.position) || edgeConnections(a, seen) > 0;
    }).length;
  };

  Object.keys(nodes).forEach(function(nid) {
    if (!nodes[nid]) {
      return;
    }
    var node = nodes[nid];
    var connections = edgeConnections(node);
    // Two edge connections is just a straight line
    if (isEdge(node.position) || connections <= 2) {
      return;
    }

    Array.from(node.adjacents).forEach(function(aid) {
      if (!nodes[aid]) {
        return;
      }
      var adj = nodes[aid];
      var adjConnections = edgeConnections(adj);
      // Adjacent nodes only require one more edge connection since they
      // are already connected to node
      if (isEdge(adj.position) || adjConnections <= 1) {
        return;
      }

      node.mergeWith(adj, nodes);
      adj.remove(nodes);
    });
  });
  return nodes;
}

function refineByAdjacentEdges(nodes, boundingBox) {
  // Merge adjacent non-edge nodes that both have at least one adjacent edge node or orphan node
  var isEdge = function(v) {
    return isEdgeVertex(boundingBox, v);
  };
  var isOrphan = function(n) {
    return n.adjacents.length === 1;
  };
  var hasEdgeAdjacentsOrOrphans = function(n) {
    return n.adjacents.some(function(aid) {
      return nodes[aid] && (isEdge(nodes[aid].position) || isOrphan(nodes[aid]));
    });
  };

  var seen = new Set();
  Object.keys(nodes).forEach(function(nid) {
    if (!nodes[nid] || seen.has(nid)) {
      return;
    }
    seen.add(nid);
    var node = nodes[nid];
    if (isEdge(node.position) || isOrphan(node) || !hasEdgeAdjacentsOrOrphans(node)) {
      return;
    }

    Array.from(node.adjacents).forEach(function(aid) {
      if (!nodes[aid] || seen.has(aid)) {
        return;
      }
      seen.add(aid);
      var adj = nodes[aid];
      if (isEdge(adj.position) || isOrphan(node) || !hasEdgeAdjacentsOrOrphans(adj)) {
        return;
      }

      node.mergeWith(adj, nodes);
      adj.remove(nodes);
    });
  });
  return nodes;
}

function refineByAngle(nodes, boundingBox) {
  // Merge adjacent node triples that form an angle that isn't traversable by certain characters (too steep turn)
  var maximumAngle = Math.PI/4;

  var isEdge = function(v) {
    return isEdgeVertex(boundingBox, v);
  };

  // p1, p2, p3 below make an arm connected left to right
  // p1---p2---p3 where p2 is the angle vertex of the triple

  Object.keys(nodes).forEach(function(nid) {
    if (!nodes[nid] || isEdge(nodes[nid].position)) {
      return;
    }
    var node = nodes[nid];
    var p1 = node.position;

    var nodeAdjacents = node.adjacents;
    for (var i = 0; i < nodeAdjacents.length; i++) {
      var aid = nodeAdjacents[i];
      if (!nodes[aid] || isEdge(nodes[aid].position)) {
        continue;
      }
      var adj = nodes[aid];
      var p2 = adj.position;

      var merging = false;

      var adjAdjacents = adj.adjacents;
      for (var j = 0; j < adjAdjacents.length; j++) {
        var aid2 = adjAdjacents[j];
        if (node.id === aid2 || !nodes[aid2] || isEdge(nodes[aid2].position)) {
          continue;
        }
        adj2 = nodes[aid2];
        var p3 = adj2.position;

        var vec1 = p1.clone().sub(p2);
        var vec2 = p3.clone().sub(p2);
        var angle = vec1.angleTo(vec2);

        if (angle < maximumAngle) {
          merging = true;

          adj.mergeWith(adj2, nodes);
          adj2.remove(nodes);
          break;
        }
      }

      if (merging) {
          node.mergeWith(adj, nodes);
          adj.remove(nodes);
      }
    };
  });
  return nodes;
}

function refineByOrphans(nodes, boundingBox) {
  // An orphan is a non-edge node with one or less adjacents
  // These aren't usually useful because they don't lead anywhere
  Object.keys(nodes).forEach(function(nid) {
    if (!nodes[nid]) {
      return;
    }
    var node = nodes[nid];
    var adjacents = node.adjacents.filter(function(aid) {
      return !!nodes[aid];
    });
    if (isEdgeVertex(boundingBox, node.position) || adjacents.length > 1) {
      return;
    }
    if (adjacents.length === 0) {
      // useless node
      node.remove(nodes);
      return;
    }

    var adj = nodes[adjacents[0]];
    node.mergeWith(adj, nodes);
    adj.remove(nodes);
  });

  return nodes;
}

function hashVector3(v) {
  return v.toArray().join(",");
}

function hashEdge(a, b) {
  return [[a.x, b.x], [a.y, b.y], [a.z, b.z]].map(hashPair).join(":");
}

function hashPair(p) {
  var a = p[0];
  var b = p[1];
  return ((a < b) ? [a, b] : [b, a]).join(",");
}

function isBoundaryEdge(box, a, b) {
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
function Node(position, material, isBoundary) {
  this.id = idx++;
  this.position = position;
  this.material = material;
  this.isBoundary = isBoundary;
  this.adjacents = [];
}

Node.reset_ids = function() {
  idx = 1;
};

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

Node.prototype.mergeWith = function(node, nodes) {
  if (this.material !== node.material) {
    throw new Error("Attempt to merge two different materials");
  }
  this.position.add(node.position).divideScalar(2);
  //losing face information for other node

  // merge adjacents
  this.adjacents.push.apply(this.adjacents, node.adjacents);
  var adjacentsSet = new Set(this.adjacents);
  adjacentsSet.delete(this.id);
  this.adjacents = Array.from(adjacentsSet);

  Array.from(this.adjacents).forEach(function(aid) {
    var adj = nodes[aid];
    if (!adj) {
      throw new Error("Expected the adjacent with ID = " + aid + " to exist (node ID = " + this.id + ")");
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
      throw new Error("Expected the adjacent with ID = " + aid + " to exist (node ID = " + this.id + ")");
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
  }).catch(function(e) {
    console.error(e);
    alert(e);
    reenableAll();
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
              var node = tileInfo.nodes[nid];
              // a little bit of important error checking
              node.adjacents.forEach(function(aid) {
                if (!tileInfo.nodes[aid]) {
                  throw new Error("Attempt to export " + tileElement.dataset.name + " when node (ID = " + node.id + ") has an adjacent (ID = " + aid + ") that does not exist.");
                }
              });
              return node.toJSON();
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
  return models.load({
    objName: model,
    mtlName: "roadTile",
    optimize: false,
  }).then(function(object) {
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

