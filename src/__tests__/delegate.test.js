const { create, events } = require('../delegate');

const rates = {
  'rate(3 minutes)': [
    {
      lambda: 'Example-dev-hello',
      input: {
        flambe: true,
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
