const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils')
const paramUtils = require('../../src/utils/params.js')
const stackUtils = require('../../src/utils/stacks')
const profileUtils = require('../../src/profiles/utils')
const awsUtils = require('../../src/utils/aws.js')

const deploy = require('../../src/deploy')
const cwd = process.cwd()

describe('Deploy Function', () => {
  it('should deploy the stack and return a success and info log', () => {
    const template = {
      Parameters: {
        ParamOne: { Type: 'String' },
        ParamTwo: { Type: 'String' },
      },
    }
    const rc = {
      project: 'test',
      profiles: {
        testProfile: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
      },
    }
    const stack = {
      profile: 'testProfile',
      region: 'us-east-1',
      options: {
        tags: [
          {
            Key: 'update',
            Value: 'test',
          },
          {
            Key: 'updated',
            Value: 'tested',
          },
        ],
        advanced: {
          snsTopicArn: 'arn:aws:sns:us-east-1:1234567890:testsns',
          terminationProtection: true,
          timeout: 100,
          onFailure: 'ROLLBACK',
        },
        capabilityIam: true,
      },
      parameters: {
        paramOne: 'test',
        paramTwo: 'test',
      },
    }

    const fetchedProfile = {
      aws_access_key_id: 'abcd',
      aws_secret_access_key: 'efgh',
      region: 'us-east-1',
      name: 'testProfile',
    }

    const saveSettings = {
      ...rc,
      templates: {
        test: {
          teststack: stack,
        },
      },
    }
    return deploy(env, opts).then(() => {

      expect(configAWS.getCall(0).args[0]).to.deep.equal(fetchedProfile)
      expect(getTemplateAsObject.getCall(0).args[0]).to.equal('test')
      expect(selectRegion.getCall(0).args).to.deep.equal([
        fetchedProfile,
        'Which region would you like to deploy this stack to?',
      ])
      expect(selectStackParams.getCall(0).args).to.deep.equal([
        template.Parameters,
        'us-east-1',
        'configuredAws',
      ])
      expect(selectStackOptions.getCall(0).args).to.deep.equal([
        'us-east-1',
        'configuredAws',
      ])
      expect(inqPrompt.lastCall.args[0]).to.deep.equal({
        type: 'confirm',
        name: 'yes',
        message: 'Would you like to save these options for later deploys and updates?',
        default: true,
      })
      expect(writeRcFile.firstCall.args[0]).to.deep.equal([
        cwd,
        saveSettings,
      ])

      expect(createStack.getCall(0).args).to.deep.equal([
        template,
        'teststack',
        stack,
        'configuredAws',
      ])

      saveSettings.templates.test.teststack.stackId = 'test:stack:id'

      expect(writeRcFile.lastCall.args[0]).to.deep.equal([
        cwd,
        saveSettings,
      ])
      expect(log.i.lastCall.args[0]).to.deep.equal([
        `StackId: ${chk.cyan('test:stack:id')}`,
        3,
      ])
    })
  })
})
