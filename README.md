![npm downloads total](https://img.shields.io/npm/dt/serverless-plugin-pilot-light.svg) ![npm version](https://img.shields.io/npm/v/serverless-plugin-pilot-light.svg) ![npm license](https://img.shields.io/npm/l/serverless-plugin-pilot-light.svg)
[![Build Status](https://travis-ci.com/JetClosing/serverless-plugin-pilot-light.svg?branch=master)](https://travis-ci.com/JetClosing/serverless-plugin-pilot-light)

## Installation

```sh
npm install serverless-plugin-pilot-light --save-dev
```
or
```sh
yarn add serverless-plugin-pilot-light --dev
```

## Usage

In the serverless file, add `serverless-plugin-pilot-light` within the plugins entry.

Example:

```yaml
functions:
  hello:
    handler: src/hello.handler
    timeout: 15

plugins:
  - serverless-plugin-pilot-light
```

By default all functions will then be automatically scheduled, wrapped to accept scheduled events, and immediately invoked post-deployment. If you want more granular control, options can be configured within a custom pilot_light variable.

## Custom Declaration
In case your project doesn't require all of your lambdas to be warm, you can list the name of a specific lambda or use regular expressions declared in the custom level variables.

Example:
```
custom:
  pilot_light:
    - hello
    - /good.*/ 
```

The above example will keep the function `hello` warm as well as functions prefixed with the name `good`. If there are no lambdas that match in the declared list, nothing will be scheduled.

## Lambda Configuration

In order to fine-tune the rate, input, and flow of your code, lambdas are configured on a per-lambda basis using the field `pilot_light`

| Option | Values | Default | Description  |
| :--- | :--- | :--- | :--- |
| `rate` | AWS rate | 5 minutes | How often the lambda is to be called |
| `wrapper` | String | null | The file path where a custom wrapper exists (same as a function handler definition) |
| `input` | Object | { pilot_light: true } | The event the lambda receives, when it is pinged |

#### Options Example

```yaml
functions:
  hello:
    handler: handlers.hello
    timeout: 10
    pilot_light: 
      rate: 'rate(3 minutes)'
      
  goodbye:
    handler: handlers.goodbye
    pilot_light:
      wrapper: wrapper.logger
      input:
        custom: 'property'
```

#### Custom Wrapper(s)
If you want to build a custom wrapper instead of the default pilot_light wrapper, it needs to be written as a higher-order-function. 

Example:
```
// wrappers.js
const logger = (original) => (evt, ctx, cb) => {
  console.log('Logging event data:', JSON.stringify(evt, null, 2));
  return original(evt, ctx, cb);
}

module.exports = {
  logger,
};
```

## Plugin Conflicts

Make sure `serverless-plugin-pilot-light` is placed before any plugins that compile code. 
Example:

```yaml
plugins:
  - serverless-plugin-pilot-light
  - serverless-webpack
```

## Cost

Cost per execution: `$0.0000002`

Cost per memory allocated 1024MB: `$0.000001667`

Calls per day: `288`

Calls per month: `8640`


Total monthly cost per-lambda: `$0.016`

_**Prices calculated using the following aws information  [here](https://aws.amazon.com/lambda/pricing/)._
