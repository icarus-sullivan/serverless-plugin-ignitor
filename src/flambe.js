
const flambe = (original) => (evt, ctx, cb) => {
  if (evt.flambe) {
    return cb(null, 'pinged');
  }

  return original(evt, ctx, cb);
};

module.exports = { flambe };
