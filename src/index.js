const P = require('bluebird');
const flambe = require('./hooks/flambe');
const clean = require('./hooks/clean');
const deploy = require('./hooks/deploy');

module.exports = class PluginFlambe {
  constructor(serverless, options) {
    this.options = options;
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

    const boundFlambe = () => P.bind(this).then(flambe.bind(this, this));
    const boundDeploy = () => P.bind(this).then(deploy.bind(this, this));
    const boundClean = () => P.bind(this).then(clean.bind(this, this));

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