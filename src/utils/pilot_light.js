
const pilot_light = (original) => (evt, ctx, cb) => {
  if (evt.pilot_light) {
    return cb(null, 'pinged');
  }

  return original(evt, ctx, cb);
};

module.exports = { pilot_light };
