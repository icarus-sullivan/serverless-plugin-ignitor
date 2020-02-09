module.exports.handler = (original) => (evt, ctx, cb) => {
  if (evt.flambe) {
    return ctx && ctx.done
      ? ctx.done()
      : cb
      ? cb(null, 'pinged')
      : process.exit(0);
  }

  return original(evt, ctx, cb);
};
