
module.exports.handler = (original) => (evt, ctx, cb) => {
  if (evt.flambe) {
    return cb(null, 'pinged');
  }

  return original(evt, ctx, cb);
};
