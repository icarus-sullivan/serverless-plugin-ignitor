const { resolve } = require('path');

module.exports = {
  // !!WARNING!! Do not include a '.' in the directory name this confuses
  // sls during local invokes and compilers with a MODULE_NOT_FOUND error
  SRC_DIR: __dirname,
  BUILD_DIR: resolve(process.cwd(), 'flambe'),
  WRAPPER_FILENAME: 'flambe-default-wrapper.js',
  WRAPPER_HANDLER: 'flambe-default-wrapper.handler',
  WRAPPER_RESOLUTION: {
    base: 'flambe-default-wrapper',
    export: 'handler',
  },
  DELEGATE_NAME: 'flambe',
  DELEGATE_FILENAME: 'delegate.js',
  DELEGATE_EVENTS_PATH: 'serverless.service.functions.flambe.events',
  DELEGATE_LAMBDA_NAME: 'serverless.service.functions.flambe.name',
  DELEGATE_DEFINITION: {
    handler: 'flambe/delegate.handler',
    timeout: 30,
    memorySize: 128,
    events: [],
    role: {
      'Fn::GetAtt': ['FlambeLambdaFunctionRole', 'Arn'],
    },
  },
  DEFAULT_EVENT: {
    rate: 'rate(5 minutes)',
    wrapper: 'flambe-default-wrapper.handler',
    input: {
      flambe: true,
    },
  },
  DELEGATE_LOG_GROUP_PATH:
    'serverless.service.resources.Resources.FlambeLogGroup',
  DELEGATE_ROLE_NAME_PATH:
    'serverless.service.resources.Resources.FlambeLambdaFunctionRole',

  // serverless
  FUNCTIONS_PATH: 'serverless.service.functions',
  RESOURCES_PATH: 'serverless.service.resources.Resources',
  IAM_ROLES_PATH: 'serverless.service.provider.iamRoleStatements',
  LOG_RETENTION_PATH: 'serverless.service.provider.logRetentionInDays',

  STAGE_PATHS: ['options.stage', 'serverless.service.provider.stage'],
  REGION_PATHS: ['options.region', 'serverless.service.provider.region'],
  SERVICE_PATHS: [
    'serverless.service.service.name',
    'serverless.service.service',
    'serverless.service.serviceObject.name',
  ],
};
