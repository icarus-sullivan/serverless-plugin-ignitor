module.exports = ({ service, stage, iamRoleStatements }) => ({
  Type: 'AWS::IAM::Role',
  Properties: {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: ['lambda.amazonaws.com'],
          },
          Action: 'sts:AssumeRole',
        },
      ],
    },
    Policies: [
      {
        PolicyName: 'logging',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['logs:CreateLogStream'],
              Resource: [
                {
                  'Fn::Join': [
                    ':',
                    [
                      'arn:aws:logs',
                      {
                        Ref: 'AWS::Region',
                      },
                      {
                        Ref: 'AWS::AccountId',
                      },
                      `log-group:/aws/lambda/${service}-${stage}-flambe:*`,
                    ],
                  ],
                },
              ],
            },
            {
              Effect: 'Allow',
              Action: ['logs:PutLogEvents'],
              Resource: [
                {
                  'Fn::Join': [
                    ':',
                    [
                      'arn:aws:logs',
                      {
                        Ref: 'AWS::Region',
                      },
                      {
                        Ref: 'AWS::AccountId',
                      },
                      `log-group:/aws/lambda/${service}-${stage}-flambe:*:*`,
                    ],
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        PolicyName: 'custom',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['lambda:InvokeFunction'],
              Resource: [
                {
                  'Fn::Join': [
                    ':',
                    [
                      'arn:aws:lambda',
                      {
                        Ref: 'AWS::Region',
                      },
                      {
                        Ref: 'AWS::AccountId',
                      },
                      `function:${service}-${stage}-*`,
                    ],
                  ],
                },
              ],
            },
          ],
        },
      },
      ...(Array.isArray(iamRoleStatements)
        ? [
            {
              PolicyName: 'shared',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [...iamRoleStatements],
              },
            },
          ]
        : []),
    ],
  },
});
