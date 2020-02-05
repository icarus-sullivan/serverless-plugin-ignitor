
module.exports = ({ service, stage }) => ({
  Type: 'AWS::Logs::LogGroup',
  Properties: {
    LogGroupName: `/aws/lambda/${service}-${stage}-flambe`,
  },
});