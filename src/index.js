const P = require('bluebird');
const flambe = require('./hooks/flambe');
const clean = require('./hooks/clean');
const deploy = require('./hooks/deploy');

module.exports = class PluginFlambe {
  constructor(serverless) {
    this.serverless = serverless;
    this.originalServicePath = this.serverless.config.servicePath;

    this.provider = this.serverless.getProvider('aws');
    this.commands = {
      flambe: {
        usage: 'Eliminates lambda cold starts',
        lifecycleEvents: [
          'flambe',
        ],
      }
    };

    const plugin = this;
    const bind = (fn) => async () => P.bind(plugin).then(fn.bind(plugin, plugin));
    const boundFlambe = bind(flambe);
    const boundDeploy = bind(deploy);
    const boundClean = bind(clean);

    this.hooks = {
      // processing 
      'flambe:flambe': boundFlambe,
      'before:package:createDeploymentArtifacts': boundFlambe,
      'before:deploy:function:packageFunction': boundFlambe,
      'before:invoke:local:invoke': boundFlambe,
      'before:run:run': boundFlambe,

      // deploy
      'after:deploy:deploy': boundDeploy,

      // clean up
      'after:package:createDeploymentArtifacts': boundClean,
      'after:invoke:local:invoke': boundClean,
      'after:run:run': boundClean,
    };
  }

};