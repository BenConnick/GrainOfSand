/*
*
*
*
*
*
*
*
*
    SERVER AND PAGE REQUESTS
*
*
*
*
*
*
*
*
*
*/

const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.static('client'));
const http = require('http').Server(app);
const socketio = require('socket.io');
const url = require('url');
const path = require('path');
const mongo = require('mongodb').MongoClient;
const assert = require('assert');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// start server listen to all IPs on port
http.listen(port, '0.0.0.0', 511, () => {
  console.log(`listening on *: ${port}`);
  // console.log(`Listening on 127.0.0.1: ${port}`);
});

const url2 = "mongodb://BenConnick:$4Mango@grainofsanddb-shard-00-00-hnyhc.mongodb.net:27017,grainofsanddb-shard-00-01-hnyhc.mongodb.net:27017,grainofsanddb-shard-00-02-hnyhc.mongodb.net:27017/GrainOfSandDB?ssl=true&replicaSet=GrainOfSandDB-shard-0&authSource=admin";

// save to db test
mongo.connect(url2, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  findSave(db, () => {
      db.close();
  });
});

// delete the entire database!!!
const removeAll = (db, callback) => {
   db.collection('saves').deleteMany(
      {},
      function(err, results) {
         console.log(results);
         callback();
      }
   );
};

// create a new save entry
const insertSave = (db, callback) => {
   db.collection('saves').insertOne( rt, function(err, result) {
    assert.equal(err, null);
    //console.log("Inserted a document into the saves collection.");
    callback();
  });
};

// read the save entry
const findSave = (db, callback) => {
   var cursor =db.collection('saves').find( );
   cursor.each(function(err, doc) {
      //console.log("" + cursor.cursorState.documents.length + " db entries found");
      assert.equal(err, null);
      if (doc != null) {
         //console.dir(doc);
         callback(doc);
      } else {
         callback();
      }
   });
};

const updateSave = (db, callback) => {
   db.collection('saves').replaceOne(
      {}, rt, 
      function(err, results) {
        //console.log(results);
        callback();
   });
};

// FILE SERVING HANDLED BY EXPRESS

// send page
app.get('/', (req, res) => {
  res.sendFile(path.resolve('client/controller.html'));
});

app.get('/?', (req, res) => {
  res.sendFile(path.resolve('client/controller.js'));
});


/*
*
*
*
*
*
*
*
*
*
    VARIABLES AND CONSTRUCTORS
*
*
*
*
*
*
*
*
*
*/

const io = socketio(http);
let rt = {
  '_name': 'Void',
  '_desc': 'An infinite expanse of nothing.',
  '_path': ''
};

/*
*
*
*
*
*
*
*
*
*
*
    HELPERS
*
*
*
*
*
*
*
*
*
*
*
*/

// search an array for an object with a given property == a value
const elemWithProperty = (arrayOfObjects, propertyName, match) => {
  // loop
  for (let i = 0; i < arrayOfObjects.length; i++) {
    // match found
    if (match === arrayOfObjects[i][propertyName]) {
      return arrayOfObjects[i];
    }
  }
  // no match found
  return undefined;
};


// Emits the Game object to everyone in the room
const emitUpdate = () => {
  io.emit('update', obj);    // Unsure if this is correct
};

/*
*
*
*
*
*
*
*
*
*
*
    GAME WORLD
*
*
*
*
*
*
*
*
*
*
*
*/

const loadGame = () => {
  /*fs.readFile('save.json', 'utf8', function(err, data) {
    if(err) {
        console.error("Could not open file: %s", err);
        return;
    }
    rt = JSON.parse(data);
  });*/
  mongo.connect(url2, function(err, db) {
    assert.equal(null, err);
    console.log("Load: Connected correctly to server.");
    findSave(db, (doc) => {
      if (doc) {
        rt = doc;
      }
      db.close();
    });
  });
}
loadGame();

const saveGame = () => {
  //const data = JSON.stringify(rt);
  /*fs.writeFile('save.json', data, function(err) {
      if(err) {
          console.error("Could not write file: %s", err);
          return;
      }
  });*/
  mongo.connect(url2, function(err, db) {
    assert.equal(null, err);
    console.log("Save: Connected correctly to server.");
    updateSave(db, () => {
      // callback
      db.close()
    });
  });
}

const getEntity = (path) => {
  console.log(`Get entity with path ${path}`);
  const dirs = path.split('/');
  let e = rt;
  for (let i=0; i<dirs.length; i++) {
    if (dirs[i] == '') continue;
    e = e[dirs[i]];
  }
  return e;
}

const getParentPath = (path) => {
  if (path.indexOf('/') < 0) return;
  // parent substring
  const sub = path.substring(0,path.lastIndexOf('/'));
  // get parent
  return sub;
}

const getParent = (path) => {
  return getEntity(getParentPath(path));
}

const createEntity = (path, name, description) => {
  getEntity(path)[name] = { 
    "_name": name.replace(' ','_'),
    "_desc": description,
    "_path": path + '/' + name
  }
}

// send represtentation to the browser
const emitEntity = (socket,path) => {
  const e = getEntity(path);
  const obj = {};
  obj['_name'] = e._name;
  obj['_desc'] = e._desc;
  obj['_path'] = e._path;
  const keys = Object.keys(e);
  
  // list child names
  for (let i=0; i<keys.length; i++) {
    // only children, not private vars
    if (keys[i][0] !== '_') {
      obj[keys[i]] = keys[i];
    }
  }
  socket.emit('view',obj);
}

const editDescription = (path, description) => {
  const e = getEntity(path);
  e._desc = description;
}

const deleteEntity = (path, name) => {
  console.log("delete "+name);
  const e = getParent(path);
  if (e === undefined) return;
  // delete the reference
  e[name] = undefined;
  delete(e[name]);
}

/*
*
*
*
*
*
*
*
*
*
    SOCKETS
*
*
*
*
*
*
*
*
*
*/


io.sockets.on('connection', (socket) => {
  console.log('connected');
  emitEntity(socket,'/');
  
  socket.on('createEntity', (data) => { 
    console.log(`create ${data.name}`);
  
    // create a new entity
    createEntity(data.path,data.name,data.description);
    // save the game
    saveGame();
    // emit the new entity
    emitEntity(socket,data.path + '/' + data.name);
  });
  
  socket.on('viewEntity', (data) => {
    console.log(`view ${data.name}`);
    emitEntity(socket,data.path);
    loadGame();
  });
  
  socket.on('edit', (data) => {
    editDescription(data.path,data.description);
    saveGame();
    emitEntity(socket,data.path);
  });
  
  socket.on('delete', (data) => {
    deleteEntity(data.path,data.name);
    saveGame();
    emitEntity(socket,getParentPath(data.path));
  });
  
  socket.on('archive', (data) => {
    console.log('archive');
    socket.emit('archive', JSON.stringify(rt));
  });
  
  socket.on('disconnect', () => {
    console.log(socket.name + " disconnected");
  });
});


console.log('Websocket server started');

