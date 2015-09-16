/**
 * Module dependencies.
 */
var debug = require('debug')('glint-adapter');
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

Adapter.prototype.provider = Adapter.provider = 'adapter';

/**
 * Forward function calls to this Implementation
 */
Adapter.prototype.delegate = function(adapter) {
  if (!adapter) return this.adapter;
  this.adapter = adapter;
  this.plugins = this.plugins || [];
  return this;
};

Adapter.prototype.undelegate = function() {
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
Adapter.prototype.use = function(plugin) {
  if (plugin.name) {
    this.plugins.push(plugin.name);
  } else {
    debug('loaded plugin without name ;-(');
  }
  plugin(this);
  return this;
};

/**
 * Mixin the given `mixins` functions. for the given `provider` like e.g. `fs`.
 * @param {Object} nested mixin functions inside provider property e.g.
 *
 fs: {
    all: function(locale, fn) {
      var query = 'this.id.indexOf("__template__") === -1 && this.locale === "' + locale + '"';
      this.find({$where: query}, function(err, result) {
        result = result || [];
        var filtered = Query.find(result, {}).all();
        return fn(err, {projectsAll: filtered});
      });
    }
  }
 *
 * @returns {Adapter}
 */
Adapter.prototype.mixin = function(mixins) {
  var self = this;
  this._mixins = this._mixins || {};

  if (!mixins) return this._mixins;

  if (!this.adapter || !this.adapter.provider) throw new TypeError('no adapter provider');

  var providers = Object.keys(mixins);
  var adapterProvider = this.adapter.provider;
  var index = providers.indexOf(adapterProvider);
  if (index < 0) throw new TypeError('mixin does not contain any definition for the provider: ' + adapterProvider);

  var mixinProvider = mixins[adapterProvider];
  Object.keys(mixinProvider).forEach(function(key) {
    if (typeof self[key] === 'undefined') {
      self[key] = self._mixins[key] = mixinProvider[key].bind(self);
    } else {
      debug('mixin exists already:', key, 'for provider:', adapterProvider);
    }
  });
  return this;
};

['fn', 'db', 'type'].forEach(function(attribute) {
  Adapter.prototype[attribute] = function(value) {
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

['find', 'load', 'save', 'delete'].forEach(function(fn) {
  Adapter.prototype[fn] = function() {
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
