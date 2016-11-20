(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

require('./node_modules/webcomponents.js/webcomponents-lite.min.js');

require('./node_modules/proxy-oo-polyfill/proxy-oo-polyfill.js');

require('./node_modules/promise-polyfill/promise.js');

var _razilocomponent = require('razilocomponent');

var _razilocomponent2 = _interopRequireDefault(_razilocomponent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// razilo modules are all ES6 modules so make them available on global window
window.RaziloComponent = _razilocomponent2.default;

},{"./node_modules/promise-polyfill/promise.js":2,"./node_modules/proxy-oo-polyfill/proxy-oo-polyfill.js":3,"./node_modules/webcomponents.js/webcomponents-lite.min.js":56,"razilocomponent":54}],2:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (root) {

  // Store setTimeout reference so promise-polyfill will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var setTimeoutFunc = setTimeout;

  function noop() {}

  // Polyfill for Function.prototype.bind
  function bind(fn, thisArg) {
    return function () {
      fn.apply(thisArg, arguments);
    };
  }

  function Promise(fn) {
    if (_typeof(this) !== 'object') throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function') throw new TypeError('not a function');
    this._state = 0;
    this._handled = false;
    this._value = undefined;
    this._deferreds = [];

    doResolve(fn, this);
  }

  function handle(self, deferred) {
    while (self._state === 3) {
      self = self._value;
    }
    if (self._state === 0) {
      self._deferreds.push(deferred);
      return;
    }
    self._handled = true;
    Promise._immediateFn(function () {
      var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
        return;
      }
      var ret;
      try {
        ret = cb(self._value);
      } catch (e) {
        reject(deferred.promise, e);
        return;
      }
      resolve(deferred.promise, ret);
    });
  }

  function resolve(self, newValue) {
    try {
      // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
      if (newValue && ((typeof newValue === 'undefined' ? 'undefined' : _typeof(newValue)) === 'object' || typeof newValue === 'function')) {
        var then = newValue.then;
        if (newValue instanceof Promise) {
          self._state = 3;
          self._value = newValue;
          finale(self);
          return;
        } else if (typeof then === 'function') {
          doResolve(bind(then, newValue), self);
          return;
        }
      }
      self._state = 1;
      self._value = newValue;
      finale(self);
    } catch (e) {
      reject(self, e);
    }
  }

  function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
  }

  function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
      Promise._immediateFn(function () {
        if (!self._handled) {
          Promise._unhandledRejectionFn(self._value);
        }
      });
    }

    for (var i = 0, len = self._deferreds.length; i < len; i++) {
      handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
  }

  function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, self) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return;
        done = true;
        resolve(self, value);
      }, function (reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      });
    } catch (ex) {
      if (done) return;
      done = true;
      reject(self, ex);
    }
  }

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype.then = function (onFulfilled, onRejected) {
    var prom = new this.constructor(noop);

    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
  };

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;

      function res(i, val) {
        try {
          if (val && ((typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object' || typeof val === 'function')) {
            var then = val.then;
            if (typeof then === 'function') {
              then.call(val, function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
          args[i] = val;
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex);
        }
      }

      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.resolve = function (value) {
    if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && value.constructor === Promise) {
      return value;
    }

    return new Promise(function (resolve) {
      resolve(value);
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      for (var i = 0, len = values.length; i < len; i++) {
        values[i].then(resolve, reject);
      }
    });
  };

  // Use polyfill for setImmediate for performance gains
  Promise._immediateFn = typeof setImmediate === 'function' && function (fn) {
    setImmediate(fn);
  } || function (fn) {
    setTimeoutFunc(fn, 0);
  };

  Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
      console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
  };

  /**
   * Set the immediate function to execute callbacks
   * @param fn {function} Function to execute
   * @deprecated
   */
  Promise._setImmediateFn = function _setImmediateFn(fn) {
    Promise._immediateFn = fn;
  };

  /**
   * Change the function to execute on unhandled rejection
   * @param {function} fn Function to execute on unhandled rejection
   * @deprecated
   */
  Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
    Promise._unhandledRejectionFn = fn;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Promise;
  } else if (!root.Promise) {
    root.Promise = Promise;
  }
})(undefined);

},{}],3:[function(require,module,exports){
/**
 * Proxy has been patched with support for Object.observe, which is now obsovare. This is done to allow OO to exist if native proxy does not.
 * The reason for this is due to limitations with proxy polyfill when it comes to arrays as it makes them immutable.
 * If Proxy.oo exists, you should switch to Proxy.oo when wanting to observe nested objects with arrays and still want to call a callback if the
 * array is used with push, splice, etc. Otherewise if Proxy.oo not present (we are native) and can use native engine to without issue
 */

/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

(function (scope) {
    if (scope['Proxy']) return;

    var lastRevokeFn = null;

    /**
     * @param {*} o
     * @return {boolean} whether this is probably a (non-null) Object
     */
    function isObject(o) {
        return o ? (typeof o === 'undefined' ? 'undefined' : _typeof(o)) == 'object' || typeof o == 'function' : false;
    }

    /**
     * @constructor
     * @param {!Object} target
     * @param {{apply, construct, get, set}} handler
     */
    scope.Proxy = function (target, handler) {
        if (!isObject(target) || !isObject(handler)) {
            throw new TypeError('Cannot create proxy with a non-object as target or handler');
        }

        // Construct revoke function, and set lastRevokeFn so that Proxy.revocable can steal it.
        // The caller might get the wrong revoke function if a user replaces or wraps scope.Proxy
        // to call itself, but that seems unlikely especially when using the polyfill.
        var throwRevoked = function throwRevoked() {};
        lastRevokeFn = function lastRevokeFn() {
            throwRevoked = function throwRevoked(trap) {
                throw new TypeError('Cannot perform ' + trap + ' on a proxy that has been revoked');
            };
        };

        // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
        // are a bit more careful. Copy the internal parts of handler to prevent user changes.
        var unsafeHandler = handler;
        handler = { 'get': null, 'set': null, 'apply': null, 'construct': null };
        for (var k in unsafeHandler) {
            if (!(k in handler)) {
                throw new TypeError('Proxy polyfill does not support trap ' + k);
            }
            handler[k] = unsafeHandler[k];
        }
        if (typeof unsafeHandler == 'function') {
            // Allow handler to be a function (which has an 'apply' method). This matches what is
            // probably a bug in native versions. It treats the apply call as a trap to be configured.
            handler.apply = unsafeHandler.apply.bind(unsafeHandler);
        }

        // Define proxy as this, or a Function (if either it's callable, or apply is set).
        // TODO(samthor): Closure compiler doesn't know about 'construct', attempts to rename it.
        var proxy = this;
        var isMethod = false;
        var targetIsFunction = typeof target == 'function';
        if (handler.apply || handler['construct'] || targetIsFunction) {
            proxy = function Proxy() {
                var usingNew = this && this.constructor === proxy;
                throwRevoked(usingNew ? 'construct' : 'apply');

                if (usingNew && handler['construct']) {
                    return handler['construct'].call(this, target, arguments);
                } else if (!usingNew && handler.apply) {
                    return handler.apply(target, this, arguments);
                } else if (targetIsFunction) {
                    // since the target was a function, fallback to calling it directly.
                    if (usingNew) {
                        // inspired by answers to https://stackoverflow.com/q/1606797
                        var all = Array.prototype.slice.call(arguments);
                        all.unshift(target); // pass class as first arg to constructor, although irrelevant
                        // nb. cast to convince Closure compiler that this is a constructor
                        var f = /** @type {!Function} */target.bind.apply(target, all);
                        return new f();
                    }
                    return target.apply(this, arguments);
                }
                throw new TypeError(usingNew ? 'not a constructor' : 'not a function');
            };
            isMethod = true;
        }

        // Create default getters/setters. Create different code paths as handler.get/handler.set can't
        // change after creation.
        var getter = handler.get ? function (prop) {
            throwRevoked('get');
            return handler.get(this, prop, proxy);
        } : function (prop) {
            throwRevoked('get');
            return this[prop];
        };
        var setter = handler.set ? function (prop, value) {
            throwRevoked('set');
            var status = handler.set(this, prop, value, proxy);
            if (!status) {
                // TODO(samthor): If the calling code is in strict mode, throw TypeError.
                // It's (sometimes) possible to work this out, if this code isn't strict- try to load the
                // callee, and if it's available, that code is non-strict. However, this isn't exhaustive.
            }
        } : function (prop, value) {
            throwRevoked('set');
            this[prop] = value;
        };

        // Clone direct properties (i.e., not part of a prototype).
        var propertyNames = Object.getOwnPropertyNames(target);
        var propertyMap = {};
        propertyNames.forEach(function (prop) {
            if (isMethod && prop in proxy) {
                return; // ignore properties already here, e.g. 'bind', 'prototype' etc
            }
            var real = Object.getOwnPropertyDescriptor(target, prop);
            var desc = {
                enumerable: !!real.enumerable,
                get: getter.bind(target, prop),
                set: setter.bind(target, prop)
            };
            Object.defineProperty(proxy, prop, desc);
            propertyMap[prop] = true;
        });

        // Set the prototype, or clone all prototype methods (always required if a getter is provided).
        // TODO(samthor): We don't allow prototype methods to be set. It's (even more) awkward.
        // An alternative here would be to _just_ clone methods to keep behavior consistent.
        var prototypeOk = true;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(proxy, Object.getPrototypeOf(target));
        } else if (proxy.__proto__) {
            proxy.__proto__ = target.__proto__;
        } else {
            prototypeOk = false;
        }
        if (handler.get || !prototypeOk) {
            for (var k in target) {
                if (propertyMap[k]) {
                    continue;
                }
                Object.defineProperty(proxy, k, { get: getter.bind(target, k) });
            }
        }

        // The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
        Object.seal(target);
        Object.seal(proxy);

        return proxy; // nb. if isMethod is true, proxy != this
    };

    scope.Proxy.revocable = function (target, handler) {
        var p = new scope.Proxy(target, handler);
        return { 'proxy': p, 'revoke': lastRevokeFn };
    };

    scope.Proxy['revocable'] = scope.Proxy.revocable;
    scope.Proxy['oo'] = {};
    scope['Proxy'] = scope.Proxy;
})(window);

/*!
 * Object.observe polyfill - v0.2.4
 * by Massimo Artizzu (MaxArt2501)
 *
 * https://github.com/MaxArt2501/object-observe
 *
 * Licensed under the MIT License
 * See LICENSE for details
 */

// Some type definitions
/**
 * This represents the data relative to an observed object
 * @typedef  {Object}                     ObjectData
 * @property {Map<Handler, HandlerData>}  handlers
 * @property {String[]}                   properties
 * @property {*[]}                        values
 * @property {Descriptor[]}               descriptors
 * @property {Notifier}                   notifier
 * @property {Boolean}                    frozen
 * @property {Boolean}                    extensible
 * @property {Object}                     proto
 */
/**
 * Function definition of a handler
 * @callback Handler
 * @param {ChangeRecord[]}                changes
*/
/**
 * This represents the data relative to an observed object and one of its
 * handlers
 * @typedef  {Object}                     HandlerData
 * @property {Map<Object, ObservedData>}  observed
 * @property {ChangeRecord[]}             changeRecords
 */
/**
 * @typedef  {Object}                     ObservedData
 * @property {String[]}                   acceptList
 * @property {ObjectData}                 data
*/
/**
 * Type definition for a change. Any other property can be added using
 * the notify() or performChange() methods of the notifier.
 * @typedef  {Object}                     ChangeRecord
 * @property {String}                     type
 * @property {Object}                     object
 * @property {String}                     [name]
 * @property {*}                          [oldValue]
 * @property {Number}                     [index]
 */
/**
 * Type definition for a notifier (what Object.getNotifier returns)
 * @typedef  {Object}                     Notifier
 * @property {Function}                   notify
 * @property {Function}                   performChange
 */
/**
 * Function called with Notifier.performChange. It may optionally return a
 * ChangeRecord that gets automatically notified, but `type` and `object`
 * properties are overridden.
 * @callback Performer
 * @returns {ChangeRecord|undefined}
 */
(function (P, O, A, root, _undefined) {
    // did we polyfill?
    if (!P.oo) return;

    /**
     * Relates observed objects and their data
     * @type {Map<Object, ObjectData}
     */
    var observed,

    /**
     * List of handlers and their data
     * @type {Map<Handler, Map<Object, HandlerData>>}
     */
    handlers,
        defaultAcceptList = ["add", "update", "delete", "reconfigure", "setPrototype", "preventExtensions"];

    // Functions for internal usage

    /**
     * Checks if the argument is an Array object. Polyfills Array.isArray.
     * @function isArray
     * @param {?*} object
     * @returns {Boolean}
     */
    var isArray = A.isArray || function (toString) {
        return function (object) {
            return toString.call(object) === "[object Array]";
        };
    }(O.prototype.toString),


    /**
     * Returns the index of an item in a collection, or -1 if not found.
     * Uses the generic Array.indexOf or Array.prototype.indexOf if available.
     * @function inArray
     * @param {Array} array
     * @param {*} pivot           Item to look for
     * @param {Number} [start=0]  Index to start from
     * @returns {Number}
     */
    inArray = A.prototype.indexOf ? A.indexOf || function (array, pivot, start) {
        return A.prototype.indexOf.call(array, pivot, start);
    } : function (array, pivot, start) {
        for (var i = start || 0; i < array.length; i++) {
            if (array[i] === pivot) return i;
        }return -1;
    },


    /**
     * Returns an instance of Map, or a Map-like object is Map is not
     * supported or doesn't support forEach()
     * @function createMap
     * @returns {Map}
     */
    createMap = root.Map === _undefined || !Map.prototype.forEach ? function () {
        // Lightweight shim of Map. Lacks clear(), entries(), keys() and
        // values() (the last 3 not supported by IE11, so can't use them),
        // it doesn't handle the constructor's argument (like IE11) and of
        // course it doesn't support for...of.
        // Chrome 31-35 and Firefox 13-24 have a basic support of Map, but
        // they lack forEach(), so their native implementation is bad for
        // this polyfill. (Chrome 36+ supports Object.observe.)
        var keys = [],
            values = [];

        return {
            size: 0,
            has: function has(key) {
                return inArray(keys, key) > -1;
            },
            get: function get(key) {
                return values[inArray(keys, key)];
            },
            set: function set(key, value) {
                var i = inArray(keys, key);
                if (i === -1) {
                    keys.push(key);
                    values.push(value);
                    this.size++;
                } else values[i] = value;
            },
            "delete": function _delete(key) {
                var i = inArray(keys, key);
                if (i > -1) {
                    keys.splice(i, 1);
                    values.splice(i, 1);
                    this.size--;
                }
            },
            forEach: function forEach(callback /*, thisObj*/) {
                for (var i = 0; i < keys.length; i++) {
                    callback.call(arguments[1], values[i], keys[i], this);
                }
            }
        };
    } : function () {
        return new Map();
    },


    /**
     * Simple shim for Object.getOwnPropertyNames when is not available
     * Misses checks on object, don't use as a replacement of Object.keys/getOwnPropertyNames
     * @function getProps
     * @param {Object} object
     * @returns {String[]}
     */
    getProps = O.getOwnPropertyNames ? function () {
        var func = O.getOwnPropertyNames;
        try {
            arguments.callee;
        } catch (e) {
            // Strict mode is supported

            // In strict mode, we can't access to "arguments", "caller" and
            // "callee" properties of functions. Object.getOwnPropertyNames
            // returns [ "prototype", "length", "name" ] in Firefox; it returns
            // "caller" and "arguments" too in Chrome and in Internet
            // Explorer, so those values must be filtered.
            var avoid = (func(inArray).join(" ") + " ").replace(/prototype |length |name /g, "").slice(0, -1).split(" ");
            if (avoid.length) func = function func(object) {
                var props = O.getOwnPropertyNames(object);
                if (typeof object === "function") for (var i = 0, j; i < avoid.length;) {
                    if ((j = inArray(props, avoid[i++])) > -1) props.splice(j, 1);
                }return props;
            };
        }
        return func;
    }() : function (object) {
        // Poor-mouth version with for...in (IE8-)
        var props = [],
            prop,
            hop;
        if ("hasOwnProperty" in object) {
            for (prop in object) {
                if (object.hasOwnProperty(prop)) props.push(prop);
            }
        } else {
            hop = O.hasOwnProperty;
            for (prop in object) {
                if (hop.call(object, prop)) props.push(prop);
            }
        }

        // Inserting a common non-enumerable property of arrays
        if (isArray(object)) props.push("length");

        return props;
    },


    /**
     * Return the prototype of the object... if defined.
     * @function getPrototype
     * @param {Object} object
     * @returns {Object}
     */
    getPrototype = O.getPrototypeOf,


    /**
     * Return the descriptor of the object... if defined.
     * IE8 supports a (useless) Object.getOwnPropertyDescriptor for DOM
     * nodes only, so defineProperties is checked instead.
     * @function getDescriptor
     * @param {Object} object
     * @param {String} property
     * @returns {Descriptor}
     */
    getDescriptor = O.defineProperties && O.getOwnPropertyDescriptor,


    /**
     * Sets up the next check and delivering iteration, using
     * requestAnimationFrame or a (close) polyfill.
     * @function nextFrame
     * @param {function} func
     * @returns {number}
     */
    nextFrame = root.requestAnimationFrame || root.webkitRequestAnimationFrame || function () {
        var initial = +new Date(),
            last = initial;
        return function (func) {
            return setTimeout(function () {
                func((last = +new Date()) - initial);
            }, 17);
        };
    }(),


    /**
     * Sets up the observation of an object
     * @function doObserve
     * @param {Object} object
     * @param {Handler} handler
     * @param {String[]} [acceptList]
     */
    doObserve = function doObserve(object, handler, acceptList) {
        var data = observed.get(object);

        if (data) {
            performPropertyChecks(data, object);
            setHandler(object, data, handler, acceptList);
        } else {
            data = createObjectData(object);
            setHandler(object, data, handler, acceptList);

            if (observed.size === 1)
                // Let the observation begin!
                nextFrame(runGlobalLoop);
        }
    },


    /**
     * Creates the initial data for an observed object
     * @function createObjectData
     * @param {Object} object
     */
    createObjectData = function createObjectData(object, data) {
        var props = getProps(object),
            values = [],
            descs,
            i = 0,
            data = {
            handlers: createMap(),
            frozen: O.isFrozen ? O.isFrozen(object) : false,
            extensible: O.isExtensible ? O.isExtensible(object) : true,
            proto: getPrototype && getPrototype(object),
            properties: props,
            values: values,
            notifier: retrieveNotifier(object, data)
        };

        if (getDescriptor) {
            descs = data.descriptors = [];
            while (i < props.length) {
                descs[i] = getDescriptor(object, props[i]);
                values[i] = object[props[i++]];
            }
        } else while (i < props.length) {
            values[i] = object[props[i++]];
        }observed.set(object, data);

        return data;
    },


    /**
     * Performs basic property value change checks on an observed object
     * @function performPropertyChecks
     * @param {ObjectData} data
     * @param {Object} object
     * @param {String} [except]  Doesn't deliver the changes to the
     *                           handlers that accept this type
     */
    performPropertyChecks = function () {
        var updateCheck = getDescriptor ? function (object, data, idx, except, descr) {
            var key = data.properties[idx],
                value = object[key],
                ovalue = data.values[idx],
                odesc = data.descriptors[idx];

            if ("value" in descr && (ovalue === value ? ovalue === 0 && 1 / ovalue !== 1 / value : ovalue === ovalue || value === value)) {
                addChangeRecord(object, data, {
                    name: key,
                    type: "update",
                    object: object,
                    oldValue: ovalue
                }, except);
                data.values[idx] = value;
            }
            if (odesc.configurable && (!descr.configurable || descr.writable !== odesc.writable || descr.enumerable !== odesc.enumerable || descr.get !== odesc.get || descr.set !== odesc.set)) {
                addChangeRecord(object, data, {
                    name: key,
                    type: "reconfigure",
                    object: object,
                    oldValue: ovalue
                }, except);
                data.descriptors[idx] = descr;
            }
        } : function (object, data, idx, except) {
            var key = data.properties[idx],
                value = object[key],
                ovalue = data.values[idx];

            if (ovalue === value ? ovalue === 0 && 1 / ovalue !== 1 / value : ovalue === ovalue || value === value) {
                addChangeRecord(object, data, {
                    name: key,
                    type: "update",
                    object: object,
                    oldValue: ovalue
                }, except);
                data.values[idx] = value;
            }
        };

        // Checks if some property has been deleted
        var deletionCheck = getDescriptor ? function (object, props, proplen, data, except) {
            var i = props.length,
                descr;
            while (proplen && i--) {
                if (props[i] !== null) {
                    descr = getDescriptor(object, props[i]);
                    proplen--;

                    // If there's no descriptor, the property has really
                    // been deleted; otherwise, it's been reconfigured so
                    // that's not enumerable anymore
                    if (descr) updateCheck(object, data, i, except, descr);else {
                        addChangeRecord(object, data, {
                            name: props[i],
                            type: "delete",
                            object: object,
                            oldValue: data.values[i]
                        }, except);
                        data.properties.splice(i, 1);
                        data.values.splice(i, 1);
                        data.descriptors.splice(i, 1);
                    }
                }
            }
        } : function (object, props, proplen, data, except) {
            var i = props.length;
            while (proplen && i--) {
                if (props[i] !== null) {
                    addChangeRecord(object, data, {
                        name: props[i],
                        type: "delete",
                        object: object,
                        oldValue: data.values[i]
                    }, except);
                    data.properties.splice(i, 1);
                    data.values.splice(i, 1);
                    proplen--;
                }
            }
        };

        return function (data, object, except) {
            if (!data.handlers.size || data.frozen) return;

            var props,
                proplen,
                keys,
                values = data.values,
                descs = data.descriptors,
                i = 0,
                idx,
                key,
                value,
                proto,
                descr;

            // If the object isn't extensible, we don't need to check for new
            // or deleted properties
            if (data.extensible) {

                props = data.properties.slice();
                proplen = props.length;
                keys = getProps(object);

                if (descs) {
                    while (i < keys.length) {
                        key = keys[i++];
                        idx = inArray(props, key);
                        descr = getDescriptor(object, key);

                        if (idx === -1) {
                            addChangeRecord(object, data, {
                                name: key,
                                type: "add",
                                object: object
                            }, except);
                            data.properties.push(key);
                            values.push(object[key]);
                            descs.push(descr);
                        } else {
                            props[idx] = null;
                            proplen--;
                            updateCheck(object, data, idx, except, descr);
                        }
                    }
                    deletionCheck(object, props, proplen, data, except);

                    if (!O.isExtensible(object)) {
                        data.extensible = false;
                        addChangeRecord(object, data, {
                            type: "preventExtensions",
                            object: object
                        }, except);

                        data.frozen = O.isFrozen(object);
                    }
                } else {
                    while (i < keys.length) {
                        key = keys[i++];
                        idx = inArray(props, key);
                        value = object[key];

                        if (idx === -1) {
                            addChangeRecord(object, data, {
                                name: key,
                                type: "add",
                                object: object
                            }, except);
                            data.properties.push(key);
                            values.push(value);
                        } else {
                            props[idx] = null;
                            proplen--;
                            updateCheck(object, data, idx, except);
                        }
                    }
                    deletionCheck(object, props, proplen, data, except);
                }
            } else if (!data.frozen) {

                // If the object is not extensible, but not frozen, we just have
                // to check for value changes
                for (; i < props.length; i++) {
                    key = props[i];
                    updateCheck(object, data, i, except, getDescriptor(object, key));
                }

                if (O.isFrozen(object)) data.frozen = true;
            }

            if (getPrototype) {
                proto = getPrototype(object);
                if (proto !== data.proto) {
                    addChangeRecord(object, data, {
                        type: "setPrototype",
                        name: "__proto__",
                        object: object,
                        oldValue: data.proto
                    });
                    data.proto = proto;
                }
            }
        };
    }(),


    /**
     * Sets up the main loop for object observation and change notification
     * It stops if no object is observed.
     * @function runGlobalLoop
     */
    runGlobalLoop = function runGlobalLoop() {
        if (observed.size) {
            observed.forEach(performPropertyChecks);
            handlers.forEach(deliverHandlerRecords);
            nextFrame(runGlobalLoop);
        }
    },


    /**
     * Deliver the change records relative to a certain handler, and resets
     * the record list.
     * @param {HandlerData} hdata
     * @param {Handler} handler
     */
    deliverHandlerRecords = function deliverHandlerRecords(hdata, handler) {
        var records = hdata.changeRecords;
        if (records.length) {
            hdata.changeRecords = [];
            handler(records);
        }
    },


    /**
     * Returns the notifier for an object - whether it's observed or not
     * @function retrieveNotifier
     * @param {Object} object
     * @param {ObjectData} [data]
     * @returns {Notifier}
     */
    retrieveNotifier = function retrieveNotifier(object, data) {
        if (arguments.length < 2) data = observed.get(object);

        /** @type {Notifier} */
        return data && data.notifier || {
            /**
             * @method notify
             * @see http://arv.github.io/ecmascript-object-observe/#notifierprototype._notify
             * @memberof Notifier
             * @param {ChangeRecord} changeRecord
             */
            notify: function notify(changeRecord) {
                changeRecord.type; // Just to check the property is there...

                // If there's no data, the object has been unobserved
                var data = observed.get(object);
                if (data) {
                    var recordCopy = { object: object },
                        prop;
                    for (prop in changeRecord) {
                        if (prop !== "object") recordCopy[prop] = changeRecord[prop];
                    }addChangeRecord(object, data, recordCopy);
                }
            },

            /**
             * @method performChange
             * @see http://arv.github.io/ecmascript-object-observe/#notifierprototype_.performchange
             * @memberof Notifier
             * @param {String} changeType
             * @param {Performer} func     The task performer
             * @param {*} [thisObj]        Used to set `this` when calling func
             */
            performChange: function performChange(changeType, func /*, thisObj*/) {
                if (typeof changeType !== "string") throw new TypeError("Invalid non-string changeType");

                if (typeof func !== "function") throw new TypeError("Cannot perform non-function");

                // If there's no data, the object has been unobserved
                var data = observed.get(object),
                    prop,
                    changeRecord,
                    thisObj = arguments[2],
                    result = thisObj === _undefined ? func() : func.call(thisObj);

                data && performPropertyChecks(data, object, changeType);

                // If there's no data, the object has been unobserved
                if (data && result && (typeof result === 'undefined' ? 'undefined' : _typeof(result)) === "object") {
                    changeRecord = { object: object, type: changeType };
                    for (prop in result) {
                        if (prop !== "object" && prop !== "type") changeRecord[prop] = result[prop];
                    }addChangeRecord(object, data, changeRecord);
                }
            }
        };
    },


    /**
     * Register (or redefines) an handler in the collection for a given
     * object and a given type accept list.
     * @function setHandler
     * @param {Object} object
     * @param {ObjectData} data
     * @param {Handler} handler
     * @param {String[]} acceptList
     */
    setHandler = function setHandler(object, data, handler, acceptList) {
        var hdata = handlers.get(handler);
        if (!hdata) handlers.set(handler, hdata = {
            observed: createMap(),
            changeRecords: []
        });
        hdata.observed.set(object, {
            acceptList: acceptList.slice(),
            data: data
        });
        data.handlers.set(handler, hdata);
    },


    /**
     * Adds a change record in a given ObjectData
     * @function addChangeRecord
     * @param {Object} object
     * @param {ObjectData} data
     * @param {ChangeRecord} changeRecord
     * @param {String} [except]
     */
    addChangeRecord = function addChangeRecord(object, data, changeRecord, except) {
        data.handlers.forEach(function (hdata) {
            var acceptList = hdata.observed.get(object).acceptList;
            // If except is defined, Notifier.performChange has been
            // called, with except as the type.
            // All the handlers that accepts that type are skipped.
            if ((typeof except !== "string" || inArray(acceptList, except) === -1) && inArray(acceptList, changeRecord.type) > -1) hdata.changeRecords.push(changeRecord);
        });
    };

    observed = createMap();
    handlers = createMap();

    /**
     * @function Object.observe
     * @see http://arv.github.io/ecmascript-object-observe/#Object.observe
     * @param {Object} object
     * @param {Handler} handler
     * @param {String[]} [acceptList]
     * @throws {TypeError}
     * @returns {Object}               The observed object
     */
    P.oo.observe = function observe(object, handler, acceptList) {
        if (!object || (typeof object === 'undefined' ? 'undefined' : _typeof(object)) !== "object" && typeof object !== "function") throw new TypeError("Object.observe cannot observe non-object");

        if (typeof handler !== "function") throw new TypeError("Object.observe cannot deliver to non-function");

        if (O.isFrozen && O.isFrozen(handler)) throw new TypeError("Object.observe cannot deliver to a frozen function object");

        if (acceptList === _undefined) acceptList = defaultAcceptList;else if (!acceptList || (typeof acceptList === 'undefined' ? 'undefined' : _typeof(acceptList)) !== "object") throw new TypeError("Third argument to Object.observe must be an array of strings.");

        doObserve(object, handler, acceptList);

        return object;
    };

    /**
     * @function Object.unobserve
     * @see http://arv.github.io/ecmascript-object-observe/#Object.unobserve
     * @param {Object} object
     * @param {Handler} handler
     * @throws {TypeError}
     * @returns {Object}         The given object
     */
    P.oo.unobserve = function unobserve(object, handler) {
        if (object === null || (typeof object === 'undefined' ? 'undefined' : _typeof(object)) !== "object" && typeof object !== "function") throw new TypeError("Object.unobserve cannot unobserve non-object");

        if (typeof handler !== "function") throw new TypeError("Object.unobserve cannot deliver to non-function");

        var hdata = handlers.get(handler),
            odata;

        if (hdata && (odata = hdata.observed.get(object))) {
            hdata.observed.forEach(function (odata, object) {
                performPropertyChecks(odata.data, object);
            });
            nextFrame(function () {
                deliverHandlerRecords(hdata, handler);
            });

            // In Firefox 13-18, size is a function, but createMap should fall
            // back to the shim for those versions
            if (hdata.observed.size === 1 && hdata.observed.has(object)) handlers["delete"](handler);else hdata.observed["delete"](object);

            if (odata.data.handlers.size === 1) observed["delete"](object);else odata.data.handlers["delete"](handler);
        }

        return object;
    };

    /**
     * @function Object.getNotifier
     * @see http://arv.github.io/ecmascript-object-observe/#GetNotifier
     * @param {Object} object
     * @throws {TypeError}
     * @returns {Notifier}
     */
    P.oo.getNotifier = function getNotifier(object) {
        if (object === null || (typeof object === 'undefined' ? 'undefined' : _typeof(object)) !== "object" && typeof object !== "function") throw new TypeError("Object.getNotifier cannot getNotifier non-object");

        if (O.isFrozen && O.isFrozen(object)) return null;

        return retrieveNotifier(object);
    };

    /**
     * @function Object.deliverChangeRecords
     * @see http://arv.github.io/ecmascript-object-observe/#Object.deliverChangeRecords
     * @see http://arv.github.io/ecmascript-object-observe/#DeliverChangeRecords
     * @param {Handler} handler
     * @throws {TypeError}
     */
    P.oo.deliverChangeRecords = function deliverChangeRecords(handler) {
        if (typeof handler !== "function") throw new TypeError("Object.deliverChangeRecords cannot deliver to non-function");

        var hdata = handlers.get(handler);
        if (hdata) {
            hdata.observed.forEach(function (odata, object) {
                performPropertyChecks(odata.data, object);
            });
            deliverHandlerRecords(hdata, handler);
        }
    };
})(Proxy, Object, Array, undefined);

},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.RaziloBindIdenticalAlterer = exports.RaziloBindEqualAlterer = exports.RaziloBindTrimAlterer = exports.RaziloBindSuffixAlterer = exports.RaziloBindPrefixAlterer = exports.RaziloBindNotAlterer = exports.RaziloBindJsonAlterer = exports.RaziloBindJoinAlterer = exports.RaziloBindDateAlterer = exports.RaziloBindAlterer = undefined;

