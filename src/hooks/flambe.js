const fse = require('fs-extra');
const { resolve } = require('path');
const log = require('../utils/log');
const { set, get, oneOf } = require('../utils/lodash');
const {
  BUILD_DIR,
  SRC_DIR,
  WRAPPER_FILENAME,
  FUNCTIONS_PATH,
  DELEGATE_FILENAME,
  DEFAULT_EVENT,
  DELEGATE_LOG_GROUP_PATH,
  DELEGATE_ROLE_NAME_PATH,
  STAGE_PATHS,
  REGION_PATHS,
  SERVICE_PATHS,
  IAM_ROLES_PATH,
  LOG_RETENTION_PATH,
} = require('../flambe.config');

const def = require('../delegate/definition');
const role = require('../delegate/role');
const logGroup = require('../delegate/log-group');
const code = require('../delegate/code');
const wrap = require('../delegate/wrap');

module.exports = async (ctx) => {
  // build directory
  await fse.ensureDir(BUILD_DIR);
  await fse.copy(
    resolve(SRC_DIR, WRAPPER_FILENAME),
    resolve(BUILD_DIR, WRAPPER_FILENAME),
  );

  const options = get(ctx, 'serverless.service.custom.flambe.regex', ['.*']);
  const memorySize = get(
    ctx,
    'serverless.service.custom.flambe.memorySize',
    128,
  );
  const regex = new RegExp(
    options.map((k) => k.replace(/\//g, '')).join('|'),
    'g',
  );

  // set flambe variable
  const flambeOptions = {
    regex,
    memorySize,
    stage: oneOf(ctx, STAGE_PATHS, '*'),
    region: oneOf(ctx, REGION_PATHS),
    service: oneOf(ctx, SERVICE_PATHS),
    iamRoleStatements: get(ctx, IAM_ROLES_PATH),
    logRetentionInDays: get(ctx, LOG_RETENTION_PATH),
  };

  const functions = get(ctx, FUNCTIONS_PATH, {});
  const scheduled = Object.keys(functions).filter((name) => name.match(regex));

  const rates = scheduled.reduce((a, b) => {
    const { name, handler, flambe } = functions[b];
    const config = {
      ...DEFAULT_EVENT,
      ...flambe,
    };

    const { rate, wrapper, input } = config;

    a[rate] = (a[rate] || []).concat([
      {
        lambda: name,
        input,
      },
    ]);

    const override = wrap(name, wrapper, handler);
    ctx = set(ctx, [FUNCTIONS_PATH, b, 'handler'].join('.'), override);

    log(JSON.stringify(functions[b], null, 2));
    return a;
  }, {});

  const flambeContext = { ...ctx, ...flambeOptions, rates };
  const d = def(flambeContext);
  const r = role(flambeContext);
  const lg = logGroup(flambeContext);

  ctx = set(ctx, FUNCTIONS_PATH, d);
  ctx = set(ctx, DELEGATE_ROLE_NAME_PATH, r);
  ctx = set(ctx, DELEGATE_LOG_GROUP_PATH, lg);
  ctx = set(ctx, 'rates', rates);

  // write flambe delegate
  fse.writeFileSync(
    resolve(BUILD_DIR, DELEGATE_FILENAME),
    code({ rates: JSON.stringify(rates, null, 2) }),
  );
};
