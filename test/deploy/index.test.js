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
    let useExistingDeploy
    let inquireTemplateName
    let checkValidTemplate
    let inqStackName
    let selectFromAllProfiles
    let getFromAllProfiles
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
      useExistingDeploy = sinon.stub(cmd, 'useExistingDeploy')
      inquireTemplateName = sinon.stub(utils, 'inquireTemplateName')
      checkValidTemplate = sinon.stub(utils, 'checkValidTemplate')
      inqStackName = sinon.stub(cmd, 'inqStackName')
      selectFromAllProfiles = sinon.stub(profileUtils, 'selectFromAllProfiles')
      getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
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
      useExistingDeploy.restore()
      inquireTemplateName.restore()
      checkValidTemplate.restore()
      inqStackName.restore()
      selectFromAllProfiles.restore()
      getFromAllProfiles.restore()
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

    it('should deploy the stack with cli options, but no predefined stack', () => {
      const testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }

      const env = 'testTemplateName'
      const opts = { profile: 'testProfile', stackname: 'testStackName' }

      readJsonSync.returns({})
      checkValidTemplate.returns(true)
      getFromAllProfiles.returns('selectedProfile')
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

      return cmd.deploy(env, opts).then(() => {
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

    it('should deploy with predefined stack settings', () => {
      const testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }

      const env = 'testTemplateName'
      const opts = { profile: 'testProfile', stackname: 'testStackName' }

      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'stackProfile',
              test: 'stack',
            },
          },
        },
      })
      useExistingDeploy.returns(true)
      checkValidTemplate.returns(true)
      getFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
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

      return cmd.deploy(env, opts).then(() => {
        expect(useExistingDeploy.firstCall.args).to.deep.equal([
          {
            profile: 'stackProfile',
            test: 'stack',
          },
          'testStackName',
          'testTemplateName',
        ])
        expect(configAWS.lastCall.args[0]).to.deep.equal('selectedProfile')
        expect(getTemplateAsObject.lastCall.args[0]).to.equal('testTemplateName')

        expect(createSaveSettings.firstCall.args).to.deep.equal([
          {
            templates: {
              testTemplateName: {
                testStackName: {
                  profile: 'stackProfile',
                  test: 'stack',
                },
              },
            },
          },
          'testTemplateName',
          'testStackName',
          {
            profile: 'stackProfile',
            test: 'stack',
          },
        ])

        expect(createStack.getCall(0).args).to.deep.equal([
          testTemplate,
          'testStackName',
          {
            profile: 'stackProfile',
            test: 'stack',
          },
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

    it('should return an error message if they have a predefined stack but don\'t want to use it', () => {
      const env = 'testTemplateName'
      const opts = { profile: 'testProfile', stackname: 'testStackName' }

      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'stackProfile',
              test: 'stack',
            },
          },
        },
      })
      useExistingDeploy.returns(false)

      return cmd.deploy(env, opts).then(() => {
        expect(useExistingDeploy.firstCall.args).to.deep.equal([
          {
            profile: 'stackProfile',
            test: 'stack',
          },
          'testStackName',
          'testTemplateName',
        ])
        expect(log.e.lastCall.args).to.deep.equal([
          `Stack ${chk.cyan('testStackName')} already exists.  Either use the settings you have configured, choose a different stackname, or delete the stack from your ${chk.cyan('.stacks')} file.`,
        ])
      })
    })

    it('should return false if they create a stack and don\'t want to deploy it', () => {
      const testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }

      readJsonSync.returns({})
      inquireTemplateName.returns('testTemplateName')
      inqStackName.returns('testStackName')
      selectFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      createStackSettings.returns({ test: 'stack' })
      confirmStack.returns(false)

      return cmd.deploy().then((d) => {
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
        expect(d).to.equal(false)
      })
    })

    it('should not write the RC file if the user doesn\'t want to save settings', () => {
      const testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }

      readJsonSync.returns({})
      inquireTemplateName.returns('testTemplateName')
      inqStackName.returns('testStackName')
      selectFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      createStackSettings.returns({ test: 'stack' })
      confirmStack.returns(true)
      inqPrompt.returns({ use: false })
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
        expect(createSaveSettings.called).to.be.false

        expect(createStack.getCall(0).args).to.deep.equal([
          testTemplate,
          'testStackName',
          { test: 'stack' },
          'configuredAWS',
        ])

        expect(writeRcFile.called).to.be.false
      })
    })
  })

  describe('#inqStackName', () => {
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return the selected stackName', () => {
      inqPrompt.returns({ name: 'testStackName' })

      return cmd.inqStackName('testTemplateName').then((d) => {
        expect(d).to.equal('testStackName')

        const validateFn = inqPrompt.getCall(0).args[0].validate

        expect(validateFn()).to.equal('A name for the stack is required!')
        expect(validateFn('wrong.thing')).to.equal('Stack names can only contain alphanumeric characters and hyphens')
        expect(validateFn('toolong'.repeat(20))).to.equal('Stack names can only be 128 characters long')
        expect(validateFn('goodname')).to.be.true
      })
    })
  })

  describe('#useExistingDeploy', () => {
    let confirmStack

    beforeEach(() => {
      confirmStack = sinon.stub(stackUtils, 'confirmStack')
    })

    afterEach(() => {
      confirmStack.restore()
    })

    it('should return the call to the confirmStack', () => {
      const stack = {}
      confirmStack.returns(true)

      return cmd.useExistingDeploy(stack, 'testStackName', 'testTemplateName').then((d) => {
        expect(d).to.be.true
        expect(confirmStack.lastCall.args).to.deep.equal([
          'testTemplateName',
          'testStackName',
          {},
          `Stack with name ${chk.cyan('testStackName')} found for template ${chk.cyan('testTemplateName')}`,
          'Deploy',
        ])
      })
    })

    it('should throw an error if the stack is already deployed', () => {
      const stack = { stackId: 'test:stack:id' }

      return cmd.useExistingDeploy(stack, 'testStackName', 'testTemplateName').catch((e) => {
        expect(e.message).to.equal(chk.red(`Stack ${chk.cyan('testStackName')} already exists.  Run ${chk.cyan(`cfdn update ${'testTemplateName'} --stackname ${'testStackName'}`)} to modify it.`))
      })
    })
  })

  describe('#createStackSettings', () => {
    let selectRegion
    let selectStackParams
    let selectStackOptions

    beforeEach(() => {
      selectRegion = sinon.stub(utils, 'selectRegion')
      selectStackParams = sinon.stub(paramUtils, 'selectStackParams')
      selectStackOptions = sinon.stub(stackUtils, 'selectStackOptions')
    })

    afterEach(() => {
      selectRegion.restore()
      selectStackParams.restore()
      selectStackOptions.restore()
    })

    it('should return the stack settings based on the user selection prompts', () => {
      const profile = { name: 'testProfile' }
      const templateParams = { ParamOne: 'one', ParamTwo: 'two' }

      selectRegion.returns('us-east-1')
      selectStackParams.returns({ ParamOne: 'one', ParamTwo: 'two' })
      selectStackOptions.returns('options')

      return cmd.createStackSettings(profile, templateParams, 'configuredAWS').then((d) => {
        expect(d).to.deep.equal({
          profile: 'testProfile',
          region: 'us-east-1',
          options: 'options',
          parameters: { ParamOne: 'one', ParamTwo: 'two' },
        })
      })
    })
  })
})
