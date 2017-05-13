// The MIT License (MIT)

// Copyright (c) 2014-2015 CNRS

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

"use strict";
var r=require("request");
var rp=require("request-promise");
var EventSource=require("eventsource");


function _id(result) {
  if (Array.isArray(result)) {
    return result.map(function (x) {
      return x._id;
    });
  }
  return result._id;
}

function _ID(returns_id) {
  return returns_id ? _id : data => data;
}



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// HELPER FUNCTIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


function opt(n,id) {
  return id ? `${n}/${id}` : n;
}

var _user=(id) => opt('user',id);
var _group=(id) => opt('group',id);
var _corpus=(id) => opt('corpus',id);
var _medium=(id) => opt('medium',id);
var _layer=(id) => opt('layer',id);
var _annotation=(id) => opt('annotation',id);
var _queue=(id) => opt('queue',id);

class Camomile {
  constructor(url) {
    this._baseUrl = url;
    this._cookies = undefined;
    this._evSource = undefined;

    this.watchCorpus = this._watch.bind(this, 'corpus');
    this.watchMedium = this._watch.bind(this, 'medium');
    this.watchLayer = this._watch.bind(this, 'layer');
    this.watchQueue = this._watch.bind(this, 'queue');

    this.unwatchCorpus = this._unwatch.bind(this, 'corpus');
    this.unwatchMedium = this._unwatch.bind(this, 'medium');
    this.unwatchLayer = this._unwatch.bind(this, 'layer');
    this.unwatchQueue = this._unwatch.bind(this, 'queue');
  }


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// SSE
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  _watch(type, id, callback) {
    return (this._evSource===undefined ? this._listen() : Promise.resolve())
      .then(() => this._put(`listen/${this.channel_id}/${type}/${id}`,{}))
      .then(() => {
        this._evSource.addEventListener(type + ':' + id, callback);
      });
  }

  _unwatch(type, id, callback) {
    return this._delete(`listen/${this.channel_id}/${type}/${id}`).then(() => {
      this._evSource.removeEventListener(type + ':' + id, callback);
    })
  }


  _listen() {
    return this._post('listen',{}).then(({channel_id}) => {
      this._evSource = new EventSource(this._baseUrl + '/listen/' + channel_id, {withCredentials: true,headers:{'Access-Control-Request-Headers':"content-type"}});
      this.channel_id=channel_id;
    });
  }

////////////

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// AUTHENTICATION
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  login(username, password) {
    return this._post('login',{username,password},true).then(data => {
      if (data.headers['set-cookie'] && data.headers['set-cookie'][0]) this._cookies = data.headers['set-cookie'][0];

      return data.body;
    });
  };

  logout() {
    return this._post('logout',{});
  };

  _get(uri,parameters) {
    return rp({uri:`${this._baseUrl}/${uri}`,qs:parameters,json: true,headers:{'Cookie':this._cookies},withCredentials:true});
  }

  _put(uri,data) {
    return rp({method: 'put', uri:`${this._baseUrl}/${uri}`, json: data,headers:{'Access-Control-Request-Headers':"content-type",'Cookie':this._cookies},withCredentials:true});
  }

  _post(uri,data,full=false) {
    return rp({method: 'post', uri:`${this._baseUrl}/${uri}`, json: data,headers:{'Access-Control-Request-Headers':"content-type",'Cookie':this._cookies},
      withCredentials:true,resolveWithFullResponse: full});
  }

  _delete(uri) {
    return rp({method: 'delete', uri:`${this._baseUrl}/${uri}`,json: true,headers:{'Cookie':this._cookies},withCredentials:true});
  }

  me() {
    return this._get("me");
  };

  getMyGroups() {
    return this._get("me/group");
  };

