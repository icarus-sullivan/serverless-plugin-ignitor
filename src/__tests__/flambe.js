const { flambe } = require('../flambe');

const PING_EVENT = {
  flambe: true,
};

const ORIGINAL_EVENT = {
  source: 'aws:events',
};

describe('flambe', () => {
  test('ping test', () => {
    const original = jest.fn();
    const callback = jest.fn();

    flambe(original)(PING_EVENT, null, callback);
    expect(original).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, 'pinged');
  });

  test('original', () => {
    const original = jest.fn((e, t, c) => c(null, 'success'));
    const callback = jest.fn();

    flambe(original)(ORIGINAL_EVENT, null, callback);
    expect(original).toHaveBeenCalledWith(ORIGINAL_EVENT, null, callback);
    expect(callback).toHaveBeenCalledWith(null, 'success');
  });
});
