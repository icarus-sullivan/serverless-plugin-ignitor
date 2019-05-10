const { pilot_light } = require('../pilot_light');

const PING_EVENT = {
  pilot_light: true,
};

const ORIGINAL_EVENT = {
  source: 'aws:events',
};

describe('pilot_light', () => {
  test('ping test', () => {
    const original = jest.fn();
    const callback = jest.fn();

    pilot_light(original)(PING_EVENT, null, callback);
    expect(original).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, 'pinged');
  });

  test('original', () => {
    const original = jest.fn((e, t, c) => c(null, 'success'));
    const callback = jest.fn();

    pilot_light(original)(ORIGINAL_EVENT, null, callback);
    expect(original).toHaveBeenCalledWith(ORIGINAL_EVENT, null, callback);
    expect(callback).toHaveBeenCalledWith(null, 'success');
  });
});
