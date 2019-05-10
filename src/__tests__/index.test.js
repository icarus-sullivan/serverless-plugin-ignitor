const build = require('../utils/build');
const PluginPilotLight = require('../index');

const DEFAULT_CUSTOM = {
  pilot_light: [
    'hello',
    '/good.*/',
  ],
};

const gensls = (custom = DEFAULT_CUSTOM) => ({
  getProvider: jest.fn(),
  config: {
    servicePath: 'test',
  },
  service: {
    service: 'example',
    functions: {
      hello: {
        handler: 'handlers.hello',
        timeout: 15,
        pilot_light: {
          rate: 'rate(3 minutes)',
        },
        name: 'example-beta-hello',
      },
      goodday: {
        handler: 'handlers.goodday',
        pilot_light: {
          rate: 'rate(3 minutes)',
        },
        name: 'example-beta-goodday',
      },
      goodbye: {
        handler: 'handlers.goodbye',
        pilot_light: {
          wrapper: 'customWrapper.default',
          input: {
            custom: 'property',
          },
        },
        name: 'example-beta-goodbye',
      },
    },
    resources: {
      Resources: {},
    },
    custom,
  },
  pluginManager: {
    spawn: jest.fn(),
  },
  cli: {
    log: jest.fn(),
  },
});


beforeEach(() => {
  build.prebuild();
});

afterEach(() => {
  build.clean();
});


test('schedule', () => {
  const sls = gensls();
  const plugin = new PluginPilotLight(sls, {
    stage: 'beta',
  });

  // perform scheduling
  plugin.schedule();
  expect(plugin.service).toEqual('example');
  expect(plugin.stage).toEqual('beta');
  expect(plugin.scheduled).toEqual(['hello', 'goodday', 'goodbye']);
});

test('schedule - no resources', () => {
  const sls = gensls();
  delete sls.service.resources;
  const plugin = new PluginPilotLight(sls, {
    stage: 'beta',
  });

  // perform scheduling
  plugin.schedule();
  expect(plugin.service).toEqual('example');
  expect(plugin.stage).toEqual('beta');
  expect(plugin.scheduled).toEqual(['hello', 'goodday', 'goodbye']);
});

test('schedule - no pilot_light option', () => {
  const sls = gensls({});
  const plugin = new PluginPilotLight(sls, {
    stage: 'beta',
  });

  // perform scheduling
  plugin.schedule();
  expect(plugin.service).toEqual('example');
  expect(plugin.stage).toEqual('beta');
  expect(plugin.scheduled).toEqual(['hello', 'goodday', 'goodbye', 'pilotLightDelegate']);
});

test('wrap', () => {
  const sls = gensls();
  const plugin = new PluginPilotLight(sls, {
    stage: 'beta',
  });

  // perform scheduling
  plugin.schedule();
  plugin.wrap();
  expect(plugin.mapping).toEqual({
    'rate(3 minutes)': [{
      input: { pilot_light: true },
      lambda: 'example-beta-hello',
    }, {
      input: { pilot_light: true },
      lambda: 'example-beta-goodday',
    }],
    'rate(5 minutes)': [{
      input: { custom: 'property' },
      lambda: 'example-beta-goodbye',
    }],
  });
});

test('deploy', () => {
  expect.assertions(1);
  const sls = gensls();
  const plugin = new PluginPilotLight(sls, {
    stage: 'beta',
  });

  plugin.schedule();
  plugin.wrap();
  try {
    // cli call will fail because the function doesn't exist
    // not a problem, we just want to see that the invoke functions are being called
    plugin.deploy();
  } catch (e) {
    expect(e.message).toEqual("Command failed: aws lambda invoke --function-name 'example-beta-pilotLightDelegate' --invocation-type Event --payload '{\"rate\":\"rate(3 minutes)\"}' .output");
  }
});
