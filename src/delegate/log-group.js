module.exports = ({ service, stage, logRetentionInDays }) => ({
  Type: 'AWS::Logs::LogGroup',
  Properties: {
    LogGroupName: `/aws/lambda/${service}-${stage}-flambe`,
    ...(logRetentionInDays
      ? { RetentionInDays: logRetentionInDays }
      : undefined),
  },
});
