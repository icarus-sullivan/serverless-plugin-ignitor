const { resolve, parse, join } = require('path');
const slim = require('@sullivan/slim');
const fse = require('fs-extra');
const {
  BUILD_DIR,
  WRAPPER_HANDLER,
  WRAPPER_RESOLUTION,
} = require('../flambe.config');

const template = slim(`
const original = require('../{{orgPath}}').{{orgHandler}};
const wrapper = require('./{{wrapPath}}').{{wrapHandler}};

module.exports = { handler: wrapper(original) };
`);

const resolvePath = (file) => {
  if (file === WRAPPER_HANDLER) return WRAPPER_RESOLUTION;

  const { dir, name, ext } = parse(file);
  const base = join(dir, name);
  return {
    base,
    export: ext.slice(1),
    js: `${base}.js`,
  };
};

module.exports = (name, wrapper, handler) => {
  const wrap = resolvePath(wrapper);
  if (wrap.js) {
    fse.copySync(wrap.js, resolve(BUILD_DIR, wrap.js));
  }

  const org = resolvePath(handler);

  const override = resolve(BUILD_DIR, `${name}.js`);
  fse.writeFileSync(
    override,
    template({
      orgPath: org.base,
      orgHandler: org.export,
      wrapPath: wrap.base,
      wrapHandler: wrap.export,
    }),
  );

  return `flambe/${name}.handler`;
};
