"use strict";

let socket;
let debug = true;
let pathEl;
let nameEl;
let descEl;
let entityContainer;
let _path = '';
let form;
let nameInput;
let descriptionInput;
let buttons;

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

const downloadArchive = (jsonString) => {
  download('save.json', jsonString);
}

const download = (filename, text) => {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

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

const editDescription = () => {
  socket.emit('edit', { 
    "path": _path, 
    "description": descriptionInput.value 
    } );
}

const deleteEntity = () => {
  if (confirm("Are you sure you want to delete "+nameEl.innerHTML+" and all of its children?")) {
    socket.emit('delete', { "path": _path, "name": nameEl.innerHTML });
  }
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
  buttons.push(b);
  entityContainer.appendChild(b);
}

const pathToBreadcrumbs = (path) => {
  return path.replace(new RegExp('/','g'),' > ');
}

// show an entity
const viewData = (data) => {
  entityContainer.innerHTML = '';
  nameEl.innerHTML = presentify(data._name);
  descEl.innerHTML = data._desc;
  const eNames = Object.keys(data);
  buttons = [];
  for (let i=0; i<eNames.length; i++) {
    // ignore private properties
    if (eNames[i][0] === '_') continue;
    // create a button for each 
    makeEntityButton(eNames[i]);
  }
  // move path
  _path = data._path;
  pathEl.innerHTML = pathToBreadcrumbs(_path);
}

// remove illegal property characters
const sanitize = (str) => {
  let safe = str.replace(new RegExp(' ','g'),'_');
  safe = safe.replace(new RegExp('/','g'),'');
  return safe;
}

// add spaces back in
const presentify = (str) => {
  let newStr = str.replace(new RegExp('_','g'),' ');
  return newStr;
}

// create an entity
const createEntity = (name, desc) => {
  if (name.length == 0) return;
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
    
    socket.on('archive', (data) => {
      downloadArchive(data);
    });
};

// ---------------------------------------------------------------
// STARTUP
// ---------------------------------------------------------------

const initForm = () => {
  nameInput = q('.nameInput');
  descriptionInput = q('.descriptionInput');
  form.onsubmit = () => {
    //log(`${nameInput.value}, ${descriptionInput.value}`);
    // create entity
    createEntity(nameInput.value, descriptionInput.value);
    return false;
  }
}

const initButtons = () => {
  q('.back').onclick = () => { goBack(); }
  q('.edit').onclick = () => { editDescription(); }
  q('.delete').onclick = () => { deleteEntity(); }
  q('.archive').onclick = () => { socket.emit('archive'); }
}

const initPage = () => {
  nameEl = q(".name");
  descEl = q(".description");
  entityContainer = q(".entityContainer");
  pathEl = q(".path");
  form = q('form');
  initForm();
  initButtons();
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
      // apostrophe 
      case 96:
        goBack();
        break;
      // backtick ("grave accent") key
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:  
        let num = e.which - 49;
        if (num < buttons.length) {
          buttons[num].click();
        }
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
