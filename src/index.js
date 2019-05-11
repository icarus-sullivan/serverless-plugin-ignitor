

const bPromise = require('bluebird');

const { cli } = require('./file');
const build = require('./build');
const log = require('./log');
const get = require('./get');
const delegate = require('./delegate');
const role = require('./role');

class PluginFlambe {
  constructor(sls, options) {
    this.sls = sls;
    this.optStage = options.stage;
    this.optRegion = options.region;
    this.originalServicePath = this.sls.config.servicePath;

    this.provider = this.sls.getProvider('aws');

    // trick sls into seeing the late-lambda creation
    this.sls.service.functions.flambeDelegate = {
      handler: 'flambe/delegate.handler',
      timeout: 30,
      events: [],
    };

    this.commands = {
      flambe: {
        usage: 'Eliminates lambda cold starts',
        lifecycleEvents: [
          'flambe',
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
        .then(() => this.sls.pluginManager.spawn('flambe:deploy'))
        .then(() => this.sls.pluginManager.spawn('flambe:clean')),

      'before:package:createDeploymentArtifacts': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:schedule'))
        .then(() => this.sls.pluginManager.spawn('flambe:wrap')),

      'after:package:createDeploymentArtifacts': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:clean')),

      'before:deploy:function:packageFunction': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:schedule'))
        .then(() => this.sls.pluginManager.spawn('flambe:wrap')),

      'before:invoke:local:invoke': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:wrap')),

      'after:invoke:local:invoke': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:clean')),

      'before:run:run': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:wrap')),

      'after:run:run': () => bPromise.bind(this)
        .then(() => this.sls.pluginManager.spawn('flambe:clean')),

      // used when debugging flambe via command serverless flambe
      'flambe:flambe': () => bPromise.bind(this)
        .then(build.prebuild)
        .then(this.schedule)
        .then(this.wrap),

      'flambe:schedule:schedule': () => bPromise.bind(this)
        .then(this.schedule),

      'flambe:wrap:wrap': () => bPromise.bind(this)
        .then(build.prebuild)
        .then(this.wrap),

      'flambe:deploy:deploy': () => bPromise.bind(this)
        .then(this.deploy),

      'flambe:clean:clean': () => bPromise.bind(this)
        .then(build.clean),
    };
  }

  schedule() {
    const options = get(this, 'sls.service.custom.flambe', []);
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

    role.attachRoleToLambda(this.sls.service.functions.flambeDelegate);
    role.createLambdaRole(this.sls.service.resources.Resources, {
      stage: this.stage,
      service: this.service,
    });
  }

  wrap() {
    this.mapping = {};

    const defaultEvent = {
      rate: 'rate(5 minutes)',
      wrapper: 'flambe.flambe',
      input: {
        flambe: true,
      },
    };
    const { functions } = this.sls.service;
    this.scheduled.forEach((name) => {
      const config = {
        ...defaultEvent,
        ...functions[name].flambe,
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
    functions.flambeDelegate.events = delegate.events(this.mapping);
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
        `--function-name '${this.service}-${this.stage}-flambeDelegate'`,
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

module.exports = PluginFlambe;
