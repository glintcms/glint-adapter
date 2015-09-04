/**
 * Module dependencies.
 */
var debug = require('debug')('glint:Adapter');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var slice = require('sliced');

/**
 * Expose Adapter element.
 */
exports = module.exports = Adapter;
inherits(Adapter, EventEmitter);

/**
 * Initialize a new `Adapter` element.
 */
function Adapter(adapter) {
  if (!(this instanceof Adapter)) return new Adapter(adapter);
  if (adapter) this.delegate(adapter);
}

/**
 * API functions.
 */
Adapter.prototype.api = Adapter.api = 'adapter';

/**
 * Forward function calls to this Implementation
 */
Adapter.prototype.delegate = function (adapter) {
  if (!adapter) return this.adapter;
  this.adapter = adapter;
  this.plugins = this.plugins || [];
  return this;
};

Adapter.prototype.undelegate = function () {
  this.adapter = undefined;
  return this;
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 * @returns {Object} instance
 * @api public
 */
Adapter.prototype.use = function (plugin) {
  if (plugin.name) {
    this.plugins.push(plugin.name);
  } else {
    debug('loaded plugin without name ;-(');
  }
  plugin(this);
  return this;
};

/**
 * Mixin the given `mixins` functions.
 * @param {Object} mixins e.g.
 *
 * { findByTitle : function(title, fn) {
 *    return this.find({title:title}, fn);
 *   }
 * }
 *
 * @returns {Adapter}
 */
Adapter.prototype.mixin = function (mixins) {
  var self = this;
  Object.keys(mixins).forEach(function (key) {
    self[key] = mixins[key];
  });
  return this;
};

['fn', 'db', 'type'].forEach(function (attribute) {
  Adapter.prototype[attribute] = function (value) {
    this.emit(attribute, value);
    if (value) {
      this['_' + attribute] = value;
      debug(attribute, 'set', value);
      return this;
    }
    debug(attribute, 'get', this['_' + attribute]);
    return this['_' + attribute];
  };
});

['find', 'load', 'save', 'delete'].forEach(function (fn) {
  Adapter.prototype[fn] = function () {
    var args = slice(arguments);
    args.unshift(this._type);
    args.unshift(this._db);

    this.emit.apply(this, ['pre-' + fn].concat(args));
    var result = this.adapter[fn].apply(this.adapter, args);
    this.emit.apply(this, ['post-' + fn].concat(args));

    debug(fn, 'arguments', args, 'result', result);

    return result;
  };
});