var _alterer = require('./src/alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

var _dateAlterer = require('./src/date.alterer.js');

var _dateAlterer2 = _interopRequireDefault(_dateAlterer);

var _joinAlterer = require('./src/join.alterer.js');

var _joinAlterer2 = _interopRequireDefault(_joinAlterer);

var _jsonAlterer = require('./src/json.alterer.js');

var _jsonAlterer2 = _interopRequireDefault(_jsonAlterer);

var _notAlterer = require('./src/not.alterer.js');

var _notAlterer2 = _interopRequireDefault(_notAlterer);

var _prefixAlterer = require('./src/prefix.alterer.js');

var _prefixAlterer2 = _interopRequireDefault(_prefixAlterer);

var _suffixAlterer = require('./src/suffix.alterer.js');

var _suffixAlterer2 = _interopRequireDefault(_suffixAlterer);

var _trimAlterer = require('./src/trim.alterer.js');

var _trimAlterer2 = _interopRequireDefault(_trimAlterer);

var _equalAlterer = require('./src/equal.alterer.js');

var _equalAlterer2 = _interopRequireDefault(_equalAlterer);

var _identicalAlterer = require('./src/identical.alterer.js');

var _identicalAlterer2 = _interopRequireDefault(_identicalAlterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.RaziloBindAlterer = _alterer2.default;
exports.RaziloBindDateAlterer = _dateAlterer2.default;
exports.RaziloBindJoinAlterer = _joinAlterer2.default;
exports.RaziloBindJsonAlterer = _jsonAlterer2.default;
exports.RaziloBindNotAlterer = _notAlterer2.default;
exports.RaziloBindPrefixAlterer = _prefixAlterer2.default;
exports.RaziloBindSuffixAlterer = _suffixAlterer2.default;
exports.RaziloBindTrimAlterer = _trimAlterer2.default;
exports.RaziloBindEqualAlterer = _equalAlterer2.default;
exports.RaziloBindIdenticalAlterer = _identicalAlterer2.default;

},{"./src/alterer.js":5,"./src/date.alterer.js":6,"./src/equal.alterer.js":7,"./src/identical.alterer.js":8,"./src/join.alterer.js":9,"./src/json.alterer.js":10,"./src/not.alterer.js":11,"./src/prefix.alterer.js":12,"./src/suffix.alterer.js":13,"./src/trim.alterer.js":14}],5:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Alterer
 * Generic alterer methods used accross all alterers
 */
var Alterer = function () {
	function Alterer() {
		_classCallCheck(this, Alterer);

		this.name = undefined;
		this.accepts = [];
	}

	Alterer.prototype.detect = function detect(name, resolved) {
		if (name !== this.name) return false;
		if (this.accepts.length !== 0 && this.accepts.indexOf(typeof resolved === "undefined" ? "undefined" : _typeof(resolved)) < 0) return false;
		return true;
	};

	return Alterer;
}();

exports.default = Alterer;

},{}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

