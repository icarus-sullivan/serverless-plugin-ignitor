const path = require('path');
const {
  mkdir, rm, write, read,
} = require('./file');

// !!WARNING!! Do not include a '.' in the directory name this confuses
// sls during local invokes and compilers with a MODULE_NOT_FOUND error
const BUILD_DIR = 'flambe';

const DEFAULT_WRAPPER = 'flambe.flambe';

const writeToBuildDir = (name, contents) => write(
  path.resolve(BUILD_DIR, name),
  contents,
);

const cloneToBuildDir = (filename) => writeToBuildDir(
  filename,
  read(path.resolve(__dirname, filename)),
);

const prebuild = () => {
  mkdir(BUILD_DIR);
  
  // prebuild default wrapper into the build directory
  cloneToBuildDir('flambe.js');
};

const wrap = (name, handler, wrapper = DEFAULT_WRAPPER) => {
  const [wrapperPath, wrapperFunctionName] = wrapper.split('.');
  const [inputPath, functionName] = handler.split('.');

  const overridePath = `${BUILD_DIR}/${name}.handler`;
  const overrideFilename = `${name}.js`;

  const requireOriginal = `const original = require('../${inputPath}').${functionName};`;
  const requireWrapperPrefix = wrapper === DEFAULT_WRAPPER ? '.' : '..';
  const requireWrapper = `const wrapper = require('${requireWrapperPrefix}/${wrapperPath}').${wrapperFunctionName};`;
  const exportModule = 'module.exports = { handler: wrapper(original) };';

  writeToBuildDir(overrideFilename, `${requireOriginal}\n${requireWrapper}\n\n${exportModule}`);
  return overridePath;
};

const clean = () => rm(BUILD_DIR);

module.exports = {
  prebuild,
  wrap,
  writeToBuildDir,
  clean,
};
