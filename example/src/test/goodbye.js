
module.exports.handler = (event, context, callback) => {
  console.log('goodbye!');
  callback(null, 'success');
};