  update_password(new_password) {
    return this._put('me',{password:new_password});
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// USERS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


  getUser(user) {
    return this._get(_user(user));
  };

  getUsers({returns_id,filter:{username,role}={}} = {}) {
    // Available filters: username, role
    return this._get('user',{username,role}).then(_ID(returns_id));
  };

  createUser(username, password, description = {}, role = 'user', {returns_id} = {}) {
    return this._post('user',{username,password,description,role}).then(_ID(returns_id));
  };

  updateUser(user, fields = {}) {
    // Updatable fields: password, description, role
    return this._put(_user(user),fields);
  };

  deleteUser(user) {
    return this._delete(_user(user));
  };

  getUserGroups(user, {returns_id} = {}) {
    return this._get(`${_user(user)}/group`).then(_ID(returns_id));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// GROUPS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  getGroup(group) {
    return this._get(_group(group));
  };

  getGroups({returns_id,filter:{name}={}} = {}) {
    // Available filters: name

    return this._get('group',{name}).then(_ID(returns_id));
  };

  createGroup(name, description = {}, {returns_id} = {}) {
    return this._post('group',{name,description}).then(_ID(returns_id));
  };

  updateGroup(group, fields = {}) {
    // Updatable fields: description

    return this._put(_group(group),fields);
  }

  deleteGroup(group) {
    return this._delete(_group(group));
  }

  addUserToGroup(user, group) {
    return this._put(`${_group(group)}/user/${user}`,{});
  }

  removeUserFromGroup(user, group) {
    return this._delete(`${_group(group)}/user/${user}`);
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// CORPORA
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Get corpus by ID
  getCorpus(corpus, {history} = {}) {
    return this._get(_corpus(corpus),{history});
  };

// Get list of corpora
  getCorpora({returns_id,filter:{name}={},history}={}) {
    // Available filters: name

    return this._get('corpus',{name,history}).then(_ID(returns_id));
  };

  createCorpus(name, description = {}, {returns_id}={}) {
    return this._post('corpus',{name,description}).then(_ID(returns_id));
  };

  updateCorpus(corpus, fields = {}) {
    // Updatable fields: name?, description

    return this._put(_corpus(corpus),fields);
  };

  deleteCorpus(corpus) {
    return this._delete(_corpus(corpus));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// MEDIA
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Get medium by ID
  getMedium(medium, {history} = {}) {
    return this._get(`${_medium(medium)}`,{history});
  };

// Get medium URL, e.g. for use in <video> src attribute
  getMediumURL(medium, format = "video") {
    return `${this._baseUrl}/${_medium(medium)}/${format}`;
  };

// Get list of media
  getMedia({filter:{id_corpus,name}= {},returns_count,returns_id,history}={}) {
    // Available filters: id_corpus, name

    // route /corpus/:id_corpus/medium/count
    if (returns_count) {
      if (id_corpus === undefined) {
        throw new Error('returns_count needs options.filter.id_corpus to be set');
      }
      return this._get(`${_corpus(id_corpus)}/medium/count`,{name});
    }

    if (id_corpus !== undefined) {
      return this._get(`${_corpus(id_corpus)}/medium`,{name,history}).then(_ID(returns_id));
    } else {
      return this._get(`medium`,{name,history}).then(_ID(returns_id));
    }
  };

  createMedium(corpus, name, url, description = {}, {returns_id} = {}) {
    return this._post(`${_corpus(corpus)}/medium`,{name,url,description}).then(_ID(returns_id));
  };

  createMedia(corpus, media, {returns_id} = {}) {
    return this._post(`${_corpus(corpus)}/medium`,media).then(_ID(returns_id));
  };

  updateMedium(medium, fields = {}) {
    // Updatable fields: name?, url, description

    return this._put(_medium(medium),fields);
  };

  deleteMedium(medium) {
    return this._delete(_medium(medium));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// LAYERS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Get layer by ID
  getLayer(layer) {
    return this._get(_layer(layer));
  };

// Get list of layers
  getLayers({returns_id,filter:{id_corpus,name} = {}, history} = {}) {
    // Available filters: id_corpus, name

    if (id_corpus !== undefined) {
      return this._get(`${_corpus(id_corpus)}/layer`,{name,history}).then(_ID(returns_id));
    } else {
      return this._get('layer',{name,history}).then(_ID(returns_id));
    }
  };

  createLayer(corpus, name, description = {}, fragment_type, data_type, annotations = [], {returns_id} = {}) {
    return this._post(`${_corpus(corpus)}/layer`,{name,description,fragment_type,data_type,annotations}).then(_ID(returns_id));
  };

  updateLayer(layer, fields = {}) {
    // Updatable fields: name?, description, fragment_type, data_type

    return this._put(_layer(layer),fields);
  };

  deleteLayer(layer) {
    return this._delete(_layer(layer));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ANNOTATIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  getAnnotation(annotation, {history} = {}) {
    return this._get(_annotation(annotation),{history});
  };

  getAnnotations({returns_count, filter:{id_medium,id_layer} = {}, history, returns_id} = {}) {
    // Available filters: id_layer, id_medium

    // route /layer/:id_layer/annotation/count
    if (returns_count) {
      if (id_layer === undefined) {
        throw new Error('returns_count needs options.filter.id_layer to be set');
      }
      return this._get(`${_layer(id_layer)}/annotation/count`,{id_medium});
    }

    if (id_layer !== undefined) {
      return this._get(`${_layer(id_layer)}/annotation`,{id_medium,history}).then(_ID(returns_id));
    } else {
      return this._get('annotation',{id_medium,history}).then(_ID(returns_id));
    }
  };

  createAnnotation(layer, medium, fragment = {}, data = {}, {returns_id} = {}) {
    return this._post(`${_layer(layer)}/annotation`,{id_medium:medium,fragment,data}).then(_ID(returns_id));
  };

  createAnnotations(layer, annotations, {returns_id} = {}) {
    return this._post(`${_layer(layer)}/annotation`,annotations).then(_ID(returns_id));
  };

  updateAnnotation(annotation, fields = {}) {
    // Updatable fields: fragment, data

    return this._put(_annotation(annotation),fields);
  };

  deleteAnnotation(annotation) {
    return this._delete(_annotation(annotation));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// QUEUES
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  getQueue(queue) {
    return this._get(_queue(queue));
  };

  getQueues({returns_id} = {}) {
    return this._get('queue').then(_ID(returns_id));
  };

  createQueue(name, description = {}, {returns_id} = {}) {
    return this._post('queue',{name,description}).then(_ID(returns_id));
  };

  updateQueue(queue, fields) {
    // Updatable fields: name, description

    return this._put(_queue(queue),fields);
  };

  enqueue(queue, elements) {
    return this._put(`${_queue(queue)}/next`,elements);
  };

  dequeue(queue) {
    return this._get(`${_queue(queue)}/next`);
  };

  pick(queue) {
    return this._get(`${_queue(queue)}/first`);
  };

  pickAll(queue) {
    return this._get(`${_queue(queue)}/all`);
  };

  pickLength(queue) {
    return this._get(`${_queue(queue)}/length`);
  };

  deleteQueue(queue) {
    return this._delete(_queue(queue));
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PERMISSIONS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  getCorpusPermissions(corpus) {
    return this._get(`${_corpus(corpus)}/permissions`);
  };

  setCorpusPermissionsForGroup(corpus, group, right) {
    return this._put(`${_corpus(corpus)}/group/${group}`,{right});
  };

  removeCorpusPermissionsForGroup(corpus, group) {
    return this._delete(`${_corpus(corpus)}/group/${group}`);
  };

  setCorpusPermissionsForUser(corpus, user, right) {
    return this._put(`${_corpus(corpus)}/user/${user}`,{right});
  };

  removeCorpusPermissionsForUser(corpus, user) {
    return this._delete(`${_corpus(corpus)}/user/${user}`);
  };


  getLayerPermissions(layer) {
    return this._get(`${_layer(layer)}/permissions`);
  };

  setLayerPermissionsForGroup(layer, group, right) {
    return this._put(`${_layer(layer)}/group/${group}`,{right});
  };

  removeLayerPermissionsForGroup(layer, group) {
    return this._delete(`${_layer(layer)}/group/${group}`);
  };

  setLayerPermissionsForUser(layer, user, right) {
    return this._put(`${_layer(layer)}/user/${user}`,{right});
  };

  removeLayerPermissionsForUser(layer, user) {
    return this._delete(`${_layer(layer)}/user/${user}`);
  };

  getQueuePermissions(queue) {
    return this._get(`${_queue(queue)}/permissions`);
  };

  setQueuePermissionsForGroup(queue, group, right) {
    return this._put(`${_queue(queue)}/group/${group}`,{right});
  };

  removeQueuePermissionsForGroup(queue, group) {
    return this._delete(`${_queue(queue)}/group/${group}`);
  };

  setQueuePermissionsForUser(queue, user, right) {
    return this._put(`${_queue(queue)}/user/${user}`,{right});
  };

  removeQueuePermissionsForUser(queue, user) {
    return this._delete(`${_queue(queue)}/user/${user}`);
  };

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// META DATA
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// CORPUS
  getCorpusMetadata(corpus, path) {
    return this._getMetadata(_corpus(corpus), path);
  };

  getCorpusMetadataKeys(corpus, path) {
    return this._getMetadataKeys(_corpus(corpus), path);
  };

  setCorpusMetadata(corpus, metadatas, path) {
    return this._setMetadata(_corpus(corpus), metadatas, path);
  };

  sendCorpusMetadataFile(corpus, path, file) {
    return this._sendMetadataFile(_corpus(corpus), path, file);
  };

  deleteCorpusMetadata(corpus, path) {
    return this._deleteMetadata(_corpus(corpus), path);
  };

// LAYER
  getLayerMetadata(layer, path) {
    return this._getMetadata(_layer(layer), path);
  };

  getLayerMetadataKeys(layer, path) {
    return this._getMetadataKeys(_layer(layer), path);
  };

  setLayerMetadata(layer, metadatas, path) {
    return this._setMetadata(_layer(layer), metadatas, path);
  };

  msendLayerMetadataFile(layer, path, file) {
    return this._sendMetadataFile(_layer(layer), path, file);
  };

  deleteLayerMetadata(layer, path) {
    return this. _deleteMetadata(_layer(layer), path);
  };

// MEDIUM
  getMediumMetadata(medium, path) {
    return this._getMetadata(_medium(medium), path);
  };

  getMediumMetadataKeys(medium, path) {
    return this._getMetadataKeys(_medium(medium), path);
  };

  setMediumMetadata(medium, metadatas, path) {
    return this._setMetadata(_medium(medium), metadatas, path);
  };

  sendMediumMetadataFile(medium, path, file) {
    return this._sendMetadataFile(_medium(medium), path, file);
  };

  deleteMediumMetadata(medium, path) {
    return this._deleteMetadata(_medium(medium), path);
  };

////

  _setMetadata(resource, metadatas, path) {
    if (path) {
      metadatas = Camomile._constructMetadataPathObject(path, metadatas);
    }

    return this._post(`${resource}/metadata`,metadatas);
  }

  _getMetadata(resource, path) {
    if (!path) {
      return this._getMetadataKeys(resource);
    } else {
      return this._get(`${resource}/metadata/${path}`);
    }
  }

  _getMetadataKeys(resource, path = '') {
    return this._get(`${resource}/metadata/${path}.`);
  }

  _deleteMetadata(resource, path) {
    return this._delete(`${resource}/metadata/${path}`);
  }

  _sendMetadataFile(resource, path, file) {
    return new Promise(callback => {
      var reader = new FileReader();
      reader.onload = (e) => {
        var base64 = e.target.result;
        var infos = base64.split(',');
        var object = Camomile._constructMetadataPathObject(path, {
          type: 'file',
          filename: file.name,
          data: infos[1]
        });

        this._setMetadata(resource, object).then(callback);
      };
      reader.readAsDataURL(file);
    });
  }

  static _constructMetadataPathObject(path, metadatas) {
    var paths = path.split('.');

    var object = {};
    var accessor = object;
    for (var i = 0; i < paths.length; i++) {
      accessor[paths[i]] = {};
      if (i === paths.length - 1) {
        accessor[paths[i]] = metadatas;
      } else {
        accessor = accessor[paths[i]];
      }
    }

    return object;
  }


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// UTILS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  getDate() {
    return this._get('date');
  };
}





module.exports = Camomile;