var _razilobindCore = require('razilobind-core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Date Alterer
 * Alters various data to a date string in (options) format
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var DateAlterer = function (_Alterer) {
	_inherits(DateAlterer, _Alterer);

	function DateAlterer() {
		_classCallCheck(this, DateAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'date';
		_this.accepts = ['string', 'number', 'object', 'symbol'];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	DateAlterer.prototype.alter = function alter(resolved, options) {
		var dateObj = void 0;

		if ((typeof resolved === 'undefined' ? 'undefined' : _typeof(resolved)) === 'symbol') dateObj = new Date(Date.parse(String(Symbol(resolved))));else if (!isNaN(resolved) && resolved !== null) dateObj = new Date(resolved);else if (typeof resolved === 'string' && resolved.length > 0) dateObj = new Date(Date.parse(resolved));else if (resolved instanceof Date) dateObj = resolved;else return '';

		return _razilobindCore.RaziloBindDateFormat.dateFormat(dateObj, options);
	};

	return DateAlterer;
}(_alterer2.default);

exports.default = DateAlterer;

},{"./alterer.js":5,"razilobind-core":37}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Equal Alterer
 * Alters any data to its boolean opposite
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var EqualAlterer = function (_Alterer) {
	_inherits(EqualAlterer, _Alterer);

	function EqualAlterer() {
		_classCallCheck(this, EqualAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'equal';
		_this.accepts = [];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	EqualAlterer.prototype.alter = function alter(resolved, options) {
		return resolved == options;
	};

	return EqualAlterer;
}(_alterer2.default);

exports.default = EqualAlterer;

},{"./alterer.js":5}],8:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Identical Alterer
 * Alters any data to its boolean opposite
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var IdenticalAlterer = function (_Alterer) {
	_inherits(IdenticalAlterer, _Alterer);

	function IdenticalAlterer() {
		_classCallCheck(this, IdenticalAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'identical';
		_this.accepts = [];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	IdenticalAlterer.prototype.alter = function alter(resolved, options) {
		return resolved === options;
	};

	return IdenticalAlterer;
}(_alterer2.default);

exports.default = IdenticalAlterer;

},{"./alterer.js":5}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Join Alterer
 * Joins the values of object or array as a string
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var JoinAlterer = function (_Alterer) {
	_inherits(JoinAlterer, _Alterer);

	function JoinAlterer() {
		_classCallCheck(this, JoinAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'join';
		_this.accepts = ['object'];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	JoinAlterer.prototype.alter = function alter(resolved, options) {
		var result = '';
		for (var key in resolved) {
			result = result + String(resolved[key]);
		}return result;
	};

	return JoinAlterer;
}(_alterer2.default);

exports.default = JoinAlterer;

},{"./alterer.js":5}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * JSON Alterer
 * Alters any type of data to a JSON string
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var JsonAlterer = function (_Alterer) {
	_inherits(JsonAlterer, _Alterer);

	function JsonAlterer() {
		_classCallCheck(this, JsonAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'json';
		_this.accepts = [];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	JsonAlterer.prototype.alter = function alter(resolved, options) {
		return JSON.stringify(resolved);
	};

	return JsonAlterer;
}(_alterer2.default);

exports.default = JsonAlterer;

},{"./alterer.js":5}],11:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Not Alterer
 * Alters any data to its boolean opposite
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var NotAlterer = function (_Alterer) {
	_inherits(NotAlterer, _Alterer);

	function NotAlterer() {
		_classCallCheck(this, NotAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'not';
		_this.accepts = [];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	NotAlterer.prototype.alter = function alter(resolved, options) {
		return !resolved;
	};

	return NotAlterer;
}(_alterer2.default);

exports.default = NotAlterer;

},{"./alterer.js":5}],12:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Prefix Alterer
 * Adds anything to start of a string
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var PrefixAlterer = function (_Alterer) {
	_inherits(PrefixAlterer, _Alterer);

	function PrefixAlterer() {
		_classCallCheck(this, PrefixAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'prefix';
		_this.accepts = ['string'];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	PrefixAlterer.prototype.alter = function alter(resolved, options) {
		return String(options) + resolved;
	};

	return PrefixAlterer;
}(_alterer2.default);

exports.default = PrefixAlterer;

},{"./alterer.js":5}],13:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Suffix Alterer
 * Adds anything to end of a string
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var SuffixAlterer = function (_Alterer) {
	_inherits(SuffixAlterer, _Alterer);

	function SuffixAlterer() {
		_classCallCheck(this, SuffixAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'suffix';
		_this.accepts = ['string'];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	SuffixAlterer.prototype.alter = function alter(resolved, options) {
		return resolved + String(options);
	};

	return SuffixAlterer;
}(_alterer2.default);

exports.default = SuffixAlterer;

},{"./alterer.js":5}],14:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _alterer = require('./alterer.js');

var _alterer2 = _interopRequireDefault(_alterer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Trim Alterer
 * Alters string data by triming it of whitespace
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 */
var TrimAlterer = function (_Alterer) {
	_inherits(TrimAlterer, _Alterer);

	function TrimAlterer() {
		_classCallCheck(this, TrimAlterer);

		var _this = _possibleConstructorReturn(this, _Alterer.call(this));

		_this.name = 'trim';
		_this.accepts = ['string'];
		return _this;
	}

	/**
  * alter()
  * Changes resolved data based on options
  * @param mixed resolved The data to change
  * @param mixed options Any options sent in with the alterer
  * @return mixed Changed resolved data
  */


	TrimAlterer.prototype.alter = function alter(resolved, options) {
		return resolved.trim();
	};

	return TrimAlterer;
}(_alterer2.default);

exports.default = TrimAlterer;

},{"./alterer.js":5}],15:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.RaziloBindModelBinder = exports.RaziloBindInitBinder = exports.RaziloBindEventBinder = exports.RaziloBindCheckedBinder = exports.RaziloBindValueBinder = exports.RaziloBindElseBinder = exports.RaziloBindIfBinder = exports.RaziloBindSelectedBinder = exports.RaziloBindRequiredBinder = exports.RaziloBindDisabledBinder = exports.RaziloBindHrefBinder = exports.RaziloBindSrcBinder = exports.RaziloBindAttributesBinder = exports.RaziloBindClassBinder = exports.RaziloBindStyleBinder = exports.RaziloBindHideBinder = exports.RaziloBindShowBinder = exports.RaziloBindHtmlBinder = exports.RaziloBindTextBinder = exports.RaziloBindForBinder = exports.RaziloBindBinder = undefined;

var _binder = require('./src/binder.js');

var _binder2 = _interopRequireDefault(_binder);

var _forBinder = require('./src/for.binder.js');

var _forBinder2 = _interopRequireDefault(_forBinder);

var _textBinder = require('./src/text.binder.js');

var _textBinder2 = _interopRequireDefault(_textBinder);

var _htmlBinder = require('./src/html.binder.js');

var _htmlBinder2 = _interopRequireDefault(_htmlBinder);

var _showBinder = require('./src/show.binder.js');

var _showBinder2 = _interopRequireDefault(_showBinder);

var _hideBinder = require('./src/hide.binder.js');

var _hideBinder2 = _interopRequireDefault(_hideBinder);

var _styleBinder = require('./src/style.binder.js');

var _styleBinder2 = _interopRequireDefault(_styleBinder);

var _classBinder = require('./src/class.binder.js');

var _classBinder2 = _interopRequireDefault(_classBinder);

var _attributesBinder = require('./src/attributes.binder.js');

var _attributesBinder2 = _interopRequireDefault(_attributesBinder);

var _srcBinder = require('./src/src.binder.js');

var _srcBinder2 = _interopRequireDefault(_srcBinder);

var _hrefBinder = require('./src/href.binder.js');

var _hrefBinder2 = _interopRequireDefault(_hrefBinder);

var _disabledBinder = require('./src/disabled.binder.js');

var _disabledBinder2 = _interopRequireDefault(_disabledBinder);

var _requiredBinder = require('./src/required.binder.js');

var _requiredBinder2 = _interopRequireDefault(_requiredBinder);

var _selectedBinder = require('./src/selected.binder.js');

var _selectedBinder2 = _interopRequireDefault(_selectedBinder);

var _ifBinder = require('./src/if.binder.js');

var _ifBinder2 = _interopRequireDefault(_ifBinder);

var _elseBinder = require('./src/else.binder.js');

var _elseBinder2 = _interopRequireDefault(_elseBinder);

var _valueBinder = require('./src/value.binder.js');

var _valueBinder2 = _interopRequireDefault(_valueBinder);

var _checkedBinder = require('./src/checked.binder.js');

var _checkedBinder2 = _interopRequireDefault(_checkedBinder);

var _eventBinder = require('./src/event.binder.js');

var _eventBinder2 = _interopRequireDefault(_eventBinder);

var _initBinder = require('./src/init.binder.js');

var _initBinder2 = _interopRequireDefault(_initBinder);

var _modelBinder = require('./src/model.binder.js');

var _modelBinder2 = _interopRequireDefault(_modelBinder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.RaziloBindBinder = _binder2.default;
exports.RaziloBindForBinder = _forBinder2.default;
exports.RaziloBindTextBinder = _textBinder2.default;
exports.RaziloBindHtmlBinder = _htmlBinder2.default;
exports.RaziloBindShowBinder = _showBinder2.default;
exports.RaziloBindHideBinder = _hideBinder2.default;
exports.RaziloBindStyleBinder = _styleBinder2.default;
exports.RaziloBindClassBinder = _classBinder2.default;
exports.RaziloBindAttributesBinder = _attributesBinder2.default;
exports.RaziloBindSrcBinder = _srcBinder2.default;
exports.RaziloBindHrefBinder = _hrefBinder2.default;
exports.RaziloBindDisabledBinder = _disabledBinder2.default;
exports.RaziloBindRequiredBinder = _requiredBinder2.default;
exports.RaziloBindSelectedBinder = _selectedBinder2.default;
exports.RaziloBindIfBinder = _ifBinder2.default;
exports.RaziloBindElseBinder = _elseBinder2.default;
exports.RaziloBindValueBinder = _valueBinder2.default;
exports.RaziloBindCheckedBinder = _checkedBinder2.default;
exports.RaziloBindEventBinder = _eventBinder2.default;
exports.RaziloBindInitBinder = _initBinder2.default;
exports.RaziloBindModelBinder = _modelBinder2.default;

},{"./src/attributes.binder.js":16,"./src/binder.js":17,"./src/checked.binder.js":18,"./src/class.binder.js":19,"./src/disabled.binder.js":20,"./src/else.binder.js":21,"./src/event.binder.js":22,"./src/for.binder.js":23,"./src/hide.binder.js":24,"./src/href.binder.js":25,"./src/html.binder.js":26,"./src/if.binder.js":27,"./src/init.binder.js":28,"./src/model.binder.js":29,"./src/required.binder.js":30,"./src/selected.binder.js":31,"./src/show.binder.js":32,"./src/src.binder.js":33,"./src/style.binder.js":34,"./src/text.binder.js":35,"./src/value.binder.js":36}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Attributes Binder
 * Alters elements attributes based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var AttributesBinder = function (_Binder) {
	_inherits(AttributesBinder, _Binder);

	function AttributesBinder(options, traverser) {
		_classCallCheck(this, AttributesBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'attributes';
		_this.accepts = ['property', 'phantom', 'object', 'array', 'string', 'method'];
		_this.attributes = {};
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	AttributesBinder.prototype.bind = function bind() {
		// add new and update existing attributes
		var attributes = {};
		var atts = typeof this.resolver.resolved === 'string' ? [this.resolver.resolved.trim()] : this.resolver.resolved;
		for (var a in atts) {
			var attr = isNaN(a) ? a.trim() : atts[a].trim();
			var val = isNaN(a) ? atts[a] : true;
			attributes[attr] = val;

			if (typeof val === 'boolean') {
				if (!!val) this.node.setAttribute(attr, '');else this.node.removeAttribute(attr, '');
			} else this.node.setAttribute(attr, val);
		}

		// remove any attributes that have gone
		for (var b in this.attributes) {
			if (!!attributes[b]) continue;
			this.node.removeAttribute(b);
		}

		// update cache
		this.attributes = attributes;
	};

	return AttributesBinder;
}(_binder2.default);

exports.default = AttributesBinder;

},{"./binder.js":17}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _razilobindCore = require('razilobind-core');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Binder
 * Generic binder methods used accross all binders
 */
var Binder = function () {
	function Binder() {
		_classCallCheck(this, Binder);

		this.id = Math.random().toString(36).slice(2) + Date.now(); // create unique id for binder
		this.options = undefined;
		this.traverser = undefined;
		this.name = undefined;
		this.observables = [];
		this.accepts = [];
	}

	Binder.prototype.setup = function setup(options, traverser) {
		this.options = options;
		this.traverser = traverser;
	};

	/**
  * detect()
  * Basic detection of an element by its attribute, setting resolvable
  * @param html-node node The node to detect any bindables on
  * @return bool True on bindable, false on fail
  */


	Binder.prototype.detect = function detect(node) {
		// allow element nodes only
		if (node.nodeType !== 1) return false;

		this.resolvable = node.hasAttribute(this.options.prefix + 'bind-' + this.name) ? node.getAttribute(this.options.prefix + 'bind-' + this.name) : undefined;
		this.configurable = node.hasAttribute(this.options.prefix + 'config-' + this.name) ? node.getAttribute(this.options.prefix + 'config-' + this.name) : undefined;
		this.alterable = node.hasAttribute(this.options.prefix + 'alter-' + this.name) ? node.getAttribute(this.options.prefix + 'alter-' + this.name) : undefined;

		if (!this.resolvable) return false;

		this.node = node;
		return true;
	};

	/**
  * build()
  * Build a bindable object and try to resolve data, if resolved creates initial bind too
  * @param object model The model to attempt to build the binder against
  * @return Binder The binder of specific type
  */


	Binder.prototype.build = function build(model) {
		// set bindable data
		this.priority = 1;
		this.resolver = _razilobindCore.RaziloBindCoreDetector.resolver(this.resolvable, this.node);
		this.alterer = _razilobindCore.RaziloBindCoreDetector.resolver(this.alterable, this.node);
		this.config = _razilobindCore.RaziloBindCoreDetector.resolver(this.configurable, this.node);
		this.model = model;

		// resolve data to actuals and observables if of correct type or no types set
		if (this.resolver && (this.accepts.length === 0 || this.accepts.indexOf(this.resolver.name) >= 0)) this.update();

		// collate binders
		if (this.resolver.observers) for (var i = 0; i < this.resolver.observers.length; i++) {
			if (this.observables.indexOf(this.resolver.observers[i]) < 0) this.observables.push(this.resolver.observers[i]);
		}if (this.alterer.observers) for (var _i = 0; _i < this.alterer.observers.length; _i++) {
			if (this.observables.indexOf(this.alterer.observers[_i]) < 0) this.observables.push(this.alterer.observers[_i]);
		}if (this.config.observers) for (var _i2 = 0; _i2 < this.config.observers.length; _i2++) {
			if (this.observables.indexOf(this.config.observers[_i2]) < 0) this.observables.push(this.config.observers[_i2]);
		}return this;
	};

	/**
  * update()
  * updates observers (as they can change if using properties as keys) and issue bind in child
  * @param object oldValue The old value once object change detect
  * @param string path The path that was affected (or the key if adding or removing a value to/from an object)
  * @param string action The action to perform, 'update', 'array-add', 'array-remove', 'object-add', 'object-remove'
  * @param object key The key name if an object value is added or removed
  */


	Binder.prototype.update = function update(oldValue, path, action, key) {
		// resolve data, bind to element from child class
		this.resolver.resolve(this.model, this.delayMethod === true ? true : false);
		var newValue = this.resolver.resolved;

		if (this.config) this.config.resolve(this.model);
		if (this.alterer) {
			this.alterer.resolve(this.model);
			this.resolver.resolved = _razilobindCore.RaziloBindCoreDetector.alterers(this.alterer.resolved, this.resolver.resolved);
		}

		this.bind(oldValue, path, action, key);

		// garbage collection on observables map which is only thing holding ref to binder (so binder will be released naturally)
		if (action === 'object-remove') delete this.traverser.observables[path + '.' + key];else if (action === 'array-remove') for (var i = newValue.length - 1; i < oldValue; i++) {
			delete this.traverser.observables[path + '.' + i];
		}
	};

	return Binder;
}();

exports.default = Binder;

},{"razilobind-core":37}],18:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Checked Binder
 * Binds resolved data to value attribute of elements such as input, textarea, select etc...
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var CheckedBinder = function (_Binder) {
	_inherits(CheckedBinder, _Binder);

	function CheckedBinder(options, traverser) {
		_classCallCheck(this, CheckedBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'checked';
		_this.accepts = ['property', 'phantom', 'method'];
		_this.event;
		_this.type;
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data to the node replacing contents
  * @param object oldValue The old value of the observed object
  */


	CheckedBinder.prototype.bind = function bind(oldValue, path) {
		// catch duplicate fires from ui
		if (this.node.value === this.resolver.resolved) return;

		// set value
		this.type = this.node.getAttribute('type');
		this.setValue();

		// should we watch for changes?
		if (!!this.event || this.resolver.observers.length < 1) return;

		// add event listener to node
		this.event = 'change';
		this.node.addEventListener(this.event, this.listener.bind(this), false);
	};

	/**
  * listener()
  * Update model when an element interaction updates its value
  * @param event event The event that triggers the update
  */


	CheckedBinder.prototype.listener = function listener(event) {
		event.stopPropagation();

		// last observer is the full observed path to resolver (others before can make up sub properties)
		var path = this.resolver.observers[this.resolver.observers.length - 1].split('.');
		var end = path.pop();

		// get parent object/array
		var model = this.model;
		for (var i = 0; i < path.length; i++) {
			model = model[path[i]];
		} // change model
		if (this.node.hasAttribute('type') && this.type == 'radio') model[end] = this.node.value;else model[end] = !!this.node.checked ? true : false;
	};

	/**
  * setValue()
  * Set a node value and attribute to ensure changes can be picked up by attribute watchers
  */


	CheckedBinder.prototype.setValue = function setValue() {
		if (this.node.hasAttribute('type') && this.type == 'radio') {
			// radio
			this.node.checked = this.node.value == this.resolver.resolved ? true : false;
			if (this.node.value == this.resolver.resolved) this.node.setAttribute('checked', '');else this.node.removeAttribute('checked');
		} else {
			// checkbox and others...
			this.node.checked = !!this.resolver.resolved ? true : false;
			if (!!this.resolver.resolved) this.node.setAttribute('checked', '');else this.node.removeAttribute('checked');
		}
	};

	return CheckedBinder;
}(_binder2.default);

exports.default = CheckedBinder;

},{"./binder.js":17}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Class Binder
 * Alters elements style based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var ClassBinder = function (_Binder) {
	_inherits(ClassBinder, _Binder);

	function ClassBinder(options, traverser) {
		_classCallCheck(this, ClassBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'class';
		_this.accepts = ['property', 'phantom', 'object', 'array', 'string', 'method'];
		_this.classnames = [];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	ClassBinder.prototype.bind = function bind() {
		var classnames = [];

		// add new classes if not already added
		var names = typeof this.resolver.resolved === 'string' ? [this.resolver.resolved.trim()] : this.resolver.resolved;
		for (var a in names) {
			var classname = isNaN(a) ? a.trim() : names[a].trim();
			if (typeof a === 'string' && !names[a]) continue; // skip falsy objects
			classnames.push(classname); // add already present to stack
			if (new RegExp('([^a-z0-9_-]{1}|^)' + classname + '([^a-z0-9_-]{1}|$)').test(this.node.className)) continue; // skip already present

			this.node.className += ' ' + classname + ' ';
			classnames.push(classname);
		}

		// remove any that where there previosly but now not in stack
		if (this.classnames.length > 0) {
			// remove any classes not in
			for (var i = 0; i < this.classnames.length; i++) {
				if (classnames.indexOf(this.classnames[i]) >= 0) continue;
				this.node.className = this.node.className.replace(new RegExp('([^a-z0-9_-]{1}|^)' + this.classnames[i] + '([^a-z0-9_-]{1}|$)', 'g'), ' ');
			}
		}

		// update node and cache stack
		this.node.className = this.node.className.replace(/\s{1}\s{1}/g, ' ');
		this.classnames = classnames;
	};

	return ClassBinder;
}(_binder2.default);

exports.default = ClassBinder;

},{"./binder.js":17}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Disabled Binder
 * Alters disabled attribute based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var DisabledBinder = function (_Binder) {
	_inherits(DisabledBinder, _Binder);

	function DisabledBinder(options, traverser) {
		_classCallCheck(this, DisabledBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'disabled';
		_this.accepts = ['property', 'phantom', 'object', 'string', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	DisabledBinder.prototype.bind = function bind() {
		if (!!this.resolver.resolved) this.node.setAttribute('disabled', '');else this.node.removeAttribute('disabled');
	};

	return DisabledBinder;
}(_binder2.default);

exports.default = DisabledBinder;

},{"./binder.js":17}],21:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Else Binder
 * Alters elements style based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var ElseBinder = function (_Binder) {
	_inherits(ElseBinder, _Binder);

	function ElseBinder(options, traverser) {
		_classCallCheck(this, ElseBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'else';
		_this.accepts = ['property', 'phantom', 'boolean', 'method'];
		_this.placeholder = null;
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	ElseBinder.prototype.bind = function bind() {
		if (!!this.resolver.resolved) {
			// insert placeholder
			this.placeholder = document.createComment('razilobind:else');
			this.node.parentNode.insertBefore(this.placeholder, this.node);
			this.node.parentNode.removeChild(this.node);
		} else if (this.placeholder) {
			this.placeholder.parentNode.insertBefore(this.node, this.placeholder);
			this.placeholder.parentNode.removeChild(this.placeholder);
			this.placeholder = null;
		}
	};

	return ElseBinder;
}(_binder2.default);

exports.default = ElseBinder;

},{"./binder.js":17}],22:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Event Binder
 * Bind methods to element events
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var EventBinder = function (_Binder) {
	_inherits(EventBinder, _Binder);

	function EventBinder(options, traverser) {
		_classCallCheck(this, EventBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'event';
		_this.delayMethod = true;
		_this.accepts = ['object'];
		_this.events = {};
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	EventBinder.prototype.bind = function bind(object) {
		// remove old events
		for (var name in this.events) {
			if (this.resolver.resolved[name]) continue;
			this.node.removeEventListener(name, this.listener, false);
			delete this.events[name];
		}

		// add new events
		for (var _name in this.resolver.resolved) {
			if (!this.events[_name]) {
				if (typeof this.resolver.resolved[_name].method !== 'function') continue;
				this.node.addEventListener(_name, this.listener.bind(this), false);
			}
			this.events[_name] = this.resolver.resolved[_name];
		}
	};

	/**
  * listener()
  * Catch events on nodes and run functions set.
  * @param event event The event that triggers the update
  */


	EventBinder.prototype.listener = function listener(event) {
		event.stopPropagation();
		var values = [event].concat(this.events[event.type].values);
		this.events[event.type].method.apply(this.model, values);
	};

	return EventBinder;
}(_binder2.default);

exports.default = EventBinder;

},{"./binder.js":17}],23:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _razilobindCore = require('razilobind-core');

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * For Binder
 * Alters elements style based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, config, model, accepts
 */
var ForBinder = function (_Binder) {
	_inherits(ForBinder, _Binder);

	function ForBinder(options, traverser) {
		_classCallCheck(this, ForBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'for';
		_this.accepts = ['property', 'phantom', 'method', 'array', 'object'];
		_this.placeholder = {};
		_this.children = [];
		return _this;
	}

	/**
  * OVERRIDE:detect()
  * Basic detection of an element by its attribute, setting resolvable
  * @param html-node node The node to detect any bindables on
  * @return bool True on bindable, false on fail
  */


	ForBinder.prototype.detect = function detect(node) {
		// allow element nodes only
		if (node.nodeType !== 1) return false;

		this.resolvable = node.hasAttribute(this.options.prefix + 'bind-' + this.name) ? node.getAttribute(this.options.prefix + 'bind-' + this.name) : undefined;
		this.configurable = node.hasAttribute(this.options.prefix + 'config-' + this.name) ? node.getAttribute(this.options.prefix + 'config-' + this.name) : undefined;
		this.alterable = node.hasAttribute(this.options.prefix + 'alter-' + this.name) ? node.getAttribute(this.options.prefix + 'alter-' + this.name) : undefined;
		this.orderable = node.hasAttribute(this.options.prefix + 'order-' + this.name) ? node.getAttribute(this.options.prefix + 'order-' + this.name) : undefined;
		this.filterable = node.hasAttribute(this.options.prefix + 'filter-' + this.name) ? node.getAttribute(this.options.prefix + 'filter-' + this.name) : undefined;
		this.limitable = node.hasAttribute(this.options.prefix + 'limit-' + this.name) ? node.getAttribute(this.options.prefix + 'limit-' + this.name) : undefined;
		this.offsetable = node.hasAttribute(this.options.prefix + 'offset-' + this.name) ? node.getAttribute(this.options.prefix + 'offset-' + this.name) : undefined;

		if (!this.resolvable) return false;

		this.node = node;
		return true;
	};

	/**
  * OVERRIDE:build()
  * Build a bindable object and try to resolve data, if resolved creates initial bind too
  * @param object model The model to attempt to build the binder against
  * @return Binder The binder of specific type
  */


	ForBinder.prototype.build = function build(model) {
		// set bindable data
		this.priority = 1;
		this.resolver = _razilobindCore.RaziloBindCoreDetector.resolver(this.resolvable, this.node);
		this.alterer = _razilobindCore.RaziloBindCoreDetector.resolver(this.alterable, this.node);
		this.config = _razilobindCore.RaziloBindCoreDetector.resolver(this.configurable, this.node);
		this.order = _razilobindCore.RaziloBindCoreDetector.resolver(this.orderable, this.node);
		this.filter = _razilobindCore.RaziloBindCoreDetector.resolver(this.filterable, this.node);
		this.limit = _razilobindCore.RaziloBindCoreDetector.resolver(this.limitable, this.node);
		this.offset = _razilobindCore.RaziloBindCoreDetector.resolver(this.offsetable, this.node);
		this.model = model;

		// resolve data to actuals and observables if of correct type or no types set
		if (this.resolver && (this.accepts.length === 0 || this.accepts.indexOf(this.resolver.name) >= 0)) this.update();

		// collate binders
		if (this.resolver.observers) for (var i = 0; i < this.resolver.observers.length; i++) {
			if (this.observables.indexOf(this.resolver.observers[i]) < 0) this.observables.push(this.resolver.observers[i]);
		}if (this.alterer.observers) for (var _i = 0; _i < this.alterer.observers.length; _i++) {
			if (this.observables.indexOf(this.alterer.observers[_i]) < 0) this.observables.push(this.alterer.observers[_i]);
		}if (this.config.observers) for (var _i2 = 0; _i2 < this.config.observers.length; _i2++) {
			if (this.observables.indexOf(this.config.observers[_i2]) < 0) this.observables.push(this.config.observers[_i2]);
		}if (this.order.observers) for (var _i3 = 0; _i3 < this.order.observers.length; _i3++) {
			if (this.observables.indexOf(this.order.observers[_i3]) < 0) this.observables.push(this.order.observers[_i3]);
		}if (this.filter.observers) for (var _i4 = 0; _i4 < this.filter.observers.length; _i4++) {
			if (this.observables.indexOf(this.filter.observers[_i4]) < 0) this.observables.push(this.filter.observers[_i4]);
		}if (this.limit.observers) for (var _i5 = 0; _i5 < this.limit.observers.length; _i5++) {
			if (this.observables.indexOf(this.limit.observers[_i5]) < 0) this.observables.push(this.limit.observers[_i5]);
		}if (this.offset.observers) for (var _i6 = 0; _i6 < this.offset.observers.length; _i6++) {
			if (this.observables.indexOf(this.offset.observers[_i6]) < 0) this.observables.push(this.offset.observers[_i6]);
		}return this;
	};

	/**
  * OVERRIDE:update()
  * updates observers (as they can change if using properties as keys) and issue bind in child
  * @param object oldValue The old value once object change detect
  * @param string path The path that was affected (or the key if adding or removing a value to/from an object)
  * @param string action The action to perform, 'update', 'array-add', 'array-remove', 'object-add', 'object-remove'
  * @param object key The key name if an object value is added or removed
  */


	ForBinder.prototype.update = function update(oldValue, path, action, key) {
		// resolve data, bind to element from child class
		this.resolver.resolve(this.model);
		var newValue = this.resolver.resolved;

		if (this.config) this.config.resolve(this.model);
		if (this.order) this.order.resolve(this.model);
		if (this.filter) this.filter.resolve(this.model);
		if (this.limit) this.limit.resolve(this.model);
		if (this.offset) this.offset.resolve(this.model);
		if (this.alterer) {
			// alter resolved value
			this.alterer.resolve(this.model);
			this.resolver.resolved = _razilobindCore.RaziloBindCoreDetector.alterers(this.alterer.resolved, this.resolver.resolved);
		}

		this.bind(oldValue, path, action, key);

		// garbage collection on observables map which is only thing holding ref to binder (so binder will be released naturally)
		if (action === 'object-remove') delete this.traverser.observables[path + '.' + key];else if (action === 'array-remove') for (var i = newValue.length - 1; i < oldValue; i++) {
			delete this.traverser.observables[path + '.' + i];
		}
	};

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	ForBinder.prototype.bind = function bind(oldValue, path, action, objectKey) {
		if (_typeof(this.resolver.resolved) !== 'object') return;

		// grab any config data
		var phantomKey = this.config && this.config.resolved.key ? this.config.resolved.key : '';
		var phantomValue = this.config && this.config.resolved.value ? this.config.resolved.value : '';
		var order = this.order && this.order.resolved ? this.order.resolved : undefined;
		var filter = this.filter && this.filter.resolved ? this.filter.resolved : undefined;

		// add placeholder and remove element from dom
		if (!this.placeholder.start) {
			this.placeholder.end = document.createComment('razilobind:for:end');
			if (this.node.nextSibling === null) this.node.parentNode.appendChild(this.placeholder.end);else this.node.parentNode.insertBefore(this.placeholder.end, this.node.nextSibling);

			this.placeholder.start = document.createComment('razilobind:for:start');
			this.placeholder.end.parentNode.insertBefore(this.placeholder.start, this.placeholder.end);

			this.node.parentNode.removeChild(this.node);
		}

		if (this.children.length > 0) {
			// remove any current children
			for (var _i7 = 0; _i7 < this.children.length; _i7++) {
				this.children[_i7].parentNode.removeChild(this.children[_i7]);
			}this.children = [];
		}

		// order and/or filter the resolved data, dont allow over length of data
		var orderedFiltered = this.orderFilter(this.resolver.resolved, order, filter);

		// limit and offset if either set
		if (this.offset || this.limit) {
			var offset = this.offset && this.offset.resolved ? parseInt(this.offset.resolved) : 0;
			var limit = this.limit && this.limit.resolved ? parseInt(this.limit.resolved) : 0;

			var nOffset = offset < 1 ? 0 : offset - 1;
			var nLimit = nOffset + limit < 1 ? 0 : (nOffset > 0 ? nOffset - 1 : nOffset) + limit;

			orderedFiltered.resolved = orderedFiltered.resolved.splice(nOffset, nLimit);
			if (orderedFiltered.map) orderedFiltered.map = orderedFiltered.map.splice(nOffset, nLimit);
		}

		for (var key in orderedFiltered.resolved) {
			var newNode = this.node.cloneNode(true);
			newNode.removeAttribute(this.options.prefix + 'bind-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'config-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'alter-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'order-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'filter-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'limit-' + this.name);
			newNode.removeAttribute(this.options.prefix + 'offset-' + this.name);
			newNode.phantom = {
				'iterationKey': orderedFiltered.map ? orderedFiltered.map[key] : key,
				'initialValue': orderedFiltered.resolved[key],
				'observers': this.resolver.observers,
				'keyName': phantomKey,
				'valueName': phantomValue
			};

			this.children.push(newNode);
		}

		// add children
		for (var i = 0; i < this.children.length; i++) {
			this.placeholder.end.parentNode.insertBefore(this.children[i], this.placeholder.end);
			if (path) this.traverser.traverse(this.children[i], this.model);
		}
	};

	// order data


	ForBinder.prototype.orderFilter = function orderFilter(resolved, orderBy, filterBy) {
		if (!resolved || !orderBy && !filterBy) return { map: undefined, resolved: resolved };

		var isArray = Array.isArray(resolved);
		var newOrder = [];
		var map = [];

		resolvedloop: for (var key in resolved) {
			// filter out any data before ordering
			if (filterBy) {
				for (var name in filterBy) {
					if (typeof filterBy[name] === 'string' && new RegExp("^" + filterBy[name].split('*').join('.*') + "$").test(resolved[key][name])) continue resolvedloop;else if (Array.isArray(filterBy[name]) && new RegExp("^" + filterBy[name].join('').split('*').join('.*') + "$").test(resolved[key][name])) continue resolvedloop;
				}
			}

			// if first bit of data or no order defined, push data
			if (map.length < 1 || !orderBy) {
				map.push(key);
				newOrder.push(resolved[key]);
				continue;
			}

			// get position for order
			orderloop: for (var i = 0; i < newOrder.length; i++) {
				for (var _name in orderBy) {
					if (orderBy[_name] == 'asc' && resolved[key][_name] > newOrder[i][_name]) continue orderloop;
					if (resolved[key][_name] == newOrder[i][_name]) continue;
					if (orderBy[_name] == 'desc' && resolved[key][_name] < newOrder[i][_name]) continue orderloop;
				}
				break;
			}

			// splice data into new stack
			map.splice(i, 0, key);
			newOrder.splice(i, 0, resolved[key]);
		}

		return { map: map, resolved: newOrder };
	};

	return ForBinder;
}(_binder2.default);

exports.default = ForBinder;

},{"./binder.js":17,"razilobind-core":37}],24:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Hide Binder
 * Hides element if data resolved to true
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var HideBinder = function (_Binder) {
	_inherits(HideBinder, _Binder);

	function HideBinder(options, traverser) {
		_classCallCheck(this, HideBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'hide';
		_this.accepts = [];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by showing or hiding node
  * @param object oldValue The old value of the observed object
  */


	HideBinder.prototype.bind = function bind() {
		if (!!this.resolver.resolved) this.node.style.display = 'none';else this.node.style.display = '';
	};

	return HideBinder;
}(_binder2.default);

exports.default = HideBinder;

},{"./binder.js":17}],25:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Href Binder
 * Alters href attribute based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var HrefBinder = function (_Binder) {
	_inherits(HrefBinder, _Binder);

	function HrefBinder(options, traverser) {
		_classCallCheck(this, HrefBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'href';
		_this.accepts = ['property', 'phantom', 'object', 'string', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	HrefBinder.prototype.bind = function bind() {
		// this.resolver.resolved
		if (typeof this.resolver.resolved !== 'string' || this.resolver.resolved.length < 1) this.node.removeAttribute('href');else this.node.setAttribute('href', this.resolver.resolved);
	};

	return HrefBinder;
}(_binder2.default);

exports.default = HrefBinder;

},{"./binder.js":17}],26:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * HTML Binder
 * Binds resolved data to element contents (innerHTML)
 * !!! USE WITH CAUTION ONLY BIND TRUSTED HTML !!!
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var HtmlBinder = function (_Binder) {
	_inherits(HtmlBinder, _Binder);

	function HtmlBinder(options, traverser) {
		_classCallCheck(this, HtmlBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'html';
		_this.accepts = ['string', 'property', 'phantom', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data to the node replacing contents
  * @param object oldValue The old value of the observed object
  */


	HtmlBinder.prototype.bind = function bind() {
		this.node.innerHTML = this.resolver.resolved;
	};

	return HtmlBinder;
}(_binder2.default);

exports.default = HtmlBinder;

},{"./binder.js":17}],27:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * If Binder
 * Alters elements style based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var IfBinder = function (_Binder) {
	_inherits(IfBinder, _Binder);

	function IfBinder(options, traverser) {
		_classCallCheck(this, IfBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'if';
		_this.accepts = ['property', 'phantom', 'boolean', 'method'];
		_this.placeholder = null;
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	IfBinder.prototype.bind = function bind() {
		if (!this.resolver.resolved) {
			// insert placeholder
			this.placeholder = document.createComment('razilobind:if');
			this.node.parentNode.insertBefore(this.placeholder, this.node);
			this.node.parentNode.removeChild(this.node);
		} else if (this.placeholder) {
			this.placeholder.parentNode.insertBefore(this.node, this.placeholder);
			this.placeholder.parentNode.removeChild(this.placeholder);
			this.placeholder = null;
		}
	};

	return IfBinder;
}(_binder2.default);

exports.default = IfBinder;

},{"./binder.js":17}],28:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Init Binder
 * Bind a method to initialization of element. A starting method good for things like collecting
 * data on start of your app, or preloading method.
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var InitBinder = function (_Binder) {
	_inherits(InitBinder, _Binder);

	function InitBinder(options, traverser) {
		_classCallCheck(this, InitBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'init';
		_this.delayMethod = true;
		_this.accepts = ['method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	InitBinder.prototype.bind = function bind(object) {
		document.addEventListener("DOMContentLoaded", this.listener.bind(this), false);
	};

	/**
  * listener()
  * Catch events on nodes and run functions set.
  * @param event event The event that triggers the update
  */


	InitBinder.prototype.listener = function listener(event) {
		event.stopPropagation();
		this.resolver.resolved.method.apply(this.model, this.resolver.resolved.values);
	};

	return InitBinder;
}(_binder2.default);

exports.default = InitBinder;

},{"./binder.js":17}],29:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Model Binder
 * Binds resolved data to model attribute of elements and model property of elements, if object, attribute will switch to changing description
 * to allow attribute change to be picked up by custom elements. Used primary to put data into a custom element
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var ModelBinder = function (_Binder) {
	_inherits(ModelBinder, _Binder);

	function ModelBinder(options, traverser) {
		_classCallCheck(this, ModelBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'model';
		_this.accepts = ['property', 'phantom', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data to the node replacing contents
  * @param object oldValue The old value of the observed object
  */


	ModelBinder.prototype.bind = function bind(oldValue, path) {
		// set value
		this.node.setAttribute('model', _typeof(this.resolver.resolved) === 'object' ? '[object]@' + new Date().getTime() : this.resolver.resolved);
		this.node.model = this.resolver.resolved;
	};

	return ModelBinder;
}(_binder2.default);

exports.default = ModelBinder;

},{"./binder.js":17}],30:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Required Binder
 * Alters required attribute based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var RequiredBinder = function (_Binder) {
	_inherits(RequiredBinder, _Binder);

	function RequiredBinder(options, traverser) {
		_classCallCheck(this, RequiredBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'required';
		_this.accepts = ['property', 'phantom', 'object', 'string', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	RequiredBinder.prototype.bind = function bind() {
		if (!!this.resolver.resolved) this.node.setAttribute('required', '');else this.node.removeAttribute('required');
	};

	return RequiredBinder;
}(_binder2.default);

exports.default = RequiredBinder;

},{"./binder.js":17}],31:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Selected Binder
 * Alters selected attribute based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var SelectedBinder = function (_Binder) {
	_inherits(SelectedBinder, _Binder);

	function SelectedBinder(options, traverser) {
		_classCallCheck(this, SelectedBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'selected';
		_this.accepts = ['property', 'phantom', 'object', 'string', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	SelectedBinder.prototype.bind = function bind() {
		if (typeof this.resolver.resolved === 'string' && this.resolver.resolved.length > 0) this.node.setAttribute('selected', this.resolver.resolved);else if (_typeof(this.resolver.resolved) === 'object' && this.resolver.resolved != null) {
			this.node.setAttribute('selected', '[object]@' + new Date().getTime());
			this.node.selected = this.resolver.resolved;
		} else if (!!this.resolver.resolved) this.node.setAttribute('selected', '');else this.node.removeAttribute('selected');
	};

	return SelectedBinder;
}(_binder2.default);

exports.default = SelectedBinder;

},{"./binder.js":17}],32:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Show Binder
 * Shows element if data resolved to true
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var ShowBinder = function (_Binder) {
	_inherits(ShowBinder, _Binder);

	function ShowBinder(options, traverser) {
		_classCallCheck(this, ShowBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'show';
		_this.accepts = [];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by showing hiding the node
  * @param object oldValue The old value of the observed object
  */


	ShowBinder.prototype.bind = function bind() {
		if (!!this.resolver.resolved) this.node.style.display = '';else this.node.style.display = 'none';
	};

	return ShowBinder;
}(_binder2.default);

exports.default = ShowBinder;

},{"./binder.js":17}],33:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Src Binder
 * Alters src attribute based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var SrcBinder = function (_Binder) {
	_inherits(SrcBinder, _Binder);

	function SrcBinder(options, traverser) {
		_classCallCheck(this, SrcBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'src';
		_this.accepts = ['property', 'phantom', 'object', 'string', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	SrcBinder.prototype.bind = function bind() {
		// this.resolver.resolved
		if (typeof this.resolver.resolved !== 'string' || this.resolver.resolved.length < 1) this.node.removeAttribute('src');else this.node.setAttribute('src', this.resolver.resolved);
	};

	return SrcBinder;
}(_binder2.default);

exports.default = SrcBinder;

},{"./binder.js":17}],34:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Style Binder
 * Alters elements style based on resolved data contents
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var StyleBinder = function (_Binder) {
	_inherits(StyleBinder, _Binder);

	function StyleBinder(options, traverser) {
		_classCallCheck(this, StyleBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'style';
		_this.accepts = ['property', 'phantom', 'object', 'method'];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data by applying styles to node
  * @param object oldValue The old value of the observed object
  */


	StyleBinder.prototype.bind = function bind(oldValue) {
		if (_typeof(this.resolver.resolved) !== 'object') return;

		// set new values
		for (var key in this.resolver.resolved) {
			if (typeof key !== 'string' || typeof this.resolver.resolved[key] !== 'string') continue;
			this.node.style[key] = this.resolver.resolved[key];
		}

		// remove any old values not set by new ones
		for (var key2 in oldValue) {
			if (typeof this.resolver.resolved[key2] !== 'undefined') continue;
			this.node.style[key2] = '';
		}
	};

	return StyleBinder;
}(_binder2.default);

exports.default = StyleBinder;

},{"./binder.js":17}],35:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Text Binder
 * Binds resolved data to element contents via HTML innerText
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var TextBinder = function (_Binder) {
	_inherits(TextBinder, _Binder);

	function TextBinder(options, traverser) {
		_classCallCheck(this, TextBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'text';
		_this.accepts = [];
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data to the node replacing contents
  * @param object oldValue The old value of the observed object
  */


	TextBinder.prototype.bind = function bind(oldValue, path) {
		this.node.innerText = String(_typeof(this.resolver.resolved) === 'symbol' ? Symbol(this.resolver.resolved) : this.resolver.resolved);
	};

	return TextBinder;
}(_binder2.default);

exports.default = TextBinder;

},{"./binder.js":17}],36:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _binder = require('./binder.js');

var _binder2 = _interopRequireDefault(_binder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Value Binder
 * Binds resolved data to value attribute of elements such as input, textarea, select etc...
 *
 * Inherits
 *
 * properties: options, node, resolvable, model, accepts
 * method: detect(node) { return bool }
 * method: build(model) { return binder }
 * method: update(newValue, oldValue) { }
 */
var ValueBinder = function (_Binder) {
	_inherits(ValueBinder, _Binder);

	function ValueBinder(options, traverser) {
		_classCallCheck(this, ValueBinder);

		var _this = _possibleConstructorReturn(this, _Binder.call(this));

		_this.options = options;
		_this.traverser = traverser;
		_this.name = 'value';
		_this.accepts = ['property', 'phantom', 'method'];
		_this.event;
		_this.tag;
		_this.type;
		return _this;
	}

	/**
  * bind()
  * Bind the resolved data to the node replacing contents
  * @param object oldValue The old value of the observed object
  */


	ValueBinder.prototype.bind = function bind(oldValue, path) {
		// set value
		this.tag = this.node.tagName.toLowerCase();
		this.type = this.node.getAttribute('type');
		if (this.type != 'file') {
			if (this.tag === 'select') setTimeout(this.setValue.bind(this), 1);else this.setValue();
		}

		// should we watch for changes?
		if (!!this.event || this.resolver.observers.length < 1 || this.tag === 'option' || this.type == 'radio') return;

		// add event listener to node
		this.event = this.eventType();
		this.node.addEventListener(this.event, this.listener.bind(this), false);
	};

	/**
  * listener()
  * Update model when an element interaction updates its value
  * @param event event The event that triggers the update
  */


	ValueBinder.prototype.listener = function listener(event) {
		event.stopPropagation();

		// last observer is the full observed path to resolver (others before can make up sub properties)
		var path = this.resolver.observers[this.resolver.observers.length - 1].split('.');
		var end = path.pop();

		// get parent object/array
		var model = this.model;
		for (var i = 0; i < path.length; i++) {
			model = model[path[i]];
		} // change model
		if (this.tag === 'select' && this.node.hasAttribute('multiple')) {
			var selected = [];
			var opts = this.node.querySelectorAll('option');
			for (var i = 0; i < opts.length; i++) {
				if (!!opts[i].selected) selected.push(opts[i].value);
			}model[end] = selected;
		} else {
			model[end] = this.node.value;
			this.node.setAttribute('value', _typeof(this.node.value) === 'object' ? '[object]@' + new Date().getTime() : this.node.value);
		}
	};

	/**
  * setValue()
  * Set a node value and attribute to ensure changes can be picked up by attribute watchers
  */


	ValueBinder.prototype.setValue = function setValue() {
		if (this.tag === 'select' && this.node.hasAttribute('multiple') && Array.isArray(this.resolver.resolved)) {
			var opts = this.node.querySelectorAll('option');
			for (var i = 0; i < opts.length; i++) {
				// do not indexOf to stop issues with mixed var type
				for (var ii = 0; ii < this.resolver.resolved.length; ii++) {
					if (opts[i].value == this.resolver.resolved[ii]) opts[i].selected = true;
				}
			}
		} else {
			this.node.setAttribute('value', _typeof(this.resolver.resolved) === 'object' ? '[object]@' + new Date().getTime() : this.resolver.resolved);
			this.node.value = this.resolver.resolved;
		}
	};

	/**
  * eventType()
  * Get the type of event we want to listen on
  */


	ValueBinder.prototype.eventType = function eventType() {
		var name = 'change';
		if (this.tag === 'input') name = 'input';

		return name;
	};

	return ValueBinder;
}(_binder2.default);

exports.default = ValueBinder;

},{"./binder.js":17}],37:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.RaziloBindDateFormat = exports.RaziloBindCoreObserver = exports.RaziloBindCoreTraverser = exports.RaziloBindCoreDetector = exports.RaziloBindCore = undefined;

var _core = require('./src/core.js');

var _core2 = _interopRequireDefault(_core);

var _detector = require('./src/detector.js');

var _detector2 = _interopRequireDefault(_detector);

var _traverser = require('./src/traverser.js');

var _traverser2 = _interopRequireDefault(_traverser);

var _observer = require('./src/observer.js');

var _observer2 = _interopRequireDefault(_observer);

var _dateFormat = require('./src/date-format.js');

var _dateFormat2 = _interopRequireDefault(_dateFormat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.RaziloBindCore = _core2.default;
exports.RaziloBindCoreDetector = _detector2.default;
exports.RaziloBindCoreTraverser = _traverser2.default;
exports.RaziloBindCoreObserver = _observer2.default;
exports.RaziloBindDateFormat = _dateFormat2.default;

},{"./src/core.js":38,"./src/date-format.js":39,"./src/detector.js":40,"./src/observer.js":41,"./src/traverser.js":42}],38:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _traverser = require('./traverser.js');

var _traverser2 = _interopRequireDefault(_traverser);

var _observer = require('./observer.js');

var _observer2 = _interopRequireDefault(_observer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * RaziloBind Binding Library
 * Offers View-Model binding between js object and html view
 */
var Core = function () {
	function Core(options) {
		_classCallCheck(this, Core);

		// set up
		this.options = typeof options !== 'undefined' ? options : {};
		this.options.prefix = typeof this.options.prefix !== 'undefined' ? this.options.prefix + '-' : '';
	}

	Core.prototype.bind = function bind(element, object) {
		element = typeof element === 'string' ? document.querySelector(element) : element;
		if (!element) throw "Element not found, cannot bind to non-element";

		// set basics
		element.razilobind = this;
		this.model = _observer2.default.object(object, this.update.bind(this), true);
		this.element = element;

		// iterate over nodes
		this.traverser = new _traverser2.default(this.options);
		this.traverser.traverse(this.element, this.model, true);
	};

	Core.prototype.update = function update(path, oldV, newV) {
		var action = 'update';
		var pathParts = path.split('.');
		var pathEnd = pathParts[pathParts.length - 1];

		// sort out arrys and objects
		if (pathEnd === 'length') {
			// convert .lengths to parent updates
			action = oldV > newV ? 'array-remove' : 'array-add';
			path = path.substring(0, path.length - pathEnd.length - 1);
		} else if (typeof oldV === 'undefined' || typeof newV === 'undefined') {
			var model = this.model;
			for (var i = 0; i < pathParts.length - 1; i++) {
				model = model[pathParts[i]];
			} // if parent is object, also fire parent update and allow original to continue
			if (typeof model.length === 'undefined') {
				var xPath = path.substring(0, path.length - pathEnd.length - 1);
				var xAction = typeof oldV === 'undefined' ? 'object-add' : 'object-remove';
				if (typeof this.traverser.observables[xPath] !== 'undefined') for (var key in this.traverser.observables[xPath]) {
					this.traverser.observables[xPath][key].update(oldV, xPath, xAction, pathEnd);
				}
			}
		}

		if (typeof this.traverser.observables[path] !== 'undefined') for (var _key in this.traverser.observables[path]) {
			this.traverser.observables[path][_key].update(oldV, path, action);
		}
	};

	return Core;
}();

exports.default = Core;

},{"./observer.js":41,"./traverser.js":42}],39:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Date Alterer
 * Alters various data to a date string in (options) format
 *
 * Inspired by dateFormat https://github.com/felixge/node-dateformat/blob/master/lib/dateformat.js by Steven Levithan <stevenlevithan.com>
 *
 * Inherits
 *
 * properties: name, accepts, options
 * method: detect(name, resolved) { return bool }
 *
 * PORTED FROM: dateFormat https://github.com/felixge/node-dateformat/blob/master/lib/dateformat.js
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */
var DateFormat = function () {
	function DateFormat() {
		_classCallCheck(this, DateFormat);
	}

	DateFormat.dateFormat = function dateFormat(date, mask, utc, gmt) {
		var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZWN]|'[^']*'|'[^']*'/g;
		var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
		var timezoneClip = /[^-+\dA-Z]/g;

		var masks = {
			'default': 'ddd mmm dd yyyy HH:MM:ss',
			'shortDate': 'm/d/yy',
			'mediumDate': 'mmm d, yyyy',
			'longDate': 'mmmm d, yyyy',
			'fullDate': 'dddd, mmmm d, yyyy',
			'shortTime': 'h:MM TT',
			'mediumTime': 'h:MM:ss TT',
			'longTime': 'h:MM:ss TT Z',
			'isoDate': 'yyyy-mm-dd',
			'isoTime': 'HH:MM:ss',
			'isoDateTime': 'yyyy-mm-dd\'T\'HH:MM:sso',
			'isoUtcDateTime': 'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\'',
			'expiresHeaderFormat': 'ddd, dd mmm yyyy HH:MM:ss Z'
		};

		var i18n = {
			dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
		};

		mask = String(masks[mask] || mask || masks['default']);

		// Allow setting the utc/gmt argument via the mask
		var maskSlice = mask.slice(0, 4);
		if (maskSlice === 'UTC:' || maskSlice === 'GMT:') {
			mask = mask.slice(4);
			utc = true;
			if (maskSlice === 'GMT:') gmt = true;
		}

		var _ = utc ? 'getUTC' : 'get';
		var d = date[_ + 'Date']();
		var D = date[_ + 'Day']();
		var m = date[_ + 'Month']();
		var y = date[_ + 'FullYear']();
		var H = date[_ + 'Hours']();
		var M = date[_ + 'Minutes']();
		var s = date[_ + 'Seconds']();
		var L = date[_ + 'Milliseconds']();
		var o = utc ? 0 : date.getTimezoneOffset();
		var W = DateFormat.getWeek(date);
		var N = DateFormat.getDayOfWeek(date);
		var flags = {
			d: d,
			dd: DateFormat.pad(d),
			ddd: i18n.dayNames[D],
			dddd: i18n.dayNames[D + 7],
			m: m + 1,
			mm: DateFormat.pad(m + 1),
			mmm: i18n.monthNames[m],
			mmmm: i18n.monthNames[m + 12],
			yy: String(y).slice(2),
			yyyy: y,
			h: H % 12 || 12,
			hh: DateFormat.pad(H % 12 || 12),
			H: H,
			HH: DateFormat.pad(H),
			M: M,
			MM: DateFormat.pad(M),
			s: s,
			ss: DateFormat.pad(s),
			l: DateFormat.pad(L, 3),
			L: DateFormat.pad(Math.round(L / 10)),
			t: H < 12 ? 'a' : 'p',
			tt: H < 12 ? 'am' : 'pm',
			T: H < 12 ? 'A' : 'P',
			TT: H < 12 ? 'AM' : 'PM',
			Z: gmt ? 'GMT' : utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
			o: (o > 0 ? '-' : '+') + DateFormat.pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
			S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10],
			W: W,
			N: N
		};

		return mask.replace(token, function (match) {
			if (match in flags) return flags[match];
			return match.slice(1, match.length - 1);
		});
	};

	/**
  * Get the ISO 8601 week number
  * Based on comments from
  * http://techblog.procurios.nl/k/n618/news/view/33796/14863/Calculate-ISO-8601-week-and-year-in-javascript.html
  *
  * @param  {Object} `date`
  * @return {Number}
  */


	DateFormat.getWeek = function getWeek(date) {
		// Remove time components of date
		var targetThursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		// Change date to Thursday same week
		targetThursday.setDate(targetThursday.getDate() - (targetThursday.getDay() + 6) % 7 + 3);

		// Take January 4th as it is always in week 1 (see ISO 8601)
		var firstThursday = new Date(targetThursday.getFullYear(), 0, 4);

		// Change date to Thursday same week
		firstThursday.setDate(firstThursday.getDate() - (firstThursday.getDay() + 6) % 7 + 3);

		// Check if daylight-saving-time-switch occured and correct for it
		var ds = targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
		targetThursday.setHours(targetThursday.getHours() - ds);

		// Number of weeks between target Thursday and first Thursday
		var weekDiff = (targetThursday - firstThursday) / (86400000 * 7);
		return 1 + Math.floor(weekDiff);
	};

	/**
  * Get ISO-8601 numeric representation of the day of the week
  * 1 (for Monday) through 7 (for Sunday)
  *
  * @param  {Object} `date`
  * @return {Number}
  */


	DateFormat.getDayOfWeek = function getDayOfWeek(date) {
		var dow = date.getDay();
		if (dow === 0) dow = 7;
		return dow;
	};

	DateFormat.pad = function pad(val, len) {
		val = String(val);
		len = len || 2;
		while (val.length < len) {
			val = '0' + val;
		}return val;
	};

	return DateFormat;
}();

exports.default = DateFormat;

},{}],40:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Detector = function () {
	function Detector() {
		_classCallCheck(this, Detector);
	}

	/**
  * Choose binders for the data found when iterating over element bindables
  * Some binders will not allow other binders to be found, such as any binder that
  * creates it own insance e.g. for loops, as they are generated on the fly.
  * return array of binders
  */
	Detector.binders = function binders(node, model, options, traverser) {
		if (!Detector.defaultBinders || _typeof(Detector.defaultBinders) !== 'object') return;

		var binders = [];
		for (var name in Detector.defaultBinders) {
			var binder = new Detector.defaultBinders[name](options, traverser);
			if (binder.detect(node)) binders.push(binder.build(model));
		}

		if (Detector.customBinders && _typeof(Detector.customBinders) === 'object') {
			for (var _name in Detector.customBinders) {
				var _binder = new Detector.customBinders[_name](options, traverser);
				if (_binder.detect(node)) binders.push(_binder.build(model));
			}
		}

		return binders;
	};

	/**
  * Run alterers found in resolved alterable data
  * return resolved The altered resolved data
  */


	Detector.alterers = function alterers(_alterers, resolved) {
		if (typeof _alterers === 'undefined') return false;
		if ((typeof _alterers === 'undefined' ? 'undefined' : _typeof(_alterers)) !== 'object') _alterers = [_alterers];

		for (var key in _alterers) {
			var name = isNaN(key) ? key : _alterers[key];
			var options = isNaN(key) ? _alterers[key] : undefined;

			if (!Detector.defaultAlterers || _typeof(Detector.defaultAlterers) !== 'object') continue;

			for (var _key in Detector.defaultAlterers) {
				var alterer = new Detector.defaultAlterers[_key]();
				if (alterer.detect(name, resolved)) resolved = alterer.alter(resolved, options);
			}

			if (Detector.customAlterers && _typeof(Detector.customAlterers) === 'object') {
				for (var _name2 in Detector.customAlterers) {
					var _alterer = new Detector.customAlterers[_name2]();
					if (_alterer.detect(_name2, resolved)) resolved = _alterer.alter(resolved, options);
				}
			}
		}

		return resolved;
	};

	/**
  * Choose a single resolver for data found when iterating over elements. Can be used for any element attribute data
  * return Resolver resolver or bool false on fail
  */


	Detector.resolver = function resolver(data, node) {
		if (typeof data === 'undefined' || data.length < 1) return false;
		if (!Detector.defaultResolvers || _typeof(Detector.defaultResolvers) !== 'object') return false;

		for (var name in Detector.defaultResolvers) {
			var resolver = new Detector.defaultResolvers[name](node);
			if (resolver.detect(data)) return resolver;
		}

		if (Detector.customResolvers && _typeof(Detector.customResolvers) === 'object') {
			for (var _name3 in Detector.customResolvers) {
				var _resolver = new Detector.customResolvers[_name3](node);
				if (_resolver.detect(data)) return _resolver;
			}
		}

		// failed to resolve
		return false;
	};

	return Detector;
}();

exports.default = Detector;

},{}],41:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Observer = function () {
	function Observer() {
		_classCallCheck(this, Observer);
	}

	/**
  * object()
  * Observe an object, applying a callback if changed
  * This method uses native Proxy available for clean observing, returning proxied object
     *
  * NOTE:
  * If native proxy not available, proxy will be polyfilled and fallback to object observe polyfill for observing
  * and proxy polyfill for those who  want to use it (caveat, proxy polyfill does not allow mutating of arrays) To change a polyfilled proxy
  * you will have to replace whole array. This is why we fall back to OO polyfill for observing but allow you to still use Proxy polyfill
  * if you want to for your app with this caveat.
  *
  * DEPS:
  * This class relies on the smiffy6969/proxy-oo-polyfill (npm install proxy-oo-polyfill) for hybrid proxy with oo observing.
  *
  * @param obj Object The model to proxy
  * @param fn Function The calback function to run on change
  * @param deep Boolean Should we go deep or just proxy/observe root level
  * @param prefix String Used to set prefix of path in object (should be blank when called)
  * @return Object The proxied object
  */
	Observer.object = function object(obj, fn, deep, prefix) {
		if (!Proxy.oo) return Observer.proxy(obj, fn, deep, prefix);
		Observer.oo(obj, fn, deep, prefix);
		return obj;
	};

	/**
  * proxy()
  *
  * Use native proxy to extend object model, allowing us to observe changes and instigate callback on changes
  * @param obj Object The model to proxy
  * @param fn Function The calback function to run on change
  * @param deep Boolean Should we go deep or just proxy/observe root level
  * @param prefix String Used to set prefix of path in object (should be blank when called)
  * @return Object The proxied object
  */


	Observer.proxy = function proxy(obj, fn, deep, prefix) {
		prefix = typeof prefix === 'undefined' ? '' : prefix;
		return new Proxy(obj, {
			set: function set(target, prop, value) {
				var old = target[prop];
				target[prop] = value;
				fn.call(this, prefix + prop, old, value);
				return true;
			},
			get: function get(target, prop) {
				return !deep || target[prop] == null || _typeof(target[prop]) !== 'object' || target[prop] instanceof Date ? target[prop] : Observer.proxy(target[prop], fn, deep, prefix + prop + '.');
			}
		});
	};

	/**
  * oo()
  *
  * Fallback observing method to allow us to watch changes on object without native proxy
  * @param obj Object The model to proxy
  * @param fn Function The calback function to run on change
  * @param deep Boolean Should we go deep or just proxy/observe root level
  * @param prefix String Used to set prefix of path in object (should be blank when called)
  */


	Observer.oo = function oo(obj, fn, deep, prefix) {
		prefix = typeof prefix === 'undefined' ? '' : prefix;
		Proxy.oo.observe(obj, function (changes) {
			for (var i = 0; i < changes.length; i++) {
				fn(prefix + changes[i].name, obj[changes[i].name], changes[i].oldValue, changes[i].type);
				if (changes[i].type == 'add' && !!deep && obj[changes[i].name] && _typeof(obj[changes[i].name]) === 'object') Observer.oo(obj[changes[i].name], fn, deep, prefix + changes[i].name + '.');
			}
		});
		for (var name in obj) {
			if (!!deep && obj[name] && _typeof(obj[name]) === 'object') Observer.oo(obj[name], fn, deep, prefix + name + '.');
		}
	};

	return Observer;
}();

exports.default = Observer;

},{}],42:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _detector = require('./detector.js');

