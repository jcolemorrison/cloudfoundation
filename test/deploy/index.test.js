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

const cmd = require('../../src/deploy')

const cwd = process.cwd()

describe('Deploy Functions', () => {
  let log

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
  })

  describe('#deploy', () => {
    let readJsonSync
    let inquireTemplateName
    let inqStackName
    let selectFromAllProfiles
    let configAWS
    let getTemplateAsObject
    let createStackSettings
    let confirmStack
    let inqPrompt
    let createSaveSettings
    let createStack
    let writeRcFile

    beforeEach(() => {
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      inquireTemplateName = sinon.stub(utils, 'inquireTemplateName')
      inqStackName = sinon.stub(cmd, 'inqStackName')
      selectFromAllProfiles = sinon.stub(profileUtils, 'selectFromAllProfiles')
      configAWS = sinon.stub(awsUtils, 'configAWS')
      getTemplateAsObject = sinon.stub(utils, 'getTemplateAsObject')
      createStackSettings = sinon.stub(cmd, 'createStackSettings')
      confirmStack = sinon.stub(stackUtils, 'confirmStack')
      inqPrompt = sinon.stub(inq, 'prompt')
      createSaveSettings = sinon.stub(cmd, 'createSaveSettings')
      createStack = sinon.stub(stackUtils, 'createStack')
      writeRcFile = sinon.stub(utils, 'writeRcFile')
    })

    afterEach(() => {
      readJsonSync.restore()
      inquireTemplateName.restore()
      inqStackName.restore()
      selectFromAllProfiles.restore()
      configAWS.restore()
      getTemplateAsObject.restore()
      createStackSettings.restore()
      confirmStack.restore()
      inqPrompt.restore()
      createSaveSettings.restore()
      createStack.restore()
      writeRcFile.restore()
    })

    it('should deploy the stack and return an info message on success with no predefined stack, saving settings, or cli options', () => {
      const testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }

      readJsonSync.returns({})
      inquireTemplateName.returns('testTemplateName')
      inqStackName.returns('testStackName')
      selectFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      createStackSettings.returns({ test: 'stack' })
      confirmStack.returns(true)
      inqPrompt.returns({ use: true })
      createSaveSettings.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              test: 'stack',
            },
          },
        },
      })
      createStack.returns('test:stack:id')

      return cmd.deploy().then(() => {
        expect(inqStackName.lastCall.args[0]).to.equal('testTemplateName')
        expect(configAWS.lastCall.args[0]).to.deep.equal('selectedProfile')
        expect(getTemplateAsObject.lastCall.args[0]).to.equal('testTemplateName')
        expect(createStackSettings.lastCall.args).to.deep.equal([
          'selectedProfile',
          testTemplate.Parameters,
          'configuredAWS',
        ])
        expect(confirmStack.lastCall.args).to.deep.equal([
          'testTemplateName',
          'testStackName',
          { test: 'stack' },
          false,
          'Deploy',
        ])
        // Whether ot save settings
        expect(inqPrompt.lastCall.args[0]).to.deep.equal({
          type: 'confirm',
          name: 'use',
          message: 'Would you like to save these options for later deploys and updates?',
          default: true,
        })
        expect(createSaveSettings.firstCall.args).to.deep.equal([
          { templates: {} },
          'testTemplateName',
          'testStackName',
          { test: 'stack' },
        ])

        expect(createStack.getCall(0).args).to.deep.equal([
          testTemplate,
          'testStackName',
          { test: 'stack' },
          'configuredAWS',
        ])

        expect(writeRcFile.lastCall.args).to.deep.equal([
          cwd,
          {
            templates: {
              testTemplateName: {
                testStackName: {
                  test: 'stack',
                  stackId: 'test:stack:id',
                },
              },
            },
          },
        ])

        expect(log.i.lastCall.args).to.deep.equal([
          `StackId: ${chk.cyan('test:stack:id')}`,
          3,
        ])
      })
    })
  })
  // it('should deploy the stack and return a success and info log', () => {
  //   const template = {
  //     Parameters: {
  //       ParamOne: { Type: 'String' },
  //       ParamTwo: { Type: 'String' },
  //     },
  //   }
  //   const rc = {
  //     project: 'test',
  //     profiles: {
  //       testProfile: {
  //         aws_access_key_id: 'abcd',
  //         aws_secret_access_key: 'efgh',
  //         region: 'us-east-1',
  //       },
  //     },
  //   }
  //   const stack = {
  //     profile: 'testProfile',
  //     region: 'us-east-1',
  //     options: {
  //       tags: [
  //         {
  //           Key: 'update',
  //           Value: 'test',
  //         },
  //         {
  //           Key: 'updated',
  //           Value: 'tested',
  //         },
  //       ],
  //       advanced: {
  //         snsTopicArn: 'arn:aws:sns:us-east-1:1234567890:testsns',
  //         terminationProtection: true,
  //         timeout: 100,
  //         onFailure: 'ROLLBACK',
  //       },
  //       capabilityIam: true,
  //     },
  //     parameters: {
  //       paramOne: 'test',
  //       paramTwo: 'test',
  //     },
  //   }

  //   const fetchedProfile = {
  //     aws_access_key_id: 'abcd',
  //     aws_secret_access_key: 'efgh',
  //     region: 'us-east-1',
  //     name: 'testProfile',
  //   }

  //   const saveSettings = {
  //     ...rc,
  //     templates: {
  //       test: {
  //         teststack: stack,
  //       },
  //     },
  //   }
  //   return deploy(env, opts).then(() => {

  //     expect(configAWS.getCall(0).args[0]).to.deep.equal(fetchedProfile)
  //     expect(getTemplateAsObject.getCall(0).args[0]).to.equal('test')
  //     expect(selectRegion.getCall(0).args).to.deep.equal([
  //       fetchedProfile,
  //       'Which region would you like to deploy this stack to?',
  //     ])
  //     expect(selectStackParams.getCall(0).args).to.deep.equal([
  //       template.Parameters,
  //       'us-east-1',
  //       'configuredAws',
  //     ])
  //     expect(selectStackOptions.getCall(0).args).to.deep.equal([
  //       'us-east-1',
  //       'configuredAws',
  //     ])
  //     expect(inqPrompt.lastCall.args[0]).to.deep.equal({
  //       type: 'confirm',
  //       name: 'yes',
  //       message: 'Would you like to save these options for later deploys and updates?',
  //       default: true,
  //     })
  //     expect(writeRcFile.firstCall.args[0]).to.deep.equal([
  //       cwd,
  //       saveSettings,
  //     ])

  //     expect(createStack.getCall(0).args).to.deep.equal([
  //       template,
  //       'teststack',
  //       stack,
  //       'configuredAws',
  //     ])

  //     saveSettings.templates.test.teststack.stackId = 'test:stack:id'

  //     expect(writeRcFile.lastCall.args[0]).to.deep.equal([
  //       cwd,
  //       saveSettings,
  //     ])
  //     expect(log.i.lastCall.args[0]).to.deep.equal([
  //       `StackId: ${chk.cyan('test:stack:id')}`,
  //       3,
  //     ])
  //   })
  // })
})
