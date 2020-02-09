const get = require('lodash.get');
const set = require('lodash.set');

module.exports = {
  oneOf: (ctx, paths, defaultValue) => {
    for (const p of paths) {
      const value = get(ctx, p);
      if (value) {
        return value;
      }
    }
    return defaultValue;
  },
  get,
  set,
};
