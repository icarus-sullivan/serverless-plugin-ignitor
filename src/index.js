

const bPromise = require('bluebird');

const { cli } = require('./utils/file');
const build = require('./utils/build');
const log = require('./utils/log');
const get = require('./utils/get');
const delegate = require('./utils/delegate');
const role = require('./utils/role');

class PluginPilotLight {
  constructor(sls, options) {
    this.sls = sls;
    this.optStage = options.stage;
    this.optRegion = options.region;
    this.originalServicePath = this.sls.config.servicePath;

    this.provider = this.sls.getProvider('aws');

    // trick sls into seeing the late-lambda creation
    this.sls.service.functions.pilotLightDelegate = {
      handler: 'pilotLight/delegate.handler',
      timeout: 30,
      events: [],
    };

    this.commands = {
      pilotLight: {
        usage: 'Keep lambda functions nice and toasty',
        lifecycleEvents: [
          'pilotLight',
        ],
        commands: {
          schedule: {
            type: 'entrypoint',
            lifecycleEvents: [
              'schedule',
            ],
          },
          wrap: {
            type: 'entrypoint',
            lifecycleEvents: [
              'wrap',
            ],
          },
          deploy: {
            type: 'entrypoint',
            lifecycleEvents: [
              'deploy',
            ],
          },
          clean: {
            type: 'entrypoint',
            lifecycleEvents: [
              'clean',
            ],
          },
        },
      },
    };

    /* istanbul ignore next */
    this.hooks = {
      'after:deploy:deploy': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:deploy'))
        .then(() => this.sls.pluginManager.spawn('pilotLight:clean')),

      'before:package:createDeploymentArtifacts': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:schedule'))
        .then(() => this.sls.pluginManager.spawn('pilotLight:wrap')),

      'after:package:createDeploymentArtifacts': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:clean')),

      'before:deploy:function:packageFunction': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:schedule'))
        .then(() => this.sls.pluginManager.spawn('pilotLight:wrap')),

      'before:invoke:local:invoke': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:wrap')),

      'after:invoke:local:invoke': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:clean')),

      'before:run:run': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:wrap')),

      'after:run:run': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('pilotLight:clean')),

      // used when debugging pilotLight via command serverless pilotLight
      'pilotLight:pilotLight': () => bPromise.bind(this)
        .then(build.prebuild)
        .then(this.schedule)
        .then(this.wrap),

      'pilotLight:schedule:schedule': () => bPromise.bind(this)
        .then(this.schedule),

      'pilotLight:wrap:wrap': () => bPromise.bind(this)
        .then(build.prebuild)
        .then(this.wrap),

      'pilotLight:deploy:deploy': () => bPromise.bind(this)
        .then(this.deploy),

      'pilotLight:clean:clean': () => bPromise.bind(this)
        .then(build.clean),
    };
  }

  schedule() {
    const options = get(this, 'sls.service.custom.pilotLight', []);
    const keys = options.length === 0
      ? new RegExp('.*', 'g')
      : new RegExp(
        options.map((k) => k.replace(/\//g, '')).join('|'),
        'g',
      );

    this.service = get(this, 'sls.service.service.name', get(this, 'sls.service.service'));
    this.stage = get(this, 'optStage', get(this, 'sls.service.provider.stage', '*'));
    this.region = get(this, 'optRegion', get(this, 'sls.service.provider.region'));
    this.scheduled = Object.keys(this.sls.service.functions)
      .filter((name) => name.match(keys));

    if (!this.sls.service.resources) {
      this.sls.service.resources = { Resources: {} };
    }

    role.attachRoleToLambda(this.sls.service.functions.pilotLightDelegate);
    role.createLambdaRole(this.sls.service.resources.Resources, {
      stage: this.stage,
      service: this.service,
    });
  }

  wrap() {
    this.mapping = {};

    const defaultEvent = {
      rate: 'rate(5 minutes)',
      wrapper: 'pilotLight.pilotLight',
      input: {
        pilotLight: true,
      },
    };
    const { functions } = this.sls.service;
    this.scheduled.forEach((name) => {
      const config = {
        ...defaultEvent,
        ...functions[name].pilotLight,
      };
      const { rate, wrapper, input } = config;
      if (!this.mapping[rate]) {
        this.mapping[rate] = [];
      }

      this.mapping[rate].push({
        lambda: functions[name].name,
        input,
      });

      const { handler } = functions[name];
      functions[name].handler = build.wrap(name, handler, wrapper, false);
      log(`Wrapped ${handler}`, JSON.stringify(functions[name], null, 2));
    });

    // create delegate, and inject configured mapping into the code
    const delegateCode = delegate.create(this.mapping);
    build.writeToBuildDir('delegate.js', delegateCode);

    // create events for the delegate method, that will then call other lambdas
    functions.pilotLightDelegate.events = delegate.events(this.mapping);
  }

  deploy() {
    const rates = Object.keys(this.mapping);

    cli(`export AWS_DEFAULT_REGION=${this.region}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    log('Igniting sources');
    for (const rate of rates) {
      const event = { rate };
      const cmd = [
        'aws lambda invoke',
        `--function-name '${this.service}-${this.stage}-pilotLightDelegate'`,
        '--invocation-type Event',
        `--payload '${JSON.stringify(event)}'`,
        '.output',
      ];
      cli(cmd.join(' '), {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
    }
  }
}

module.exports = PluginPilotLight;
