
module.exports.hello = (event, context, callback) => {
  console.log('hello!');
  callback(null, 'success');
};

