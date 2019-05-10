const { create, events } = require('../delegate');

const rates = {
  'rate(3 minutes)': [
    {
      lambda: 'Example-dev-hello',
      input: {
        pilot_light: true,
      },
    },
  ],
};

test('creates delegate', () => {
  expect(create(rates)).toMatchSnapshot();
});


test('create schedules', () => {
  expect(events(rates)).toMatchSnapshot();
});