var _detector2 = _interopRequireDefault(_detector);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Traverser = function () {
    function Traverser(options) {
        _classCallCheck(this, Traverser);

        this.options = options;
        this.observables = {};
    }

    Traverser.prototype.traverse = function traverse(element, model, initial) {
        // check for binders and build observables map
        var binders = this.options.noParentBind && initial ? [] : _detector2.default.binders(element, model, this.options, this);

        // compile binders into a watch list (one binder instance only per element)
        if (binders.length > 0) {
            for (var i = 0; i < binders.length; i++) {
                if (binders[i].observables.length > 0) {
                    for (var ii = 0; ii < binders[i].observables.length; ii++) {
                        var path = binders[i].observables[ii];
                        if (typeof this.observables[path] === 'undefined') this.observables[path] = {};
                        this.observables[path][binders[i].id] = binders[i];
                    }
                }
            }
        }

        // go deep! <o_0>
        if (element.childNodes) {
            for (var _i = 0; _i < element.childNodes.length; _i++) {
                if (element.childNodes[_i].nodeType !== 1) continue;
                this.traverse(element.childNodes[_i], model);
            }
        }
    };

    return Traverser;
}();

exports.default = Traverser;

},{"./detector.js":40}],43:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.RaziloBindStringResolver = exports.RaziloBindPropertyResolver = exports.RaziloBindPhantomResolver = exports.RaziloBindObjectResolver = exports.RaziloBindNumberResolver = exports.RaziloBindMethodResolver = exports.RaziloBindBooleanResolver = exports.RaziloBindArrayResolver = exports.RaziloBindResolver = undefined;

