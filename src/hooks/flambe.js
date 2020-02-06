const fse = require('fs-extra');
const log = require('../utils/log');
const { resolve } = require('path');
const _ = require('../utils/lodash');
const { 
  BUILD_DIR,
  SRC_DIR,
  WRAPPER_FILENAME,
  FUNCTIONS_PATH,
  DELEGATE_FILENAME,
  DEFAULT_EVENT,
  DELEGATE_LOG_GROUP_PATH,
  DELEGATE_ROLE_NAME_PATH,
} = require('../flambe.config');

const def = require('../delegate/definition');
const role = require('../delegate/role');
const logGroup = require('../delegate/log-group');
const code = require('../delegate/code');
const wrap = require('../delegate/wrap');

module.exports = async (ctx) => {
  // build directory
  await fse.ensureDir(BUILD_DIR);
  await fse.copy(resolve(SRC_DIR, WRAPPER_FILENAME), resolve(BUILD_DIR, WRAPPER_FILENAME));

  const options = _.get(ctx, 'serverless.service.custom.flambe.regex', ['.*']);
  const memorySize = _.get(ctx, 'serverless.service.custom.flambe.memorySize', 128);
  const regex = new RegExp(
    options.map((k) => k.replace(/\//g, '')).join('|'),
    'g',
  );

  // set flambe variable
  const flambe = {
    regex,
    memorySize,
    stage: _.oneOf(ctx, ['options.stage', 'serverless.service.provider.stage'], '*'),
    region: _.oneOf(ctx, ['options.region', 'serverless.service.provider.region']),
    service: _.oneOf(ctx, ['serverless.service.service.name', 'serverless.service.service']),
    iamRoleStatements: _.get(ctx, 'serverless.service.provider.iamRoleStatements'),
  };


  const functions = _.get(ctx, FUNCTIONS_PATH, {})
  const scheduled = Object.keys(functions).filter((name) => name.match(regex));

  const rates = scheduled.reduce((a, b) => {
    const { name, handler, flambe } = functions[b];
    const config = {
      ...DEFAULT_EVENT,
      ...flambe,
    };

    const { rate, wrapper, input } = config;

    a[rate] = (a[rate] || []).concat([{
      lambda: name,
      input,
    }]);

    const override = wrap(name, wrapper, handler);
    ctx = _.set(ctx, [FUNCTIONS_PATH, b, 'handler'].join('.'), override);

    log(JSON.stringify(functions[b], null, 2));
    return a;
  }, {});

  const flambeContext = { ...ctx, ...flambe, rates };
  const d = def(flambeContext);
  const r = role(flambeContext);
  const lg = logGroup(flambeContext);

  ctx = _.set(ctx, FUNCTIONS_PATH, d);
  ctx = _.set(ctx, DELEGATE_ROLE_NAME_PATH, r);
  ctx = _.set(ctx, DELEGATE_LOG_GROUP_PATH, lg);
  ctx = _.set(ctx, 'rates', rates);

  // write flambe delegate 
  fse.writeFileSync(resolve(BUILD_DIR, DELEGATE_FILENAME), code({ rates: JSON.stringify(rates, null, 2) }))
}