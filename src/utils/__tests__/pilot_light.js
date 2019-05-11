const { pilotLight } = require('../pilotLight');

const PING_EVENT = {
  pilotLight: true,
};

const ORIGINAL_EVENT = {
  source: 'aws:events',
};

describe('pilotLight', () => {
  test('ping test', () => {
    const original = jest.fn();
    const callback = jest.fn();

    pilotLight(original)(PING_EVENT, null, callback);
    expect(original).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, 'pinged');
  });

  test('original', () => {
    const original = jest.fn((e, t, c) => c(null, 'success'));
    const callback = jest.fn();

    pilotLight(original)(ORIGINAL_EVENT, null, callback);
    expect(original).toHaveBeenCalledWith(ORIGINAL_EVENT, null, callback);
    expect(callback).toHaveBeenCalledWith(null, 'success');
  });
});
