"use strict";

let socket;
let debug = true;
let nameEl;
let descEl;
let entityContainer;
let _path = '';
let form;
let nameInput;
let descriptionInput;

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

// shorthand for print
const log = (output) => {
  console.log(output);
}

// shorthand for query selector
const q = (str) => {
  return document.querySelector(str);
}

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

// ---------------------------------------------------------------
// WORLD INTERACTION
// ---------------------------------------------------------------

// go back one level
const goBack = () => {
  // if in root, cannot go back
  if (_path.indexOf('/') < 0) return;
  
  // get parent
  const parent = _path.substring(_path.lastIndexOf('/')+1);
  
  // change path
  _path = _path.substring(0,_path.lastIndexOf('/'));
  
  // load new data
  viewEntity(parent);
}

// show an entity
const viewEntity = (name) => {
  socket.emit('viewEntity',{'path': _path, 'name': name});
}

// make a button given a name
const makeEntityButton = (name) => {
  const b = document.createElement('button');
  b.innerHTML = presentify(name);
  b.onclick = () => { 
    _path = _path + '/' + name;
    viewEntity(name); 
  };
  entityContainer.appendChild(b);
}

// show an entity
const viewData = (data) => {
  entityContainer.innerHTML = '';
  nameEl.innerHTML = presentify(data._name);
  descEl.innerHTML = data._desc;
  const eNames = Object.keys(data);
  for (let i=0; i<eNames.length; i++) {
    // ignore private properties
    if (eNames[i][0] === '_') continue;
    // create a button for each 
    makeEntityButton(eNames[i]);
  }
  // move path
  _path = data._path;
}

// remove illegal property characters
const sanitize = (str) => {
  let safe = str.replace(new RegExp(' ','g'),'_');
  return safe;
}

// add spaces back in
const presentify = (str) => {
  let newStr = str.replace(new RegExp('_','g'),' ');
  return newStr;
}

// create an entity
const createEntity = (name, desc) => {
  socket.emit('createEntity', {
    'name': sanitize(name),
    'path': _path,
    'description': desc
  });
}

// ---------------------------------------------------------------
// SOCKETS
// ---------------------------------------------------------------


const initSockets = () => {
    socket = io.connect();
    
    // display an entity
    socket.on('view', (data) => {
      viewData(data);
    });
};

// ---------------------------------------------------------------
// STARTUP
// ---------------------------------------------------------------

const initForm = () => {
  nameInput = q('.nameInput');
  descriptionInput = q('.descriptionInput');
  form.onsubmit = () => {
    console.log(`${nameInput.value}, ${descriptionInput.value}`);
    // create entity
    createEntity(nameInput.value, descriptionInput.value);
    return false;
  }
}

const initPage = () => {
  nameEl = q(".name");
  descEl = q(".description");
  entityContainer = q(".entityContainer");
  q('.back').onclick = () => { goBack(); }
  form = q('form');
  initForm();
};

const keyEvents = () => {

  // input areas
  const rx = /INPUT|SELECT|TEXTAREA/i;

  document.onkeypress = (e) => {
    if(!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly ){
      switch(e.which) {
      // backspace
      case 8: // 8 == backspace
        e.preventDefault();
        goBack();
        break;
      case 192:
        goBack();
        break;
      }
    }
  }
}

const init = () => {
  log("init");
  keyEvents();
  initSockets();
  initPage();
};

window.onload = init;
