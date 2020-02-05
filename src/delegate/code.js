const slim = require('@sullivan/slim');

module.exports = slim(`const AWS = require('aws-sdk');

const map = {{rates}};

const L = new AWS.Lambda({ apiVersion: '2015-03-31' });

const invoke = ({ lambda, input }) => L.invoke({
  FunctionName: lambda,
  InvocationType: 'Event',
  Payload: JSON.stringify(input),
}).promise();

module.exports.handler = (evt, ctx, callback) => {
  if (!evt.rate) {
    throw new Error('No rate found to delegate');
  }
  const listeners = (map[evt.rate] || []);
  // using then convention in case this is used in node6
  Promise.all(listeners.map(invoke)).then((res) => {
    callback(null, { success: true });
  })
  .catch((err) => {
    callback(err.message);
  });
};`);