var _resolver = require('./src/resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _arrayResolver = require('./src/array.resolver.js');

var _arrayResolver2 = _interopRequireDefault(_arrayResolver);

var _booleanResolver = require('./src/boolean.resolver.js');

var _booleanResolver2 = _interopRequireDefault(_booleanResolver);

var _methodResolver = require('./src/method.resolver.js');

var _methodResolver2 = _interopRequireDefault(_methodResolver);

var _numberResolver = require('./src/number.resolver.js');

var _numberResolver2 = _interopRequireDefault(_numberResolver);

var _objectResolver = require('./src/object.resolver.js');

var _objectResolver2 = _interopRequireDefault(_objectResolver);

var _phantomResolver = require('./src/phantom.resolver.js');

var _phantomResolver2 = _interopRequireDefault(_phantomResolver);

var _propertyResolver = require('./src/property.resolver.js');

var _propertyResolver2 = _interopRequireDefault(_propertyResolver);

var _stringResolver = require('./src/string.resolver.js');

var _stringResolver2 = _interopRequireDefault(_stringResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.RaziloBindResolver = _resolver2.default;
exports.RaziloBindArrayResolver = _arrayResolver2.default;
exports.RaziloBindBooleanResolver = _booleanResolver2.default;
exports.RaziloBindMethodResolver = _methodResolver2.default;
exports.RaziloBindNumberResolver = _numberResolver2.default;
exports.RaziloBindObjectResolver = _objectResolver2.default;
exports.RaziloBindPhantomResolver = _phantomResolver2.default;
exports.RaziloBindPropertyResolver = _propertyResolver2.default;
exports.RaziloBindStringResolver = _stringResolver2.default;

},{"./src/array.resolver.js":44,"./src/boolean.resolver.js":45,"./src/method.resolver.js":46,"./src/number.resolver.js":47,"./src/object.resolver.js":48,"./src/phantom.resolver.js":49,"./src/property.resolver.js":50,"./src/resolver.js":51,"./src/string.resolver.js":52}],44:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _stringResolver = require('./string.resolver.js');

var _stringResolver2 = _interopRequireDefault(_stringResolver);

var _numberResolver = require('./number.resolver.js');

var _numberResolver2 = _interopRequireDefault(_numberResolver);

var _booleanResolver = require('./boolean.resolver.js');

var _booleanResolver2 = _interopRequireDefault(_booleanResolver);

var _propertyResolver = require('./property.resolver.js');

var _propertyResolver2 = _interopRequireDefault(_propertyResolver);

var _phantomResolver = require('./phantom.resolver.js');

var _phantomResolver2 = _interopRequireDefault(_phantomResolver);

var _methodResolver = require('./method.resolver.js');

var _methodResolver2 = _interopRequireDefault(_methodResolver);

var _objectResolver = require('./object.resolver.js');

