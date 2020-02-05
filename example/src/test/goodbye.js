const sibling = require('./sibling');

module.exports.handler = (event, context, callback) => {
  console.log('goodbye!');
  sibling();
  callback(null, 'success');
};