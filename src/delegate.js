const hbs = require('handlebars');
const { load } = require('./template');
const { cli } = require('./file');
const { writeToBuildDir } = require('./build');

// load handlebars template
const delegate = load('delegate');

const DELEGATE_LOG_GROUP = 'FlambeLogGroup';
const DELEGATE_ROLE_NAME = 'FlambeLambdaFunctionRole';

const lambda = (functions) => functions.flambe = {
  handler: 'flambe/delegate.handler',
  timeout: 30,
  events: [],
  role: {
    'Fn::GetAtt': [
      DELEGATE_ROLE_NAME,
      'Arn',
    ],
  },
};

const lambdaCode = (functions, rates) => {
  writeToBuildDir('delegate.js', hbs.compile(delegate)({
    rates: JSON.stringify(rates, null, 2),
  }));
  functions.flambe.events = Object.keys(rates).map((rate) => ({
    schedule: {
      rate,
      enabled: true,
      input: {
        rate,
      },
    },
  }));
};


const lambdaRole = (resources, { stage, service }) => {
  resources[DELEGATE_LOG_GROUP] = {
    Type: 'AWS::Logs::LogGroup',
    Properties: {
      LogGroupName: `/aws/lambda/${service}-${stage}-flambe`,
    },
  };
  // eslint-disable-next-line no-param-reassign
  resources[DELEGATE_ROLE_NAME] = {
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: [
                'lambda.amazonaws.com',
              ],
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
                Action: [
                  'logs:CreateLogStream',
                ],
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
                Action: [
                  'logs:PutLogEvents',
                ],
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
                Action: [
                  'lambda:InvokeFunction',
                ],
                Resource: '*',
              },
            ],
          },
        },
      ],
    },
  };
};

const lambdaInvoke = ({ stage, service, rate }) => {
  const cmd = [
    'sls invoke -f flambe',
    `--data '${JSON.stringify({ rate })}'`,
    `-s ${stage}`,
  ];
  cli(cmd.join(' '), {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
};

module.exports = {
  lambda,
  lambdaRole,
  lambdaCode,
  lambdaInvoke,
};
