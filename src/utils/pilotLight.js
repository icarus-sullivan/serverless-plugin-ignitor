
const pilotLight = (original) => (evt, ctx, cb) => {
  if (evt.pilotLight) {
    return cb(null, 'pinged');
  }

  return original(evt, ctx, cb);
};

module.exports = { pilotLight };
