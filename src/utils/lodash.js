const _get = require('lodash.get');
const _set = require('lodash.set');

module.exports = {
  get: _get,
  set: _set,
  oneOf: (ctx, paths, defaultValue) => {
    for (const p of paths) {
      const value = _get(ctx, p);
      if (value) {
        return value;
      }
    }
    return defaultValue;
  }
}