var _objectResolver2 = _interopRequireDefault(_objectResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Array Resolver
 * Resolves data as array with literals or model properties
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var ArrayResolver = function (_Resolver) {
	_inherits(ArrayResolver, _Resolver);

	function ArrayResolver(node) {
		_classCallCheck(this, ArrayResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'array';
		_this.regex = ArrayResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a string, set any observables on data
  */


	ArrayResolver.prototype.resolve = function resolve(object) {
		var res = ArrayResolver.toArray(this.data, object, this.node);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	ArrayResolver.regex = function regex() {
		return (/^\[{1}\s?(([0-9]+|\'{1}[^\']+\'{1}|[a-zA-Z_]+|[\$a-zA-Z_]{1}[^,]+[a-zA-Z_\]]{1}|\[{1}.*\]{1}|\{{1}.*\}{1}|[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*\({1}[^\(\)]*\){1})\s?,?\s?)*\s?\]{1}$/
		);
	};

	/**
  * static toArray()
  * turns a data and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve on the object
  * @param object object The object to resolve the data on
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	ArrayResolver.toArray = function toArray(data, object, node) {
		// split by comma but be carefull not to break nested data
		data = data.trim();
		var parts = data.substring(1, data.length - 1).split(',');
		var values = [parts[0]];
		for (var i = 1; i < parts.length; i++) {
			var sb = (values[values.length - 1].match(/\[/g) || []).length == (values[values.length - 1].match(/\]/g) || []).length;
			var mb = (values[values.length - 1].match(/\{/g) || []).length == (values[values.length - 1].match(/\}/g) || []).length;

			if (sb && mb) values[values.length] = parts[i];else values[values.length - 1] += ',' + parts[i];
		}

		// work through seperated data resolving or pushing for further analysis
		var observers = [];
		var result = [];
		for (var ii = 0; ii < values.length; ii++) {
			values[ii] = values[ii].trim();
			if (_booleanResolver2.default.regex().test(values[ii])) result.push(_booleanResolver2.default.toBoolean(values[ii]).resolved);else if (_stringResolver2.default.regex().test(values[ii])) result.push(_stringResolver2.default.toString(values[ii]).resolved);else if (_numberResolver2.default.regex().test(values[ii])) result.push(_numberResolver2.default.toNumber(values[ii]).resolved);else if (_propertyResolver2.default.regex().test(values[ii])) {
				var propRes = _propertyResolver2.default.toProperty(values[ii], object, node);
				if (typeof propRes === 'undefined') throw 'Could not resolve data: "' + values[ii] + '" to property';
				result.push(propRes.resolved);
				observers = _resolver2.default.mergeObservers(observers, propRes.observers);
			} else if (_phantomResolver2.default.regex().test(values[ii])) {
				var phRes = _phantomResolver2.default.toProperty(values[ii], object, node);
				if (typeof phRes === 'undefined') throw 'Could not resolve data: "' + values[ii] + '" to phantom';
				result.push(phRes.resolved);
				observers = _resolver2.default.mergeObservers(observers, phRes.observers);
			} else if (_methodResolver2.default.regex().test(values[ii])) {
				var methRes = _methodResolver2.default.toMethod(values[ii], object, node);
				if (typeof methRes === 'undefined') throw 'Could not resolve data: "' + values[ii] + '" to method';
				result.push(methRes.resolved);
				observers = _resolver2.default.mergeObservers(observers, methRes.observers);
			} else if (ArrayResolver.regex().test(values[ii])) {
				var arrRes = ArrayResolver.toArray(values[ii], object, node);
				if (typeof arrRes === 'undefined') throw 'Could not resolve data: "' + values[ii] + '" to array';
				result.push(arrRes.resolved);
				observers = _resolver2.default.mergeObservers(observers, arrRes.observers);
			} else if (_objectResolver2.default.regex().test(values[ii])) {
				var objRes = _objectResolver2.default.toObject(values[ii], object, node);
				if (typeof objRes === 'undefined') throw 'Could not resolve data: "' + values[ii] + '" to object';
				result.push(objRes.resolved);
				observers = _resolver2.default.mergeObservers(observers, objRes.observers);
			}
		}

		return { resolved: result, observers: observers };
	};

	return ArrayResolver;
}(_resolver2.default);

exports.default = ArrayResolver;

},{"./boolean.resolver.js":45,"./method.resolver.js":46,"./number.resolver.js":47,"./object.resolver.js":48,"./phantom.resolver.js":49,"./property.resolver.js":50,"./resolver.js":51,"./string.resolver.js":52}],45:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Boolean Resolver
 * Resolves data as boolean true or false
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var BooleanResolver = function (_Resolver) {
	_inherits(BooleanResolver, _Resolver);

	function BooleanResolver(node) {
		_classCallCheck(this, BooleanResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'boolean';
		_this.regex = BooleanResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a boolean true or false, set any observables on data
  */


	BooleanResolver.prototype.resolve = function resolve(object) {
		var res = BooleanResolver.toBoolean(this.data);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	BooleanResolver.regex = function regex() {
		return (/^true|false$/
		);
	};

	/**
  * static toBoolean()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve to a string
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	BooleanResolver.toBoolean = function toBoolean(data) {
		return { resolved: data == 'true' ? true : false, observers: [] };
	};

	return BooleanResolver;
}(_resolver2.default);

exports.default = BooleanResolver;

},{"./resolver.js":51}],46:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _stringResolver = require('./string.resolver.js');

var _stringResolver2 = _interopRequireDefault(_stringResolver);

var _numberResolver = require('./number.resolver.js');

var _numberResolver2 = _interopRequireDefault(_numberResolver);

var _booleanResolver = require('./boolean.resolver.js');

var _booleanResolver2 = _interopRequireDefault(_booleanResolver);

var _propertyResolver = require('./property.resolver.js');

var _propertyResolver2 = _interopRequireDefault(_propertyResolver);

var _phantomResolver = require('./phantom.resolver.js');

var _phantomResolver2 = _interopRequireDefault(_phantomResolver);

var _arrayResolver = require('./array.resolver.js');

var _arrayResolver2 = _interopRequireDefault(_arrayResolver);

var _objectResolver = require('./object.resolver.js');

var _objectResolver2 = _interopRequireDefault(_objectResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Method Resolver
 * Resolves data to model method
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var MethodResolver = function (_Resolver) {
	_inherits(MethodResolver, _Resolver);

	function MethodResolver(node) {
		_classCallCheck(this, MethodResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'method';
		_this.regex = MethodResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a property, set any observables on data
  * @param object object The object that you want to resolve data to
  */


	MethodResolver.prototype.resolve = function resolve(object, delay) {
		var res = MethodResolver.toMethod(this.data, object, this.node, delay);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * Used to validate if data is a method call or not
  * @return object regex The regex used to validate if of type or not
  */


	MethodResolver.regex = function regex() {
		return (/^[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*\({1}[^\(\)]*\){1}$/
		);
	};

	/**
  * static toMethod()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve on the object
  * @param object object The object to resolve the path on
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	MethodResolver.toMethod = function toMethod(data, object, node, delay) {
		// get the bit before (
		data = data.trim();
		var key = data.substring(0, data.indexOf('('));

		// get the bit between ()
		var val = data.substring(data.indexOf('(') + 1, data.length - 1);

		// resolve method name
		if (!_propertyResolver2.default.regex().test(key)) return undefined;
		var resolver = _propertyResolver2.default.toProperty(key, object, node);
		var method = resolver.resolved;
		var observers = resolver.observers;
		if (typeof method !== 'function') return undefined;

		// split data by , but do not split objects or arrays
		var parts = val.split(',');
		var values = [parts[0]];
		for (var i = 1; i < parts.length; i++) {
			var sb = (values[values.length - 1].match(/\[/g) || []).length == (values[values.length - 1].match(/\]/g) || []).length;
			var mb = (values[values.length - 1].match(/\{/g) || []).length == (values[values.length - 1].match(/\}/g) || []).length;

			if (sb && mb) values[values.length] = parts[i];else values[values.length - 1] += ',' + parts[i];
		}

		// resolve each split data
		for (var ii = 0; ii < values.length; ii++) {
			// resolve value
			if (_booleanResolver2.default.regex().test(values[ii])) values[ii] = _booleanResolver2.default.toBoolean(values[ii]).resolved;else if (_stringResolver2.default.regex().test(values[ii])) values[ii] = _stringResolver2.default.toString(values[ii]).resolved;else if (_numberResolver2.default.regex().test(values[ii])) values[ii] = _numberResolver2.default.toNumber(values[ii]).resolved;else if (_propertyResolver2.default.regex().test(values[ii])) {
				var propValRes = _propertyResolver2.default.toProperty(values[ii], object, node);
				values[ii] = propValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, propValRes.observers);
			} else if (_phantomResolver2.default.regex().test(values[ii])) {
				var phValRes = _phantomResolver2.default.toProperty(values[ii], object, node);
				values[ii] = phValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, phValRes.observers);
			} else if (_arrayResolver2.default.regex().test(values[ii])) {
				var arrValRes = _arrayResolver2.default.toArray(values[ii], object, node);
				values[ii] = arrValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, arrValRes.observers);
			} else if (_objectResolver2.default.regex().test(values[ii])) {
				var objValRes = _objectResolver2.default.toObject(values[ii], object, node);
				values[ii] = objValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, objValRes.observers);
			} else values[ii] = undefined;
		}

		// for event binders... return method instead of running it
		return { resolved: !!delay ? { method: method, values: values } : method.apply(object, values), observers: observers };
	};

	return MethodResolver;
}(_resolver2.default);

exports.default = MethodResolver;

},{"./array.resolver.js":44,"./boolean.resolver.js":45,"./number.resolver.js":47,"./object.resolver.js":48,"./phantom.resolver.js":49,"./property.resolver.js":50,"./resolver.js":51,"./string.resolver.js":52}],47:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Number Resolver
 * Resolves data as number
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var NumberResolver = function (_Resolver) {
	_inherits(NumberResolver, _Resolver);

	function NumberResolver(node) {
		_classCallCheck(this, NumberResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'number';
		_this.regex = NumberResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a number, set any observables on data
  */


	NumberResolver.prototype.resolve = function resolve(object) {
		var res = NumberResolver.toNumber(this.data);
		this.resolved = res.resolved;
		this.observers = res.obeservers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	NumberResolver.regex = function regex() {
		return (/^[0-9]+(\.[0-9]+)?$/
		);
	};

	/**
  * static toNumber()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve to a string
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	NumberResolver.toNumber = function toNumber(data) {
		return { resolved: data, observers: [] };
	};

	return NumberResolver;
}(_resolver2.default);

exports.default = NumberResolver;

},{"./resolver.js":51}],48:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _stringResolver = require('./string.resolver.js');

var _stringResolver2 = _interopRequireDefault(_stringResolver);

var _numberResolver = require('./number.resolver.js');

var _numberResolver2 = _interopRequireDefault(_numberResolver);

var _booleanResolver = require('./boolean.resolver.js');

var _booleanResolver2 = _interopRequireDefault(_booleanResolver);

var _propertyResolver = require('./property.resolver.js');

var _propertyResolver2 = _interopRequireDefault(_propertyResolver);

var _phantomResolver = require('./phantom.resolver.js');

var _phantomResolver2 = _interopRequireDefault(_phantomResolver);

var _methodResolver = require('./method.resolver.js');

var _methodResolver2 = _interopRequireDefault(_methodResolver);

var _arrayResolver = require('./array.resolver.js');

var _arrayResolver2 = _interopRequireDefault(_arrayResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Object Resolver
 * Resolves data as object with literals or model properties
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var ObjectResolver = function (_Resolver) {
	_inherits(ObjectResolver, _Resolver);

	function ObjectResolver(node) {
		_classCallCheck(this, ObjectResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'object';
		_this.regex = ObjectResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a string, set any observables on data
  */


	ObjectResolver.prototype.resolve = function resolve(object, delay) {
		var res = ObjectResolver.toObject(this.data, object, this.node, delay);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	ObjectResolver.regex = function regex() {
		return (/^\{{1}\s?((\'{1}[^\']+\'{1}|[a-zA-Z_]+|[a-zA-Z_]{1}[^,]+[a-zA-Z_\]]{1}|)\s?:{1}\s?([0-9]+|\'{1}[^\']+\'{1}|[a-zA-Z_]+|[a-zA-Z_\$]{1}[^,]+[a-zA-Z0-9_\]]{1}|\[{1}.*\]{1}|\{{1}.*\}{1}|[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*\({1}[^\(\)]*\){1})\s?,?\s?)*\s?\}{1}$/
		);
	};

	/**
  * static toObject()
  * turns a data and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve on the object
  * @param object object The object to resolve the data on
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	ObjectResolver.toObject = function toObject(data, object, node, delay) {
		// split by comma but be carefull not to break nested data
		data = data.trim();
		var parts = data.substring(1, data.length - 1).split(',');
		var values = [parts[0]];
		for (var i = 1; i < parts.length; i++) {
			var sb = (values[values.length - 1].match(/\[/g) || []).length == (values[values.length - 1].match(/\]/g) || []).length;
			var mb = (values[values.length - 1].match(/\{/g) || []).length == (values[values.length - 1].match(/\}/g) || []).length;

			if (sb && mb) values[values.length] = parts[i];else values[values.length - 1] += ',' + parts[i];
		}

		// work through seperated data resolving or pushing for further analysis
		var observers = [];
		var result = [];
		for (var ii = 0; ii < values.length; ii++) {
			values[ii] = values[ii].trim();

			// split by ':' preserving data in second part
			var vKey = values[ii].substring(0, values[ii].indexOf(':')).trim();
			var vVal = values[ii].substring(values[ii].indexOf(':') + 1, values[ii].length).trim();

			// resolve key
			if (_stringResolver2.default.regex().test(vKey)) vKey = _stringResolver2.default.toString(vKey).resolved;else if (_propertyResolver2.default.regex().test(vKey)) {
				var propKeyRes = _propertyResolver2.default.toProperty(vKey, object, node);
				if (typeof propKeyRes === 'undefined') throw 'Could not resolve data: "' + vKey + '" to property';
				vKey = propKeyRes;
				observers = _resolver2.default.mergeObservers(observers, propKeyRes.observers);
			} else if (_phantomResolver2.default.regex().test(vKey)) {
				var phKeyRes = _phantomResolver2.default.toProperty(vKey, object, node);
				if (typeof phKeyRes === 'undefined') throw 'Could not resolve data: "' + vKey + '" to phantom';
				vKey = phKeyRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, phKeyRes.observers);
			} else vKey = 'undefined';

			// resolve value
			if (_booleanResolver2.default.regex().test(vVal)) vVal = _booleanResolver2.default.toBoolean(vVal).resolved;else if (_stringResolver2.default.regex().test(vVal)) vVal = _stringResolver2.default.toString(vVal).resolved;else if (_numberResolver2.default.regex().test(vVal)) vVal = _numberResolver2.default.toNumber(vVal).resolved;else if (_propertyResolver2.default.regex().test(vVal)) {
				var propValRes = _propertyResolver2.default.toProperty(vVal, object, node);
				if (typeof propValRes === 'undefined') throw 'Could not resolve data: "' + vVal + '" to property';
				vVal = propValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, propValRes.observers);
			} else if (_phantomResolver2.default.regex().test(vVal)) {
				var phValRes = _phantomResolver2.default.toProperty(vVal, object, node);
				if (typeof phValRes === 'undefined') throw 'Could not resolve data: "' + vVal + '" to phantom';
				vVal = phValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, phValRes.observers);
			} else if (_methodResolver2.default.regex().test(vVal)) {
				var methValRes = _methodResolver2.default.toMethod(vVal, object, node, delay);
				if (typeof methValRes === 'undefined') throw 'Could not resolve data: "' + vVal + '" to method';
				vVal = methValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, methValRes.observers);
			} else if (_arrayResolver2.default.regex().test(vVal)) {
				var arrValRes = _arrayResolver2.default.toArray(vVal, object, node);
				if (typeof arrValRes === 'undefined') throw 'Could not resolve data: "' + vVal + '" to array';
				vVal = arrValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, arrValRes.observers);
			} else if (ObjectResolver.regex().test(vVal)) {
				var objValRes = ObjectResolver.toObject(vVal, object, node);
				if (typeof objValRes === 'undefined') throw 'Could not resolve data: "' + vVal + '" to object';
				vVal = objValRes.resolved;
				observers = _resolver2.default.mergeObservers(observers, objValRes.observers);
			} else vVal = undefined;

			result[vKey] = vVal;
		}

		return { resolved: result, observers: observers };
	};

	return ObjectResolver;
}(_resolver2.default);

exports.default = ObjectResolver;

},{"./array.resolver.js":44,"./boolean.resolver.js":45,"./method.resolver.js":46,"./number.resolver.js":47,"./phantom.resolver.js":49,"./property.resolver.js":50,"./resolver.js":51,"./string.resolver.js":52}],49:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _propertyResolver = require('./property.resolver.js');

var _propertyResolver2 = _interopRequireDefault(_propertyResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Phantom Property Resolver
 * Resolves phantom property to real property based on parent iteration.
 * Phantom properties proceed with a $ and must resolve to an itterable instance
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var PhantomResolver = function (_Resolver) {
	_inherits(PhantomResolver, _Resolver);

	function PhantomResolver(node) {
		_classCallCheck(this, PhantomResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'phantom';
		_this.regex = PhantomResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a property, set any observables on data
  * @param object object The object that you want to resolve data to
  */


	PhantomResolver.prototype.resolve = function resolve(object) {
		var res = PhantomResolver.toProperty(this.data, object, this.node);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * regex used to test resolvable data on
  * @return object regex The regex used to validate if of type or not
  */


	PhantomResolver.regex = function regex() {
		return (/^\${1}[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*$/
		);
	};

	/**
  * static toProperty()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string path The path to resolve on the object
  * @param object object The object to resolve the path on
  * @param HTMLElement node The node that the property is being generated for (allows look back for phantom)
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	PhantomResolver.toProperty = function toProperty(data, object, node) {
		data = data.trim();
		var result = { resolved: undefined, observers: [] };
		if (!node || !node.parentNode) return result;

		// find closest phantom up nodes
		var sniffed = node;
		while (sniffed && !sniffed.phantom && sniffed.tagName !== 'BODY') {
			if (sniffed.phantom && (!sniffed.phantom.keyName || sniffed.phantom.keyName == data)) break;
			if (sniffed.phantom && (!sniffed.phantom.valueName || sniffed.phantom.valueName == data)) break;
			sniffed = sniffed.parentNode;
		}

		if (!sniffed || !sniffed.phantom) return result;

		// resolve key and value names, else default (force $ in front)
		var keyName = sniffed.phantom.keyName ? sniffed.phantom.keyName : '$key';
		var valueName = sniffed.phantom.valueName ? sniffed.phantom.valueName : '$value';
		if (keyName.indexOf('$') !== 0) keyName = '$' + keyName;
		if (valueName.indexOf('$') !== 0) valueName = '$' + valueName;

		// lets resolve phantom data name, check first part of data for phantom name
		var pName = data.split(/\.|\[/)[0];

		// now we can analyse it and turn it into the actual object path if needed
		if (pName == keyName) result.resolved = sniffed.phantom.iterationKey;else if (pName == valueName) {
			// if observers, resolve result.resolved to live value, else use one time value
			if (sniffed.phantom.observers.length > 0) {
				// clone observers, ensure root is changed to reflect itterable (last one in stack)
				for (var key in sniffed.phantom.observers) {
					result.observers.push(sniffed.phantom.observers[key]);
				}result.observers[result.observers.length - 1] = result.observers[result.observers.length - 1] + '.' + sniffed.phantom.iterationKey;

				// convert phantom to property iteration and resolve
				var propRes = _propertyResolver2.default.toProperty(result.observers[result.observers.length - 1] + data.substring(pName.length, data.length), object);

				result.resolved = typeof propRes.resolved !== 'undefined' ? propRes.resolved : undefined;
				if (propRes.observers.length > 0) {
					for (var key2 in propRes.observers) {
						if (result.observers.indexOf(propRes.observers[key2]) < 0) result.observers.push(propRes.observers[key2]);
					}
				}
			} else result.resolved = sniffed.phantom.initialValue; // fugees (one-time!)
		}

		return result;
	};

	return PhantomResolver;
}(_resolver2.default);

exports.default = PhantomResolver;

},{"./property.resolver.js":50,"./resolver.js":51}],50:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

var _phantomResolver = require('./phantom.resolver.js');

var _phantomResolver2 = _interopRequireDefault(_phantomResolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Property Resolver
 * Resolves data to object, sets observers on any paths found
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var PropertyResolver = function (_Resolver) {
	_inherits(PropertyResolver, _Resolver);

	function PropertyResolver(node) {
		_classCallCheck(this, PropertyResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'property';
		_this.regex = PropertyResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a property, set any observables on data
  * @param object object The object that you want to resolve data to
  */


	PropertyResolver.prototype.resolve = function resolve(object) {
		var res = PropertyResolver.toProperty(this.data, object, this.node);
		this.resolved = res.resolved;
		this.observers = res.observers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	PropertyResolver.regex = function regex() {
		return (/^[a-zA-Z]{1}[a-zA-Z0-9_]+((\.[a-zA-Z]{1}[a-zA-Z0-9_]+)|(\[([0-9]+|[a-zA-Z_]{1}[a-zA-Z0-9_.\[\'\]]+)\])|(\[\'[^\[\]\']+\'\]))*$/
		);
	};

	/**
  * static toProperty()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string path The path to resolve on the object
  * @param object object The object to resolve the path on
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	PropertyResolver.toProperty = function toProperty(data, object, node) {
		// split by dot or open square bracket but be carefull not to break nested data
		data = data.trim();
		var parts = data.replace(/\[/g, '.[').split(/\./);
		var values = [parts[0]];
		for (var i = 1; i < parts.length; i++) {
			var sb = (values[values.length - 1].match(/\[/g) || []).length == (values[values.length - 1].match(/\]/g) || []).length;

			if (sb) values[values.length] = parts[i];else {
				values[values.length - 1] += '.' + parts[i];
				values[values.length - 1] = values[values.length - 1].replace(/\.\[/g, '[');
			}
		}

		// work through seperated data resolving or pushing for further analysis
		var observable = '';
		var observers = [];
		var result = object;
		for (var ii = 0; ii < values.length; ii++) {
			values[ii] = values[ii].trim();

			if (values[ii].indexOf("[") == 0) {
				if (/^\[\s*[0-9]+\s*\]$/.test(values[ii])) {
					// index
					var key = parseInt(values[ii].replace(/\[|\]/g, '').trim());
					result = result[key];
					observable += '.' + key;
				} else if (/^\[\s*\'(.*)\'\s*\]$/.test(values[ii])) {
					// key
					var _key = values[ii].replace(/\'|\[|\]/g, '').trim();
					result = result[_key];
					observable += '.' + _key;
				} else if (_phantomResolver2.default.regex().test(values[ii].substring(1, values[ii].length - 1))) {
					var phRes = _phantomResolver2.default.toProperty(values[ii].substring(1, values[ii].length - 1), object, node);
					result = phRes.resolved ? result[phRes.resolved] : undefined;
					observable += '.' + phRes.resolved;
					observers = _resolver2.default.mergeObservers(observers, phRes.observers);
				} else {
					var propRes = PropertyResolver.toProperty(values[ii].substring(1, values[ii].length - 1), object, node);
					result = propRes.resolved ? result[propRes.resolved] : undefined;
					observable += '.' + propRes.resolved;
					observers = _resolver2.default.mergeObservers(observers, propRes.observers);
				}
			} else {
				result = result ? result[values[ii]] : undefined; // removing array items
				if (typeof result !== 'undefined') observable += '.' + values[ii];
			}
		}

		// compact observable path to any other observables found
		if (observable) observers.push(observable.charAt(0) === '.' ? observable.substring(1, observable.length) : observable);

		return { resolved: result, observers: observers };
	};

	return PropertyResolver;
}(_resolver2.default);

exports.default = PropertyResolver;

},{"./phantom.resolver.js":49,"./resolver.js":51}],51:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Resolver
 * Generic resolver methods used accross all resolvers
 */
var Resolver = function () {
	function Resolver() {
		_classCallCheck(this, Resolver);

		this.node = undefined;
		this.name = undefined;
		this.regex = undefined;
	}

	/**
  * detect()
  * is data resolvable to resolver
  * @param string data The data string to try and resolve to type
  * @return bool True on resolvable, false on fail.
  */


	Resolver.prototype.detect = function detect(data) {
		this.data = data;
		return this.regex.test(this.data);
	};

	// join two observer arrays togethor without duplicating


	Resolver.mergeObservers = function mergeObservers(obsA, obsB) {
		for (var i = 0; i < obsB.length; i++) {
			if (obsA.indexOf(obsB[i]) < 0) obsA.push(obsB[i]);
		}

		return obsA;
	};

	return Resolver;
}();

exports.default = Resolver;

},{}],52:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _resolver = require('./resolver.js');

var _resolver2 = _interopRequireDefault(_resolver);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * String Resolver
 * Resolves data as string literal
 *
 * Inherits
 *
 * property: data
 * method: detect(data) { return bool }
 */
var StringResolver = function (_Resolver) {
	_inherits(StringResolver, _Resolver);

	function StringResolver(node) {
		_classCallCheck(this, StringResolver);

		var _this = _possibleConstructorReturn(this, _Resolver.call(this));

		_this.node = node;
		_this.name = 'string';
		_this.regex = StringResolver.regex();
		return _this;
	}

	/**
  * resolve()
  * Resolve data to a string, set any observables on data
  */


	StringResolver.prototype.resolve = function resolve(object) {
		var res = StringResolver.toString(this.data);
		this.resolved = res.resolved;
		this.observers = res.obeservers;
	};

	/**
  * static regex()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @return object regex The regex used to validate if of type or not
  */


	StringResolver.regex = function regex() {
		return (/^\'.*\'$/
		);
	};

	/**
  * static toString()
  * turns a path and object to a property value, returning list of observers on any found properties
  * @param string data The data to resolve to a string
  * @return object {resolved: ..., observers:...} The resolved data and any observers needed to track future changes
  */


	StringResolver.toString = function toString(data) {
		return { resolved: data.substring(1, data.length - 1), observers: [] };
	};

	return StringResolver;
}(_resolver2.default);

exports.default = StringResolver;

},{"./resolver.js":51}],53:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _razilobindCore = require('razilobind-core');

var _razilobindAlterer = require('razilobind-alterer');

var _razilobindBinder = require('razilobind-binder');

var _razilobindResolver = require('razilobind-resolver');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * RaziloBind Binding Library
 * Packages up the module with extension support if running as complete standalone binder to allow direct injected alterers, binders and resolvers
 * Offers View-Model binding between js object and html view
 */
var RaziloBind = function (_RaziloBindCore) {
	_inherits(RaziloBind, _RaziloBindCore);

	function RaziloBind(options) {
		_classCallCheck(this, RaziloBind);

		// Inject default alterers
		var _this = _possibleConstructorReturn(this, _RaziloBindCore.call(this, options));

		_razilobindCore.RaziloBindCoreDetector.defaultAlterers = {
			TrimAlterer: _razilobindAlterer.RaziloBindTrimAlterer,
			JsonAlterer: _razilobindAlterer.RaziloBindJsonAlterer,
			NotAlterer: _razilobindAlterer.RaziloBindNotAlterer,
			PrefixAlterer: _razilobindAlterer.RaziloBindPrefixAlterer,
			SuffixAlterer: _razilobindAlterer.RaziloBindSuffixAlterer,
			DateAlterer: _razilobindAlterer.RaziloBindDateAlterer,
			JoinAlterer: _razilobindAlterer.RaziloBindJoinAlterer,
			EqualAlterer: _razilobindAlterer.RaziloBindEqualAlterer,
			IdenticalAlterer: _razilobindAlterer.RaziloBindIdenticalAlterer
		};

		// Inject default binders
		_razilobindCore.RaziloBindCoreDetector.defaultBinders = {
			ForBinder: _razilobindBinder.RaziloBindForBinder,
			TextBinder: _razilobindBinder.RaziloBindTextBinder,
			HtmlBinder: _razilobindBinder.RaziloBindHtmlBinder,
			ShowBinder: _razilobindBinder.RaziloBindShowBinder,
			HideBinder: _razilobindBinder.RaziloBindHideBinder,
			StyleBinder: _razilobindBinder.RaziloBindStyleBinder,
			ClassBinder: _razilobindBinder.RaziloBindClassBinder,
			AttributesBinder: _razilobindBinder.RaziloBindAttributesBinder,
			SrcBinder: _razilobindBinder.RaziloBindSrcBinder,
			HrefBinder: _razilobindBinder.RaziloBindHrefBinder,
			DisabledBinder: _razilobindBinder.RaziloBindDisabledBinder,
			RequiredBinder: _razilobindBinder.RaziloBindRequiredBinder,
			SelectedBinder: _razilobindBinder.RaziloBindSelectedBinder,
			IfBinder: _razilobindBinder.RaziloBindIfBinder,
			ElseBinder: _razilobindBinder.RaziloBindElseBinder,
			ValueBinder: _razilobindBinder.RaziloBindValueBinder,
			CheckedBinder: _razilobindBinder.RaziloBindCheckedBinder,
			EventBinder: _razilobindBinder.RaziloBindEventBinder,
			InitBinder: _razilobindBinder.RaziloBindInitBinder,
			ModelBinder: _razilobindBinder.RaziloBindModelBinder
		};

		// Inject default resolvers
		_razilobindCore.RaziloBindCoreDetector.defaultResolvers = {
			BooleanResolver: _razilobindResolver.RaziloBindBooleanResolver,
			PropertyResolver: _razilobindResolver.RaziloBindPropertyResolver,
			MethodResolver: _razilobindResolver.RaziloBindMethodResolver,
			StringResolver: _razilobindResolver.RaziloBindStringResolver,
			NumberResolver: _razilobindResolver.RaziloBindNumberResolver,
			ObjectResolver: _razilobindResolver.RaziloBindObjectResolver,
			ArrayResolver: _razilobindResolver.RaziloBindArrayResolver,
			PhantomResolver: _razilobindResolver.RaziloBindPhantomResolver
		};
		return _this;
	}

	/**
  * addAlterers()
  * Add custom alterers
  *
  * @param array alterers An array of custom alterers to inject into Detector
  */


	RaziloBind.prototype.addAlterers = function addAlterers(alterers) {
		if (!alterers || (typeof alterers === 'undefined' ? 'undefined' : _typeof(alterers)) !== 'object') return;
		_razilobindCore.RaziloBindCoreDetector.customAlterers = alterers;
	};

	/**
  * addBinder()
  * Add custom binders
  *
  * @param array binders An array of custom binders to inject into Detector
  */


	RaziloBind.prototype.addBinders = function addBinders(binders) {
		if (!binders || (typeof binders === 'undefined' ? 'undefined' : _typeof(binders)) !== 'object') return;
		_razilobindCore.RaziloBindCoreDetector.customBinders = binders;
	};

	/**
  * addResolvers()
  * Add custom resolvers
  *
  * @param array resolvers An array of custom resolvers to inject into Detector
  */


	RaziloBind.prototype.addResolvers = function addResolvers(resolvers) {
		if (!resolvers || (typeof resolvers === 'undefined' ? 'undefined' : _typeof(resolvers)) !== 'object') return;
		_razilobindCore.RaziloBindCoreDetector.customResolvers = resolvers;
	};

	return RaziloBind;
}(_razilobindCore.RaziloBindCore);

exports.default = RaziloBind;

},{"razilobind-alterer":4,"razilobind-binder":15,"razilobind-core":37,"razilobind-resolver":43}],54:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _core = require('./src/core.js');

var _core2 = _interopRequireDefault(_core);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// import ObjectAssign from 'object-assign'

var RaziloComponent = function () {
	function RaziloComponent(name, extbp, bp) {
		_classCallCheck(this, RaziloComponent);

		var isString = typeof extbp === 'string';
		this.register(name, isString ? extbp : null, isString ? bp : extbp, document._currentScript.ownerDocument);
	}

	/**
  * Register New Component
  */


	RaziloComponent.prototype.register = function register(name, ext, bp, component) {
		for (var key in bp) {
			this[key] = bp[key];
		}return _core2.default.registerElement(this, name, ext, component);
	};

	/**
  * Fires an event off from the components element
  * @param string name The name of the event
  * @param mixed detail [optional] Any optional details you wish to send
  */
	// fireEvent(name, detail) return function )

	/**
  * Get the current working root element (the host) (generated on bind to preserve element)
  */
	// getHost() { returns host }

	/**
  * Clone object without reference
  */
	// cloneObject() { returns host }

	/**
  * Custom element created, but not currently on dom
  */
	// OPTIONAL created() { }

	/**
  * Custom element attached to dom
  */
	// OPTIONAL attached() { }

	/**
  * Custom element detached from dom
  */
	// OPTIONAL detached() { }

	/**
  * Custom element atttibute has changed somehow
  * @param string name The name of the attribute added, removed or changed
  * @param string oldVal The old value of the attribute.
  * @param string newVal The new value of the attribute.
  */
	// OPTIONAL attributeChanged(name, oldVal, newVal) { }


	return RaziloComponent;
}();

exports.default = RaziloComponent;

},{"./src/core.js":55}],55:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _razilobind = require('razilobind');

var _razilobind2 = _interopRequireDefault(_razilobind);

var _razilobindCore = require('razilobind-core');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * RaziloComponent Web Component Builder Library
 * Offers simple cross browser web components to be written in ES6
 */
var Core = function () {
	function Core() {
		_classCallCheck(this, Core);
	}

	/**
  * [public] - Register a new custom element, creating a naff working scope for the interface
  * @param object blueprint The custom element blueprint to create the custom element from
  */
	Core.registerElement = function registerElement(bp, name, ext, component) {
		if (!name) throw 'Cannot register custom element without a custom element name via register(name, extends) or new CustomElement({name: ..., extends: ...})';

		// create proto
		var proto = Object.create(HTMLElement.prototype);

		// forward callbacks, all these happen as a per instance of component basis, outside of these things are per component registration
		proto.createdCallback = function () {
			Core.createTemplate(this, name, Core.cloneObject(bp), component); // create only
			this.razilobind.model.getHost = Core.getThis.bind(this); // get the element scope
			this.razilobind.model.cloneObject = Core.cloneObject; // get the element scope
			this.razilobind.model.fireEvent = Core.fire.bind(this); // setup fireEvent on host
			this.razilobind.model.dateFormat = _razilobindCore.RaziloBindDateFormat.dateFormat; // setup fireEvent on host
			if (typeof this.razilobind.model.created === 'function') this.razilobind.model.created.call(this.razilobind.model);
		};

		proto.attachedCallback = function () {
			Core.applyTemplate(this); // apply once all have been created, IMPORTANT!
			if (typeof this.razilobind.model.attached === 'function') this.razilobind.model.attached.call(this.razilobind.model);
		};

		proto.detachedCallback = function () {
			if (typeof this.razilobind.model.detached === 'function') this.razilobind.model.detached.call(this.razilobind.model);
		};

		proto.attributeChangedCallback = function (att, oldVal, newVal) {
			if (typeof this.razilobind.model.attributeChanged === 'function') this.razilobind.model.attributeChanged.call(this.razilobind.model, att, oldVal, newVal);
			Core.fire('attributechanged', { attribute: att, oldVal: oldVal, newVal: newVal }, this);
		};

		// register custom element
		var protoWrap = { prototype: proto };
		if (!!ext) protoWrap.extends = ext;
		document.registerElement(name, protoWrap);
	};

	Core.getThis = function getThis() {
		return this;
	};

	/**
  * [public] - Fires an event off, from the provided element, or from scope if element not set
  * @param HTML obejct element The element to fire from
  * @param string name The name of the event
  * @param mixed detail [optional] Any optional details you wish to send
  */


	Core.fire = function fire(name, detail, element) {
		element = typeof element === 'undefined' ? this : element.host ? element.host : element;

		var event;
		try {
			event = !detail ? new Event(name) : new CustomEvent(name, { 'detail': detail });
		} catch (e) {
			// allback to create event old fashioned way
			event = document.createEvent('customEvent');
			if (detail) event.detail = detail;
			event.initEvent(name, true, true);
		}

		try {
			element.dispatchEvent(event);
		} catch (e) {
			console.log('MAX CALL STACK ERROR', e);
			console.log(element, event);
		}
	};

	/**
  * [public] - Clone an objects properties and methods
  * @param object The object to clone
  * @return object The cloned object (not a reference to an object)
  */


	Core.cloneObject = function cloneObject(obj) {
		if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== "object" || obj === null) return obj;

		var clone;

		if (obj instanceof Date) {
			clone = new Date();
			clone.setTime(obj.getTime());
			return clone;
		}

		if (obj instanceof Array) {
			clone = [];
			for (var i = 0, len = obj.length; i < len; i++) {
				clone[i] = Core.cloneObject(obj[i]);
			}return clone;
		}

		// Handle Object
		if (obj instanceof Object) {
			clone = {};
			for (var att in obj) {
				if (obj.hasOwnProperty(att)) clone[att] = Core.cloneObject(obj[att]);
			}return clone;
		}

		throw new Error("Unable to clone object " + obj + ",  this object type is not supported in component blueprints.");
	};

	/**
  * [private] - Apply a template to a fragment and apply binding to the framnet component, store this against the host element
  * This will allow us to bind away without the worry of where scope lies, as all component binding happens in isolation.
  * once all binding complete, we can move content around into it's correct place.
  * @param html object host The custom element to apply the template to
  * @param object model The model data to apply to the host
  * @param object component The web component template to use as the template for building the html element
  */


	Core.createTemplate = function createTemplate(host, name, model, component) {
		if (!host) throw 'Host custom element not specified, please add custom element reference or lookup';

		var template = component.querySelector('template#' + name);
		if (!template) return host.razilobind = { model: model };

		// bind to component fragment then move into host html after all binds complete
		var rb = new _razilobind2.default({ noParentBind: true });
		host.componentFragment = document.createDocumentFragment();
		host.componentFragment.appendChild(document.createElement('COMPONENT'));
		host.componentFragment.firstChild.innerHTML = template.innerHTML;
		rb.bind(host.componentFragment.firstChild, model);

		// move bind data from componentFragment to host ready for applying template, leave this until all binds completed (stops duplicate bindings)
		host.razilobind = host.componentFragment.firstChild.razilobind;
		delete host.componentFragment.firstChild.razilobind;
	};

	/**
  * [private] - Apply built component to the host element. Takes a fragment component and merges it into the host html, mixing any content from the host into the component fragment first.
  * @param mixed host The custom element to apply the template to, usually 'this' but can be selector string
  */


	Core.applyTemplate = function applyTemplate(host) {
		if (!host.componentFragment) return;

		// do we need to apply any host content?... pull into fragment
		var matches = host.componentFragment.firstChild.querySelectorAll('content');
		if (matches.length > 0) {
			for (var i = 0; i < matches.length; i++) {
				if (matches[i].hasAttribute('select')) {
					// substitute fragment content placeholders with selected host content
					var name = matches[i].getAttribute('select');
					var found = host.querySelector(name);
					if (found) matches[i].parentNode.replaceChild(found, matches[i]);
				} else {
					// move all host content to fragment placeholder and remove placeholder
					while (host.firstChild) {
						matches[i].parentNode.appendChild(host.firstChild);
					}matches[i].parentNode.removeChild(matches[i]);
				}
			}
		}

		// transfer over the fragment to the host and remove
		host.innerHTML = '';
		while (host.componentFragment.firstChild.firstChild) {
			host.appendChild(host.componentFragment.firstChild.firstChild);
		}delete host.componentFragment;
	};

	return Core;
}();

exports.default = Core;

},{"razilobind":53,"razilobind-core":37}],56:[function(require,module,exports){
'use strict';

/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.7.23
!function () {
  window.WebComponents = window.WebComponents || { flags: {} };var e = "webcomponents-lite.js",
      t = document.querySelector('script[src*="' + e + '"]'),
      n = {};if (!n.noOpts) {
    if (location.search.slice(1).split("&").forEach(function (e) {
      var t,
          o = e.split("=");o[0] && (t = o[0].match(/wc-(.+)/)) && (n[t[1]] = o[1] || !0);
    }), t) for (var o, r = 0; o = t.attributes[r]; r++) {
      "src" !== o.name && (n[o.name] = o.value || !0);
    }if (n.log && n.log.split) {
      var i = n.log.split(",");n.log = {}, i.forEach(function (e) {
        n.log[e] = !0;
      });
    } else n.log = {};
  }n.register && (window.CustomElements = window.CustomElements || { flags: {} }, window.CustomElements.flags.register = n.register), WebComponents.flags = n;
}(), function (e) {
  "use strict";
  function t(e) {
    return void 0 !== h[e];
  }function n() {
    s.call(this), this._isInvalid = !0;
  }function o(e) {
    return "" == e && n.call(this), e.toLowerCase();
  }function r(e) {
    var t = e.charCodeAt(0);return t > 32 && t < 127 && [34, 35, 60, 62, 63, 96].indexOf(t) == -1 ? e : encodeURIComponent(e);
  }function i(e) {
    var t = e.charCodeAt(0);return t > 32 && t < 127 && [34, 35, 60, 62, 96].indexOf(t) == -1 ? e : encodeURIComponent(e);
  }function a(e, a, s) {
    function c(e) {
      g.push(e);
    }var d = a || "scheme start",
        l = 0,
        u = "",
        w = !1,
        _ = !1,
        g = [];e: for (; (e[l - 1] != p || 0 == l) && !this._isInvalid;) {
      var b = e[l];switch (d) {case "scheme start":
          if (!b || !m.test(b)) {
            if (a) {
              c("Invalid scheme.");break e;
            }u = "", d = "no scheme";continue;
          }u += b.toLowerCase(), d = "scheme";break;case "scheme":
          if (b && v.test(b)) u += b.toLowerCase();else {
            if (":" != b) {
              if (a) {
                if (p == b) break e;c("Code point not allowed in scheme: " + b);break e;
              }u = "", l = 0, d = "no scheme";continue;
            }if (this._scheme = u, u = "", a) break e;t(this._scheme) && (this._isRelative = !0), d = "file" == this._scheme ? "relative" : this._isRelative && s && s._scheme == this._scheme ? "relative or authority" : this._isRelative ? "authority first slash" : "scheme data";
          }break;case "scheme data":
          "?" == b ? (this._query = "?", d = "query") : "#" == b ? (this._fragment = "#", d = "fragment") : p != b && "\t" != b && "\n" != b && "\r" != b && (this._schemeData += r(b));break;case "no scheme":
          if (s && t(s._scheme)) {
            d = "relative";continue;
          }c("Missing scheme."), n.call(this);break;case "relative or authority":
          if ("/" != b || "/" != e[l + 1]) {
            c("Expected /, got: " + b), d = "relative";continue;
          }d = "authority ignore slashes";break;case "relative":
          if (this._isRelative = !0, "file" != this._scheme && (this._scheme = s._scheme), p == b) {
            this._host = s._host, this._port = s._port, this._path = s._path.slice(), this._query = s._query, this._username = s._username, this._password = s._password;break e;
          }if ("/" == b || "\\" == b) "\\" == b && c("\\ is an invalid code point."), d = "relative slash";else if ("?" == b) this._host = s._host, this._port = s._port, this._path = s._path.slice(), this._query = "?", this._username = s._username, this._password = s._password, d = "query";else {
            if ("#" != b) {
              var y = e[l + 1],
                  E = e[l + 2];("file" != this._scheme || !m.test(b) || ":" != y && "|" != y || p != E && "/" != E && "\\" != E && "?" != E && "#" != E) && (this._host = s._host, this._port = s._port, this._username = s._username, this._password = s._password, this._path = s._path.slice(), this._path.pop()), d = "relative path";continue;
            }this._host = s._host, this._port = s._port, this._path = s._path.slice(), this._query = s._query, this._fragment = "#", this._username = s._username, this._password = s._password, d = "fragment";
          }break;case "relative slash":
          if ("/" != b && "\\" != b) {
            "file" != this._scheme && (this._host = s._host, this._port = s._port, this._username = s._username, this._password = s._password), d = "relative path";continue;
          }"\\" == b && c("\\ is an invalid code point."), d = "file" == this._scheme ? "file host" : "authority ignore slashes";break;case "authority first slash":
          if ("/" != b) {
            c("Expected '/', got: " + b), d = "authority ignore slashes";continue;
          }d = "authority second slash";break;case "authority second slash":
          if (d = "authority ignore slashes", "/" != b) {
            c("Expected '/', got: " + b);continue;
          }break;case "authority ignore slashes":
          if ("/" != b && "\\" != b) {
            d = "authority";continue;
          }c("Expected authority, got: " + b);break;case "authority":
          if ("@" == b) {
            w && (c("@ already seen."), u += "%40"), w = !0;for (var L = 0; L < u.length; L++) {
              var N = u[L];if ("\t" != N && "\n" != N && "\r" != N) {
                if (":" != N || null !== this._password) {
                  var M = r(N);null !== this._password ? this._password += M : this._username += M;
                } else this._password = "";
              } else c("Invalid whitespace in authority.");
            }u = "";
          } else {
            if (p == b || "/" == b || "\\" == b || "?" == b || "#" == b) {
              l -= u.length, u = "", d = "host";continue;
            }u += b;
          }break;case "file host":
          if (p == b || "/" == b || "\\" == b || "?" == b || "#" == b) {
            2 != u.length || !m.test(u[0]) || ":" != u[1] && "|" != u[1] ? 0 == u.length ? d = "relative path start" : (this._host = o.call(this, u), u = "", d = "relative path start") : d = "relative path";continue;
          }"\t" == b || "\n" == b || "\r" == b ? c("Invalid whitespace in file host.") : u += b;break;case "host":case "hostname":
          if (":" != b || _) {
            if (p == b || "/" == b || "\\" == b || "?" == b || "#" == b) {
              if (this._host = o.call(this, u), u = "", d = "relative path start", a) break e;continue;
            }"\t" != b && "\n" != b && "\r" != b ? ("[" == b ? _ = !0 : "]" == b && (_ = !1), u += b) : c("Invalid code point in host/hostname: " + b);
          } else if (this._host = o.call(this, u), u = "", d = "port", "hostname" == a) break e;break;case "port":
          if (/[0-9]/.test(b)) u += b;else {
            if (p == b || "/" == b || "\\" == b || "?" == b || "#" == b || a) {
              if ("" != u) {
                var T = parseInt(u, 10);T != h[this._scheme] && (this._port = T + ""), u = "";
              }if (a) break e;d = "relative path start";continue;
            }"\t" == b || "\n" == b || "\r" == b ? c("Invalid code point in port: " + b) : n.call(this);
          }break;case "relative path start":
          if ("\\" == b && c("'\\' not allowed in path."), d = "relative path", "/" != b && "\\" != b) continue;break;case "relative path":
          if (p != b && "/" != b && "\\" != b && (a || "?" != b && "#" != b)) "\t" != b && "\n" != b && "\r" != b && (u += r(b));else {
            "\\" == b && c("\\ not allowed in relative path.");var O;(O = f[u.toLowerCase()]) && (u = O), ".." == u ? (this._path.pop(), "/" != b && "\\" != b && this._path.push("")) : "." == u && "/" != b && "\\" != b ? this._path.push("") : "." != u && ("file" == this._scheme && 0 == this._path.length && 2 == u.length && m.test(u[0]) && "|" == u[1] && (u = u[0] + ":"), this._path.push(u)), u = "", "?" == b ? (this._query = "?", d = "query") : "#" == b && (this._fragment = "#", d = "fragment");
          }break;case "query":
          a || "#" != b ? p != b && "\t" != b && "\n" != b && "\r" != b && (this._query += i(b)) : (this._fragment = "#", d = "fragment");break;case "fragment":
          p != b && "\t" != b && "\n" != b && "\r" != b && (this._fragment += b);}l++;
    }
  }function s() {
    this._scheme = "", this._schemeData = "", this._username = "", this._password = null, this._host = "", this._port = "", this._path = [], this._query = "", this._fragment = "", this._isInvalid = !1, this._isRelative = !1;
  }function c(e, t) {
    void 0 === t || t instanceof c || (t = new c(String(t))), this._url = e, s.call(this);var n = e.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, "");a.call(this, n, null, t);
  }var d = !1;if (!e.forceJURL) try {
    var l = new URL("b", "http://a");l.pathname = "c%20d", d = "http://a/c%20d" === l.href;
  } catch (u) {}if (!d) {
    var h = Object.create(null);h.ftp = 21, h.file = 0, h.gopher = 70, h.http = 80, h.https = 443, h.ws = 80, h.wss = 443;var f = Object.create(null);f["%2e"] = ".", f[".%2e"] = "..", f["%2e."] = "..", f["%2e%2e"] = "..";var p = void 0,
        m = /[a-zA-Z]/,
        v = /[a-zA-Z0-9\+\-\.]/;c.prototype = { toString: function toString() {
        return this.href;
      }, get href() {
        if (this._isInvalid) return this._url;var e = "";return "" == this._username && null == this._password || (e = this._username + (null != this._password ? ":" + this._password : "") + "@"), this.protocol + (this._isRelative ? "//" + e + this.host : "") + this.pathname + this._query + this._fragment;
      }, set href(e) {
        s.call(this), a.call(this, e);
      }, get protocol() {
        return this._scheme + ":";
      }, set protocol(e) {
        this._isInvalid || a.call(this, e + ":", "scheme start");
      }, get host() {
        return this._isInvalid ? "" : this._port ? this._host + ":" + this._port : this._host;
      }, set host(e) {
        !this._isInvalid && this._isRelative && a.call(this, e, "host");
      }, get hostname() {
        return this._host;
      }, set hostname(e) {
        !this._isInvalid && this._isRelative && a.call(this, e, "hostname");
      }, get port() {
        return this._port;
      }, set port(e) {
        !this._isInvalid && this._isRelative && a.call(this, e, "port");
      }, get pathname() {
        return this._isInvalid ? "" : this._isRelative ? "/" + this._path.join("/") : this._schemeData;
      }, set pathname(e) {
        !this._isInvalid && this._isRelative && (this._path = [], a.call(this, e, "relative path start"));
      }, get search() {
        return this._isInvalid || !this._query || "?" == this._query ? "" : this._query;
      }, set search(e) {
        !this._isInvalid && this._isRelative && (this._query = "?", "?" == e[0] && (e = e.slice(1)), a.call(this, e, "query"));
      }, get hash() {
        return this._isInvalid || !this._fragment || "#" == this._fragment ? "" : this._fragment;
      }, set hash(e) {
        this._isInvalid || (this._fragment = "#", "#" == e[0] && (e = e.slice(1)), a.call(this, e, "fragment"));
      }, get origin() {
        var e;if (this._isInvalid || !this._scheme) return "";switch (this._scheme) {case "data":case "file":case "javascript":case "mailto":
            return "null";}return e = this.host, e ? this._scheme + "://" + e : "";
      } };var w = e.URL;w && (c.createObjectURL = function (e) {
      return w.createObjectURL.apply(w, arguments);
    }, c.revokeObjectURL = function (e) {
      w.revokeObjectURL(e);
    }), e.URL = c;
  }
}(self), "undefined" == typeof WeakMap && !function () {
  var e = Object.defineProperty,
      t = Date.now() % 1e9,
      n = function n() {
    this.name = "__st" + (1e9 * Math.random() >>> 0) + (t++ + "__");
  };n.prototype = { set: function set(t, n) {
      var o = t[this.name];return o && o[0] === t ? o[1] = n : e(t, this.name, { value: [t, n], writable: !0 }), this;
    }, get: function get(e) {
      var t;return (t = e[this.name]) && t[0] === e ? t[1] : void 0;
    }, "delete": function _delete(e) {
      var t = e[this.name];return !(!t || t[0] !== e) && (t[0] = t[1] = void 0, !0);
    }, has: function has(e) {
      var t = e[this.name];return !!t && t[0] === e;
    } }, window.WeakMap = n;
}(), function (e) {
  function t(e) {
    b.push(e), g || (g = !0, m(o));
  }function n(e) {
    return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(e) || e;
  }function o() {
    g = !1;var e = b;b = [], e.sort(function (e, t) {
      return e.uid_ - t.uid_;
    });var t = !1;e.forEach(function (e) {
      var n = e.takeRecords();r(e), n.length && (e.callback_(n, e), t = !0);
    }), t && o();
  }function r(e) {
    e.nodes_.forEach(function (t) {
      var n = v.get(t);n && n.forEach(function (t) {
        t.observer === e && t.removeTransientObservers();
      });
    });
  }function i(e, t) {
    for (var n = e; n; n = n.parentNode) {
      var o = v.get(n);if (o) for (var r = 0; r < o.length; r++) {
        var i = o[r],
            a = i.options;if (n === e || a.subtree) {
          var s = t(a);s && i.enqueue(s);
        }
      }
    }
  }function a(e) {
    this.callback_ = e, this.nodes_ = [], this.records_ = [], this.uid_ = ++y;
  }function s(e, t) {
    this.type = e, this.target = t, this.addedNodes = [], this.removedNodes = [], this.previousSibling = null, this.nextSibling = null, this.attributeName = null, this.attributeNamespace = null, this.oldValue = null;
  }function c(e) {
    var t = new s(e.type, e.target);return t.addedNodes = e.addedNodes.slice(), t.removedNodes = e.removedNodes.slice(), t.previousSibling = e.previousSibling, t.nextSibling = e.nextSibling, t.attributeName = e.attributeName, t.attributeNamespace = e.attributeNamespace, t.oldValue = e.oldValue, t;
  }function d(e, t) {
    return E = new s(e, t);
  }function l(e) {
    return L ? L : (L = c(E), L.oldValue = e, L);
  }function u() {
    E = L = void 0;
  }function h(e) {
    return e === L || e === E;
  }function f(e, t) {
    return e === t ? e : L && h(e) ? L : null;
  }function p(e, t, n) {
    this.observer = e, this.target = t, this.options = n, this.transientObservedNodes = [];
  }if (!e.JsMutationObserver) {
    var m,
        v = new WeakMap();if (/Trident|Edge/.test(navigator.userAgent)) m = setTimeout;else if (window.setImmediate) m = window.setImmediate;else {
      var w = [],
          _ = String(Math.random());window.addEventListener("message", function (e) {
        if (e.data === _) {
          var t = w;w = [], t.forEach(function (e) {
            e();
          });
        }
      }), m = function m(e) {
        w.push(e), window.postMessage(_, "*");
      };
    }var g = !1,
        b = [],
        y = 0;a.prototype = { observe: function observe(e, t) {
        if (e = n(e), !t.childList && !t.attributes && !t.characterData || t.attributeOldValue && !t.attributes || t.attributeFilter && t.attributeFilter.length && !t.attributes || t.characterDataOldValue && !t.characterData) throw new SyntaxError();var o = v.get(e);o || v.set(e, o = []);for (var r, i = 0; i < o.length; i++) {
          if (o[i].observer === this) {
            r = o[i], r.removeListeners(), r.options = t;break;
          }
        }r || (r = new p(this, e, t), o.push(r), this.nodes_.push(e)), r.addListeners();
      }, disconnect: function disconnect() {
        this.nodes_.forEach(function (e) {
          for (var t = v.get(e), n = 0; n < t.length; n++) {
            var o = t[n];if (o.observer === this) {
              o.removeListeners(), t.splice(n, 1);break;
            }
          }
        }, this), this.records_ = [];
      }, takeRecords: function takeRecords() {
        var e = this.records_;return this.records_ = [], e;
      } };var E, L;p.prototype = { enqueue: function enqueue(e) {
        var n = this.observer.records_,
            o = n.length;if (n.length > 0) {
          var r = n[o - 1],
              i = f(r, e);if (i) return void (n[o - 1] = i);
        } else t(this.observer);n[o] = e;
      }, addListeners: function addListeners() {
        this.addListeners_(this.target);
      }, addListeners_: function addListeners_(e) {
        var t = this.options;t.attributes && e.addEventListener("DOMAttrModified", this, !0), t.characterData && e.addEventListener("DOMCharacterDataModified", this, !0), t.childList && e.addEventListener("DOMNodeInserted", this, !0), (t.childList || t.subtree) && e.addEventListener("DOMNodeRemoved", this, !0);
      }, removeListeners: function removeListeners() {
        this.removeListeners_(this.target);
      }, removeListeners_: function removeListeners_(e) {
        var t = this.options;t.attributes && e.removeEventListener("DOMAttrModified", this, !0), t.characterData && e.removeEventListener("DOMCharacterDataModified", this, !0), t.childList && e.removeEventListener("DOMNodeInserted", this, !0), (t.childList || t.subtree) && e.removeEventListener("DOMNodeRemoved", this, !0);
      }, addTransientObserver: function addTransientObserver(e) {
        if (e !== this.target) {
          this.addListeners_(e), this.transientObservedNodes.push(e);var t = v.get(e);t || v.set(e, t = []), t.push(this);
        }
      }, removeTransientObservers: function removeTransientObservers() {
        var e = this.transientObservedNodes;this.transientObservedNodes = [], e.forEach(function (e) {
          this.removeListeners_(e);for (var t = v.get(e), n = 0; n < t.length; n++) {
            if (t[n] === this) {
              t.splice(n, 1);break;
            }
          }
        }, this);
      }, handleEvent: function handleEvent(e) {
        switch (e.stopImmediatePropagation(), e.type) {case "DOMAttrModified":
            var t = e.attrName,
                n = e.relatedNode.namespaceURI,
                o = e.target,
                r = new d("attributes", o);r.attributeName = t, r.attributeNamespace = n;var a = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;i(o, function (e) {
              if (e.attributes && (!e.attributeFilter || !e.attributeFilter.length || e.attributeFilter.indexOf(t) !== -1 || e.attributeFilter.indexOf(n) !== -1)) return e.attributeOldValue ? l(a) : r;
            });break;case "DOMCharacterDataModified":
            var o = e.target,
                r = d("characterData", o),
                a = e.prevValue;i(o, function (e) {
              if (e.characterData) return e.characterDataOldValue ? l(a) : r;
            });break;case "DOMNodeRemoved":
            this.addTransientObserver(e.target);case "DOMNodeInserted":
            var s,
                c,
                h = e.target;"DOMNodeInserted" === e.type ? (s = [h], c = []) : (s = [], c = [h]);var f = h.previousSibling,
                p = h.nextSibling,
                r = d("childList", e.target.parentNode);r.addedNodes = s, r.removedNodes = c, r.previousSibling = f, r.nextSibling = p, i(e.relatedNode, function (e) {
              if (e.childList) return r;
            });}u();
      } }, e.JsMutationObserver = a, e.MutationObserver || (e.MutationObserver = a, a._isPolyfilled = !0);
  }
}(self), function () {
  function e(e) {
    switch (e) {case "&":
        return "&amp;";case "<":
        return "&lt;";case ">":
        return "&gt;";case " ":
        return "&nbsp;";}
  }function t(t) {
    return t.replace(u, e);
  }var n = "undefined" == typeof HTMLTemplateElement;/Trident/.test(navigator.userAgent) && !function () {
    var e = document.importNode;document.importNode = function () {
      var t = e.apply(document, arguments);if (t.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        var n = document.createDocumentFragment();return n.appendChild(t), n;
      }return t;
    };
  }();var o = function () {
    if (!n) {
      var e = document.createElement("template"),
          t = document.createElement("template");t.content.appendChild(document.createElement("div")), e.content.appendChild(t);var o = e.cloneNode(!0);return 0 === o.content.childNodes.length || 0 === o.content.firstChild.content.childNodes.length;
    }
  }(),
      r = "template",
      i = function i() {};if (n) {
    var a = document.implementation.createHTMLDocument("template"),
        s = !0,
        c = document.createElement("style");c.textContent = r + "{display:none;}";var d = document.head;d.insertBefore(c, d.firstElementChild), i.prototype = Object.create(HTMLElement.prototype), i.decorate = function (e) {
      if (!e.content) {
        e.content = a.createDocumentFragment();for (var n; n = e.firstChild;) {
          e.content.appendChild(n);
        }if (e.cloneNode = function (e) {
          return i.cloneNode(this, e);
        }, s) try {
          Object.defineProperty(e, "innerHTML", { get: function get() {
              for (var e = "", n = this.content.firstChild; n; n = n.nextSibling) {
                e += n.outerHTML || t(n.data);
              }return e;
            }, set: function set(e) {
              for (a.body.innerHTML = e, i.bootstrap(a); this.content.firstChild;) {
                this.content.removeChild(this.content.firstChild);
              }for (; a.body.firstChild;) {
                this.content.appendChild(a.body.firstChild);
              }
            }, configurable: !0 });
        } catch (o) {
          s = !1;
        }i.bootstrap(e.content);
      }
    }, i.bootstrap = function (e) {
      for (var t, n = e.querySelectorAll(r), o = 0, a = n.length; o < a && (t = n[o]); o++) {
        i.decorate(t);
      }
    }, document.addEventListener("DOMContentLoaded", function () {
      i.bootstrap(document);
    });var l = document.createElement;document.createElement = function () {
      "use strict";
      var e = l.apply(document, arguments);return "template" === e.localName && i.decorate(e), e;
    };var u = /[&\u00A0<>]/g;
  }if (n || o) {
    var h = Node.prototype.cloneNode;i.cloneNode = function (e, t) {
      var n = h.call(e, !1);return this.decorate && this.decorate(n), t && (n.content.appendChild(h.call(e.content, !0)), this.fixClonedDom(n.content, e.content)), n;
    }, i.fixClonedDom = function (e, t) {
      if (t.querySelectorAll) for (var n, o, i = t.querySelectorAll(r), a = e.querySelectorAll(r), s = 0, c = a.length; s < c; s++) {
        o = i[s], n = a[s], this.decorate && this.decorate(o), n.parentNode.replaceChild(o.cloneNode(!0), n);
      }
    };var f = document.importNode;Node.prototype.cloneNode = function (e) {
      var t = h.call(this, e);return e && i.fixClonedDom(t, this), t;
    }, document.importNode = function (e, t) {
      if (e.localName === r) return i.cloneNode(e, t);var n = f.call(document, e, t);return t && i.fixClonedDom(n, e), n;
    }, o && (HTMLTemplateElement.prototype.cloneNode = function (e) {
      return i.cloneNode(this, e);
    });
  }n && (window.HTMLTemplateElement = i);
}(), function (e) {
  "use strict";
  if (!window.performance || !window.performance.now) {
    var t = Date.now();window.performance = { now: function now() {
        return Date.now() - t;
      } };
  }window.requestAnimationFrame || (window.requestAnimationFrame = function () {
    var e = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;return e ? function (t) {
      return e(function () {
        t(performance.now());
      });
    } : function (e) {
      return window.setTimeout(e, 1e3 / 60);
    };
  }()), window.cancelAnimationFrame || (window.cancelAnimationFrame = function () {
    return window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function (e) {
      clearTimeout(e);
    };
  }());var n = function () {
    var e = document.createEvent("Event");return e.initEvent("foo", !0, !0), e.preventDefault(), e.defaultPrevented;
  }();if (!n) {
    var o = Event.prototype.preventDefault;Event.prototype.preventDefault = function () {
      this.cancelable && (o.call(this), Object.defineProperty(this, "defaultPrevented", { get: function get() {
          return !0;
        }, configurable: !0 }));
    };
  }var r = /Trident/.test(navigator.userAgent);if ((!window.CustomEvent || r && "function" != typeof window.CustomEvent) && (window.CustomEvent = function (e, t) {
    t = t || {};var n = document.createEvent("CustomEvent");return n.initCustomEvent(e, Boolean(t.bubbles), Boolean(t.cancelable), t.detail), n;
  }, window.CustomEvent.prototype = window.Event.prototype), !window.Event || r && "function" != typeof window.Event) {
    var i = window.Event;window.Event = function (e, t) {
      t = t || {};var n = document.createEvent("Event");return n.initEvent(e, Boolean(t.bubbles), Boolean(t.cancelable)), n;
    }, window.Event.prototype = i.prototype;
  }
}(window.WebComponents), window.HTMLImports = window.HTMLImports || { flags: {} }, function (e) {
  function t(e, t) {
    t = t || p, o(function () {
      i(e, t);
    }, t);
  }function n(e) {
    return "complete" === e.readyState || e.readyState === w;
  }function o(e, t) {
    if (n(t)) e && e();else {
      var r = function r() {
        "complete" !== t.readyState && t.readyState !== w || (t.removeEventListener(_, r), o(e, t));
      };t.addEventListener(_, r);
    }
  }function r(e) {
    e.target.__loaded = !0;
  }function i(e, t) {
    function n() {
      c == d && e && e({ allImports: s, loadedImports: l, errorImports: u });
    }function o(e) {
      r(e), l.push(this), c++, n();
    }function i(e) {
      u.push(this), c++, n();
    }var s = t.querySelectorAll("link[rel=import]"),
        c = 0,
        d = s.length,
        l = [],
        u = [];if (d) for (var h, f = 0; f < d && (h = s[f]); f++) {
      a(h) ? (l.push(this), c++, n()) : (h.addEventListener("load", o), h.addEventListener("error", i));
    } else n();
  }function a(e) {
    return u ? e.__loaded || e["import"] && "loading" !== e["import"].readyState : e.__importParsed;
  }function s(e) {
    for (var t, n = 0, o = e.length; n < o && (t = e[n]); n++) {
      c(t) && d(t);
    }
  }function c(e) {
    return "link" === e.localName && "import" === e.rel;
  }function d(e) {
    var t = e["import"];t ? r({ target: e }) : (e.addEventListener("load", r), e.addEventListener("error", r));
  }var l = "import",
      u = Boolean(l in document.createElement("link")),
      h = Boolean(window.ShadowDOMPolyfill),
      f = function f(e) {
    return h ? window.ShadowDOMPolyfill.wrapIfNeeded(e) : e;
  },
      p = f(document),
      m = { get: function get() {
      var e = window.HTMLImports.currentScript || document.currentScript || ("complete" !== document.readyState ? document.scripts[document.scripts.length - 1] : null);return f(e);
    }, configurable: !0 };Object.defineProperty(document, "_currentScript", m), Object.defineProperty(p, "_currentScript", m);var v = /Trident/.test(navigator.userAgent),
      w = v ? "complete" : "interactive",
      _ = "readystatechange";u && (new MutationObserver(function (e) {
    for (var t, n = 0, o = e.length; n < o && (t = e[n]); n++) {
      t.addedNodes && s(t.addedNodes);
    }
  }).observe(document.head, { childList: !0 }), function () {
    if ("loading" === document.readyState) for (var e, t = document.querySelectorAll("link[rel=import]"), n = 0, o = t.length; n < o && (e = t[n]); n++) {
      d(e);
    }
  }()), t(function (e) {
    window.HTMLImports.ready = !0, window.HTMLImports.readyTime = new Date().getTime();var t = p.createEvent("CustomEvent");t.initCustomEvent("HTMLImportsLoaded", !0, !0, e), p.dispatchEvent(t);
  }), e.IMPORT_LINK_TYPE = l, e.useNative = u, e.rootDocument = p, e.whenReady = t, e.isIE = v;
}(window.HTMLImports), function (e) {
  var t = [],
      n = function n(e) {
    t.push(e);
  },
      o = function o() {
    t.forEach(function (t) {
      t(e);
    });
  };e.addModule = n, e.initializeModules = o;
}(window.HTMLImports), window.HTMLImports.addModule(function (e) {
  var t = /(url\()([^)]*)(\))/g,
      n = /(@import[\s]+(?!url\())([^;]*)(;)/g,
      o = { resolveUrlsInStyle: function resolveUrlsInStyle(e, t) {
      var n = e.ownerDocument,
          o = n.createElement("a");return e.textContent = this.resolveUrlsInCssText(e.textContent, t, o), e;
    }, resolveUrlsInCssText: function resolveUrlsInCssText(e, o, r) {
      var i = this.replaceUrls(e, r, o, t);return i = this.replaceUrls(i, r, o, n);
    }, replaceUrls: function replaceUrls(e, t, n, o) {
      return e.replace(o, function (e, o, r, i) {
        var a = r.replace(/["']/g, "");return n && (a = new URL(a, n).href), t.href = a, a = t.href, o + "'" + a + "'" + i;
      });
    } };e.path = o;
}), window.HTMLImports.addModule(function (e) {
  var t = { async: !0, ok: function ok(e) {
      return e.status >= 200 && e.status < 300 || 304 === e.status || 0 === e.status;
    }, load: function load(n, o, r) {
      var i = new XMLHttpRequest();return (e.flags.debug || e.flags.bust) && (n += "?" + Math.random()), i.open("GET", n, t.async), i.addEventListener("readystatechange", function (e) {
        if (4 === i.readyState) {
          var n = null;try {
            var a = i.getResponseHeader("Location");a && (n = "/" === a.substr(0, 1) ? location.origin + a : a);
          } catch (e) {
            console.error(e.message);
          }o.call(r, !t.ok(i) && i, i.response || i.responseText, n);
        }
      }), i.send(), i;
    }, loadDocument: function loadDocument(e, t, n) {
      this.load(e, t, n).responseType = "document";
    } };e.xhr = t;
}), window.HTMLImports.addModule(function (e) {
  var t = e.xhr,
      n = e.flags,
      o = function o(e, t) {
    this.cache = {}, this.onload = e, this.oncomplete = t, this.inflight = 0, this.pending = {};
  };o.prototype = { addNodes: function addNodes(e) {
      this.inflight += e.length;for (var t, n = 0, o = e.length; n < o && (t = e[n]); n++) {
        this.require(t);
      }this.checkDone();
    }, addNode: function addNode(e) {
      this.inflight++, this.require(e), this.checkDone();
    }, require: function require(e) {
      var t = e.src || e.href;e.__nodeUrl = t, this.dedupe(t, e) || this.fetch(t, e);
    }, dedupe: function dedupe(e, t) {
      if (this.pending[e]) return this.pending[e].push(t), !0;return this.cache[e] ? (this.onload(e, t, this.cache[e]), this.tail(), !0) : (this.pending[e] = [t], !1);
    }, fetch: function fetch(e, o) {
      if (n.load && console.log("fetch", e, o), e) {
        if (e.match(/^data:/)) {
          var r = e.split(","),
              i = r[0],
              a = r[1];a = i.indexOf(";base64") > -1 ? atob(a) : decodeURIComponent(a), setTimeout(function () {
            this.receive(e, o, null, a);
          }.bind(this), 0);
        } else {
          var s = function (t, n, r) {
            this.receive(e, o, t, n, r);
          }.bind(this);t.load(e, s);
        }
      } else setTimeout(function () {
        this.receive(e, o, { error: "href must be specified" }, null);
      }.bind(this), 0);
    }, receive: function receive(e, t, n, o, r) {
      this.cache[e] = o;for (var i, a = this.pending[e], s = 0, c = a.length; s < c && (i = a[s]); s++) {
        this.onload(e, i, o, n, r), this.tail();
      }this.pending[e] = null;
    }, tail: function tail() {
      --this.inflight, this.checkDone();
    }, checkDone: function checkDone() {
      this.inflight || this.oncomplete();
    } }, e.Loader = o;
}), window.HTMLImports.addModule(function (e) {
  var t = function t(e) {
    this.addCallback = e, this.mo = new MutationObserver(this.handler.bind(this));
  };t.prototype = { handler: function handler(e) {
      for (var t, n = 0, o = e.length; n < o && (t = e[n]); n++) {
        "childList" === t.type && t.addedNodes.length && this.addedNodes(t.addedNodes);
      }
    }, addedNodes: function addedNodes(e) {
      this.addCallback && this.addCallback(e);for (var t, n = 0, o = e.length; n < o && (t = e[n]); n++) {
        t.children && t.children.length && this.addedNodes(t.children);
      }
    }, observe: function observe(e) {
      this.mo.observe(e, { childList: !0, subtree: !0 });
    } }, e.Observer = t;
}), window.HTMLImports.addModule(function (e) {
  function t(e) {
    return "link" === e.localName && e.rel === l;
  }function n(e) {
    var t = o(e);return "data:text/javascript;charset=utf-8," + encodeURIComponent(t);
  }function o(e) {
    return e.textContent + r(e);
  }function r(e) {
    var t = e.ownerDocument;t.__importedScripts = t.__importedScripts || 0;var n = e.ownerDocument.baseURI,
        o = t.__importedScripts ? "-" + t.__importedScripts : "";return t.__importedScripts++, "\n//# sourceURL=" + n + o + ".js\n";
  }function i(e) {
    var t = e.ownerDocument.createElement("style");return t.textContent = e.textContent, a.resolveUrlsInStyle(t), t;
  }var a = e.path,
      s = e.rootDocument,
      c = e.flags,
      d = e.isIE,
      l = e.IMPORT_LINK_TYPE,
      u = "link[rel=" + l + "]",
      h = { documentSelectors: u, importsSelectors: [u, "link[rel=stylesheet]:not([type])", "style:not([type])", "script:not([type])", 'script[type="application/javascript"]', 'script[type="text/javascript"]'].join(","), map: { link: "parseLink", script: "parseScript", style: "parseStyle" }, dynamicElements: [], parseNext: function parseNext() {
      var e = this.nextToParse();e && this.parse(e);
    }, parse: function parse(e) {
      if (this.isParsed(e)) return void (c.parse && console.log("[%s] is already parsed", e.localName));var t = this[this.map[e.localName]];t && (this.markParsing(e), t.call(this, e));
    }, parseDynamic: function parseDynamic(e, t) {
      this.dynamicElements.push(e), t || this.parseNext();
    }, markParsing: function markParsing(e) {
      c.parse && console.log("parsing", e), this.parsingElement = e;
    }, markParsingComplete: function markParsingComplete(e) {
      e.__importParsed = !0, this.markDynamicParsingComplete(e), e.__importElement && (e.__importElement.__importParsed = !0, this.markDynamicParsingComplete(e.__importElement)), this.parsingElement = null, c.parse && console.log("completed", e);
    }, markDynamicParsingComplete: function markDynamicParsingComplete(e) {
      var t = this.dynamicElements.indexOf(e);t >= 0 && this.dynamicElements.splice(t, 1);
    }, parseImport: function parseImport(e) {
      if (e["import"] = e.__doc, window.HTMLImports.__importsParsingHook && window.HTMLImports.__importsParsingHook(e), e["import"] && (e["import"].__importParsed = !0), this.markParsingComplete(e), e.__resource && !e.__error ? e.dispatchEvent(new CustomEvent("load", { bubbles: !1 })) : e.dispatchEvent(new CustomEvent("error", { bubbles: !1 })), e.__pending) for (var t; e.__pending.length;) {
        t = e.__pending.shift(), t && t({ target: e });
      }this.parseNext();
    }, parseLink: function parseLink(e) {
      t(e) ? this.parseImport(e) : (e.href = e.href, this.parseGeneric(e));
    }, parseStyle: function parseStyle(e) {
      var t = e;e = i(e), t.__appliedElement = e, e.__importElement = t, this.parseGeneric(e);
    }, parseGeneric: function parseGeneric(e) {
      this.trackElement(e), this.addElementToDocument(e);
    }, rootImportForElement: function rootImportForElement(e) {
      for (var t = e; t.ownerDocument.__importLink;) {
        t = t.ownerDocument.__importLink;
      }return t;
    }, addElementToDocument: function addElementToDocument(e) {
      var t = this.rootImportForElement(e.__importElement || e);t.parentNode.insertBefore(e, t);
    }, trackElement: function trackElement(e, t) {
      var n = this,
          o = function o(r) {
        e.removeEventListener("load", o), e.removeEventListener("error", o), t && t(r), n.markParsingComplete(e), n.parseNext();
      };if (e.addEventListener("load", o), e.addEventListener("error", o), d && "style" === e.localName) {
        var r = !1;if (e.textContent.indexOf("@import") == -1) r = !0;else if (e.sheet) {
          r = !0;for (var i, a = e.sheet.cssRules, s = a ? a.length : 0, c = 0; c < s && (i = a[c]); c++) {
            i.type === CSSRule.IMPORT_RULE && (r = r && Boolean(i.styleSheet));
          }
        }r && setTimeout(function () {
          e.dispatchEvent(new CustomEvent("load", { bubbles: !1 }));
        });
      }
    }, parseScript: function parseScript(t) {
      var o = document.createElement("script");o.__importElement = t, o.src = t.src ? t.src : n(t), e.currentScript = t, this.trackElement(o, function (t) {
        o.parentNode && o.parentNode.removeChild(o), e.currentScript = null;
      }), this.addElementToDocument(o);
    }, nextToParse: function nextToParse() {
      return this._mayParse = [], !this.parsingElement && (this.nextToParseInDoc(s) || this.nextToParseDynamic());
    }, nextToParseInDoc: function nextToParseInDoc(e, n) {
      if (e && this._mayParse.indexOf(e) < 0) {
        this._mayParse.push(e);for (var o, r = e.querySelectorAll(this.parseSelectorsForNode(e)), i = 0, a = r.length; i < a && (o = r[i]); i++) {
          if (!this.isParsed(o)) return this.hasResource(o) ? t(o) ? this.nextToParseInDoc(o.__doc, o) : o : void 0;
        }
      }return n;
    }, nextToParseDynamic: function nextToParseDynamic() {
      return this.dynamicElements[0];
    }, parseSelectorsForNode: function parseSelectorsForNode(e) {
      var t = e.ownerDocument || e;return t === s ? this.documentSelectors : this.importsSelectors;
    }, isParsed: function isParsed(e) {
      return e.__importParsed;
    }, needsDynamicParsing: function needsDynamicParsing(e) {
      return this.dynamicElements.indexOf(e) >= 0;
    }, hasResource: function hasResource(e) {
      return !t(e) || void 0 !== e.__doc;
    } };e.parser = h, e.IMPORT_SELECTOR = u;
}), window.HTMLImports.addModule(function (e) {
  function t(e) {
    return n(e, a);
  }function n(e, t) {
    return "link" === e.localName && e.getAttribute("rel") === t;
  }function o(e) {
    return !!Object.getOwnPropertyDescriptor(e, "baseURI");
  }function r(e, t) {
    var n = document.implementation.createHTMLDocument(a);n._URL = t;var r = n.createElement("base");r.setAttribute("href", t), n.baseURI || o(n) || Object.defineProperty(n, "baseURI", { value: t });var i = n.createElement("meta");return i.setAttribute("charset", "utf-8"), n.head.appendChild(i), n.head.appendChild(r), n.body.innerHTML = e, window.HTMLTemplateElement && HTMLTemplateElement.bootstrap && HTMLTemplateElement.bootstrap(n), n;
  }var i = e.flags,
      a = e.IMPORT_LINK_TYPE,
      s = e.IMPORT_SELECTOR,
      c = e.rootDocument,
      d = e.Loader,
      l = e.Observer,
      u = e.parser,
      h = { documents: {}, documentPreloadSelectors: s, importsPreloadSelectors: [s].join(","), loadNode: function loadNode(e) {
      f.addNode(e);
    }, loadSubtree: function loadSubtree(e) {
      var t = this.marshalNodes(e);f.addNodes(t);
    }, marshalNodes: function marshalNodes(e) {
      return e.querySelectorAll(this.loadSelectorsForNode(e));
    }, loadSelectorsForNode: function loadSelectorsForNode(e) {
      var t = e.ownerDocument || e;return t === c ? this.documentPreloadSelectors : this.importsPreloadSelectors;
    }, loaded: function loaded(e, n, o, a, s) {
      if (i.load && console.log("loaded", e, n), n.__resource = o, n.__error = a, t(n)) {
        var c = this.documents[e];void 0 === c && (c = a ? null : r(o, s || e), c && (c.__importLink = n, this.bootDocument(c)), this.documents[e] = c), n.__doc = c;
      }u.parseNext();
    }, bootDocument: function bootDocument(e) {
      this.loadSubtree(e), this.observer.observe(e), u.parseNext();
    }, loadedAll: function loadedAll() {
      u.parseNext();
    } },
      f = new d(h.loaded.bind(h), h.loadedAll.bind(h));if (h.observer = new l(), !document.baseURI) {
    var p = { get: function get() {
        var e = document.querySelector("base");return e ? e.href : window.location.href;
      }, configurable: !0 };Object.defineProperty(document, "baseURI", p), Object.defineProperty(c, "baseURI", p);
  }e.importer = h, e.importLoader = f;
}), window.HTMLImports.addModule(function (e) {
  var t = e.parser,
      n = e.importer,
      o = { added: function added(e) {
      for (var o, r, i, a, s = 0, c = e.length; s < c && (a = e[s]); s++) {
        o || (o = a.ownerDocument, r = t.isParsed(o)), i = this.shouldLoadNode(a), i && n.loadNode(a), this.shouldParseNode(a) && r && t.parseDynamic(a, i);
      }
    }, shouldLoadNode: function shouldLoadNode(e) {
      return 1 === e.nodeType && r.call(e, n.loadSelectorsForNode(e));
    }, shouldParseNode: function shouldParseNode(e) {
      return 1 === e.nodeType && r.call(e, t.parseSelectorsForNode(e));
    } };n.observer.addCallback = o.added.bind(o);var r = HTMLElement.prototype.matches || HTMLElement.prototype.matchesSelector || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector;
}), function (e) {
  function t() {
    window.HTMLImports.importer.bootDocument(o);
  }var n = e.initializeModules;e.isIE;if (!e.useNative) {
    n();var o = e.rootDocument;"complete" === document.readyState || "interactive" === document.readyState && !window.attachEvent ? t() : document.addEventListener("DOMContentLoaded", t);
  }
}(window.HTMLImports), window.CustomElements = window.CustomElements || { flags: {} }, function (e) {
  var t = e.flags,
      n = [],
      o = function o(e) {
    n.push(e);
  },
      r = function r() {
    n.forEach(function (t) {
      t(e);
    });
  };e.addModule = o, e.initializeModules = r, e.hasNative = Boolean(document.registerElement), e.isIE = /Trident/.test(navigator.userAgent), e.useNative = !t.register && e.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative);
}(window.CustomElements), window.CustomElements.addModule(function (e) {
  function t(e, t) {
    n(e, function (e) {
      return !!t(e) || void o(e, t);
    }), o(e, t);
  }function n(e, t, o) {
    var r = e.firstElementChild;if (!r) for (r = e.firstChild; r && r.nodeType !== Node.ELEMENT_NODE;) {
      r = r.nextSibling;
    }for (; r;) {
      t(r, o) !== !0 && n(r, t, o), r = r.nextElementSibling;
    }return null;
  }function o(e, n) {
    for (var o = e.shadowRoot; o;) {
      t(o, n), o = o.olderShadowRoot;
    }
  }function r(e, t) {
    i(e, t, []);
  }function i(e, t, n) {
    if (e = window.wrap(e), !(n.indexOf(e) >= 0)) {
      n.push(e);for (var o, r = e.querySelectorAll("link[rel=" + a + "]"), s = 0, c = r.length; s < c && (o = r[s]); s++) {
        o["import"] && i(o["import"], t, n);
      }t(e);
    }
  }var a = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : "none";e.forDocumentTree = r, e.forSubtree = t;
}), window.CustomElements.addModule(function (e) {
  function t(e, t) {
    return n(e, t) || o(e, t);
  }function n(t, n) {
    return !!e.upgrade(t, n) || void (n && a(t));
  }function o(e, t) {
    g(e, function (e) {
      if (n(e, t)) return !0;
    });
  }function r(e) {
    L.push(e), E || (E = !0, setTimeout(i));
  }function i() {
    E = !1;for (var e, t = L, n = 0, o = t.length; n < o && (e = t[n]); n++) {
      e();
    }L = [];
  }function a(e) {
    y ? r(function () {
      s(e);
    }) : s(e);
  }function s(e) {
    e.__upgraded__ && !e.__attached && (e.__attached = !0, e.attachedCallback && e.attachedCallback());
  }function c(e) {
    d(e), g(e, function (e) {
      d(e);
    });
  }function d(e) {
    y ? r(function () {
      l(e);
    }) : l(e);
  }function l(e) {
    e.__upgraded__ && e.__attached && (e.__attached = !1, e.detachedCallback && e.detachedCallback());
  }function u(e) {
    for (var t = e, n = window.wrap(document); t;) {
      if (t == n) return !0;t = t.parentNode || t.nodeType === Node.DOCUMENT_FRAGMENT_NODE && t.host;
    }
  }function h(e) {
    if (e.shadowRoot && !e.shadowRoot.__watched) {
      _.dom && console.log("watching shadow-root for: ", e.localName);for (var t = e.shadowRoot; t;) {
        m(t), t = t.olderShadowRoot;
      }
    }
  }function f(e, n) {
    if (_.dom) {
      var o = n[0];if (o && "childList" === o.type && o.addedNodes && o.addedNodes) {
        for (var r = o.addedNodes[0]; r && r !== document && !r.host;) {
          r = r.parentNode;
        }var i = r && (r.URL || r._URL || r.host && r.host.localName) || "";i = i.split("/?").shift().split("/").pop();
      }console.group("mutations (%d) [%s]", n.length, i || "");
    }var a = u(e);n.forEach(function (e) {
      "childList" === e.type && (N(e.addedNodes, function (e) {
        e.localName && t(e, a);
      }), N(e.removedNodes, function (e) {
        e.localName && c(e);
      }));
    }), _.dom && console.groupEnd();
  }function p(e) {
    for (e = window.wrap(e), e || (e = window.wrap(document)); e.parentNode;) {
      e = e.parentNode;
    }var t = e.__observer;t && (f(e, t.takeRecords()), i());
  }function m(e) {
    if (!e.__observer) {
      var t = new MutationObserver(f.bind(this, e));t.observe(e, { childList: !0, subtree: !0 }), e.__observer = t;
    }
  }function v(e) {
    e = window.wrap(e), _.dom && console.group("upgradeDocument: ", e.baseURI.split("/").pop());var n = e === window.wrap(document);t(e, n), m(e), _.dom && console.groupEnd();
  }function w(e) {
    b(e, v);
  }var _ = e.flags,
      g = e.forSubtree,
      b = e.forDocumentTree,
      y = window.MutationObserver._isPolyfilled && _["throttle-attached"];e.hasPolyfillMutations = y, e.hasThrottledAttached = y;var E = !1,
      L = [],
      N = Array.prototype.forEach.call.bind(Array.prototype.forEach),
      M = Element.prototype.createShadowRoot;M && (Element.prototype.createShadowRoot = function () {
    var e = M.call(this);return window.CustomElements.watchShadow(this), e;
  }), e.watchShadow = h, e.upgradeDocumentTree = w, e.upgradeDocument = v, e.upgradeSubtree = o, e.upgradeAll = t, e.attached = a, e.takeRecords = p;
}), window.CustomElements.addModule(function (e) {
  function t(t, o) {
    if ("template" === t.localName && window.HTMLTemplateElement && HTMLTemplateElement.decorate && HTMLTemplateElement.decorate(t), !t.__upgraded__ && t.nodeType === Node.ELEMENT_NODE) {
      var r = t.getAttribute("is"),
          i = e.getRegisteredDefinition(t.localName) || e.getRegisteredDefinition(r);if (i && (r && i.tag == t.localName || !r && !i["extends"])) return n(t, i, o);
    }
  }function n(t, n, r) {
    return a.upgrade && console.group("upgrade:", t.localName), n.is && t.setAttribute("is", n.is), o(t, n), t.__upgraded__ = !0, i(t), r && e.attached(t), e.upgradeSubtree(t, r), a.upgrade && console.groupEnd(), t;
  }function o(e, t) {
    Object.__proto__ ? e.__proto__ = t.prototype : (r(e, t.prototype, t["native"]), e.__proto__ = t.prototype);
  }function r(e, t, n) {
    for (var o = {}, r = t; r !== n && r !== HTMLElement.prototype;) {
      for (var i, a = Object.getOwnPropertyNames(r), s = 0; i = a[s]; s++) {
        o[i] || (Object.defineProperty(e, i, Object.getOwnPropertyDescriptor(r, i)), o[i] = 1);
      }r = Object.getPrototypeOf(r);
    }
  }function i(e) {
    e.createdCallback && e.createdCallback();
  }var a = e.flags;e.upgrade = t, e.upgradeWithDefinition = n, e.implementPrototype = o;
}), window.CustomElements.addModule(function (e) {
  function t(t, o) {
    var c = o || {};if (!t) throw new Error("document.registerElement: first argument `name` must not be empty");if (t.indexOf("-") < 0) throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(t) + "'.");if (r(t)) throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(t) + "'. The type name is invalid.");if (d(t)) throw new Error("DuplicateDefinitionError: a type with name '" + String(t) + "' is already registered");return c.prototype || (c.prototype = Object.create(HTMLElement.prototype)), c.__name = t.toLowerCase(), c["extends"] && (c["extends"] = c["extends"].toLowerCase()), c.lifecycle = c.lifecycle || {}, c.ancestry = i(c["extends"]), a(c), s(c), n(c.prototype), l(c.__name, c), c.ctor = u(c), c.ctor.prototype = c.prototype, c.prototype.constructor = c.ctor, e.ready && v(document), c.ctor;
  }function n(e) {
    if (!e.setAttribute._polyfilled) {
      var t = e.setAttribute;e.setAttribute = function (e, n) {
        o.call(this, e, n, t);
      };var n = e.removeAttribute;e.removeAttribute = function (e) {
        o.call(this, e, null, n);
      }, e.setAttribute._polyfilled = !0;
    }
  }function o(e, t, n) {
    e = e.toLowerCase();var o = this.getAttribute(e);n.apply(this, arguments);var r = this.getAttribute(e);this.attributeChangedCallback && r !== o && this.attributeChangedCallback(e, o, r);
  }function r(e) {
    for (var t = 0; t < y.length; t++) {
      if (e === y[t]) return !0;
    }
  }function i(e) {
    var t = d(e);return t ? i(t["extends"]).concat([t]) : [];
  }function a(e) {
    for (var t, n = e["extends"], o = 0; t = e.ancestry[o]; o++) {
      n = t.is && t.tag;
    }e.tag = n || e.__name, n && (e.is = e.__name);
  }function s(e) {
    if (!Object.__proto__) {
      var t = HTMLElement.prototype;if (e.is) {
        var n = document.createElement(e.tag);t = Object.getPrototypeOf(n);
      }for (var o, r = e.prototype, i = !1; r;) {
        r == t && (i = !0), o = Object.getPrototypeOf(r), o && (r.__proto__ = o), r = o;
      }i || console.warn(e.tag + " prototype not found in prototype chain for " + e.is), e["native"] = t;
    }
  }function c(e) {
    return _(N(e.tag), e);
  }function d(e) {
    if (e) return E[e.toLowerCase()];
  }function l(e, t) {
    E[e] = t;
  }function u(e) {
    return function () {
      return c(e);
    };
  }function h(e, t, n) {
    return e === L ? f(t, n) : M(e, t);
  }function f(e, t) {
    e && (e = e.toLowerCase()), t && (t = t.toLowerCase());var n = d(t || e);if (n) {
      if (e == n.tag && t == n.is) return new n.ctor();if (!t && !n.is) return new n.ctor();
    }var o;return t ? (o = f(e), o.setAttribute("is", t), o) : (o = N(e), e.indexOf("-") >= 0 && g(o, HTMLElement), o);
  }function p(e, t) {
    var n = e[t];e[t] = function () {
      var e = n.apply(this, arguments);return w(e), e;
    };
  }var m,
      v = (e.isIE, e.upgradeDocumentTree),
      w = e.upgradeAll,
      _ = e.upgradeWithDefinition,
      g = e.implementPrototype,
      b = e.useNative,
      y = ["annotation-xml", "color-profile", "font-face", "font-face-src", "font-face-uri", "font-face-format", "font-face-name", "missing-glyph"],
      E = {},
      L = "http://www.w3.org/1999/xhtml",
      N = document.createElement.bind(document),
      M = document.createElementNS.bind(document);m = Object.__proto__ || b ? function (e, t) {
    return e instanceof t;
  } : function (e, t) {
    if (e instanceof t) return !0;for (var n = e; n;) {
      if (n === t.prototype) return !0;n = n.__proto__;
    }return !1;
  }, p(Node.prototype, "cloneNode"), p(document, "importNode"), document.registerElement = t, document.createElement = f, document.createElementNS = h, e.registry = E, e["instanceof"] = m, e.reservedTagList = y, e.getRegisteredDefinition = d, document.register = document.registerElement;
}), function (e) {
  function t() {
    i(window.wrap(document)), window.CustomElements.ready = !0;var e = window.requestAnimationFrame || function (e) {
      setTimeout(e, 16);
    };e(function () {
      setTimeout(function () {
        window.CustomElements.readyTime = Date.now(), window.HTMLImports && (window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime), document.dispatchEvent(new CustomEvent("WebComponentsReady", { bubbles: !0 }));
      });
    });
  }var n = e.useNative,
      o = e.initializeModules;e.isIE;if (n) {
    var r = function r() {};e.watchShadow = r, e.upgrade = r, e.upgradeAll = r, e.upgradeDocumentTree = r, e.upgradeSubtree = r, e.takeRecords = r, e["instanceof"] = function (e, t) {
      return e instanceof t;
    };
  } else o();var i = e.upgradeDocumentTree,
      a = e.upgradeDocument;if (window.wrap || (window.ShadowDOMPolyfill ? (window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded, window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded) : window.wrap = window.unwrap = function (e) {
    return e;
  }), window.HTMLImports && (window.HTMLImports.__importsParsingHook = function (e) {
    e["import"] && a(wrap(e["import"]));
  }), "complete" === document.readyState || e.flags.eager) t();else if ("interactive" !== document.readyState || window.attachEvent || window.HTMLImports && !window.HTMLImports.ready) {
    var s = window.HTMLImports && !window.HTMLImports.ready ? "HTMLImportsLoaded" : "DOMContentLoaded";window.addEventListener(s, t);
  } else t();
}(window.CustomElements), function (e) {
  var t = document.createElement("style");t.textContent = "body {transition: opacity ease-in 0.2s; } \nbody[unresolved] {opacity: 0; display: block; overflow: hidden; position: relative; } \n";var n = document.querySelector("head");n.insertBefore(t, n.firstChild);
}(window.WebComponents);

},{}]},{},[1])