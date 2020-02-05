

const bPromise = require('bluebird');

const { cli, rm } = require('./file');
const build = require('./build');
const log = require('./log');
const get = require('./get');
const delegate = require('./delegate');

class PluginFlambe {
  constructor(sls, options) {
    this.sls = sls;
    this.optStage = options.stage;
    this.optRegion = options.region;
    this.originalServicePath = this.sls.config.servicePath;

    this.provider = this.sls.getProvider('aws');

    // inject delegate code here or sls won't see it
    delegate.lambda(this.sls.service.functions);

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
        .then(() => this.sls.pluginManager.spawn('flambe:schedule'))
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

    // if resources is not created yet, we need to create it in order to
    // attach our delgate role + log groups
    if (!this.sls.service.resources || !this.sls.service.resources.Resources) {
      this.sls.service.resources = { Resources: {} };
    }

    delegate.lambdaRole(this.sls.service.resources.Resources, this);
  }

  wrap() {
    this.rates = {};

    const defaultEvent = {
      rate: 'rate(5 minutes)',
      wrapper: 'flambeWrapper.handler',
      input: {
        flambe: true,
      },
    };
    const { functions } = this.sls.service;
    const schedules = this.scheduled || [];
    schedules.forEach((name) => {
      const config = {
        ...defaultEvent,
        ...functions[name].flambe,
      };
      const { rate, wrapper, input } = config;
      if (!this.rates[rate]) {
        this.rates[rate] = [];
      }

      this.rates[rate].push({
        lambda: functions[name].name,
        input,
      });

      const { handler } = functions[name];
      functions[name].handler = build.wrap(name, handler, wrapper, false);
      log(`Wrapped ${handler}`, functions[name].name);
    });

    delegate.lambdaCode(this.sls.service.functions, this.rates);
  }

  deploy() {
    const rates = Object.keys(this.rates);

    cli(`export AWS_DEFAULT_REGION=${this.region}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    log('Igniting sources');
    for (const rate of rates) {
      delegate.lambdaInvoke({ rate, service: this.service, stage: this.stage });
    }

    rm('.output');
    rm('flambe');
  }
}

module.exports = PluginFlambe;
