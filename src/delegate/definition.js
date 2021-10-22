const _ = require('../utils/lodash');
const {
  FUNCTIONS_PATH,
  DELEGATE_DEFINITION,
  DELEGATE_NAME,
} = require('../flambe.config');

module.exports = (ctx) => {
  const functions = _.get(ctx, FUNCTIONS_PATH, {});
  const { rates, service, stage } = ctx;
  const definition = {
    name: [service, stage, DELEGATE_NAME].join('-'),
    ...DELEGATE_DEFINITION,
    memorySize: ctx.memorySize,
    events: Object.keys(rates).map((rate) => ({
      schedule: {
        rate: [rate],
        enabled: true,
        input: {
          rate,
        },
      },
    })),
  };

  if (Array.isArray(functions)) {
    return [
      ...functions,
      {
        [DELEGATE_NAME]: definition,
      },
    ];
  }
  return {
    ...functions,
    [DELEGATE_NAME]: definition,
  };
};
