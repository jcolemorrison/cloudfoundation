const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils')
const paramUtils = require('../../src/utils/params.js')
const stackUtils = require('../../src/utils/stacks.js')
const profileUtils = require('../../src/profiles/utils.js')
const awsUtils = require('../../src/utils/aws.js')

const cmd = require('../../src/update')

const cwd = process.cwd()

describe('Update Functions', () => {
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

  describe('#update', () => {
    let testRc
    let testTemplate
    let testStack
    let saveSettings

    let getValidTemplate
    let readJsonSync
    let getValidStackName
    let checkStackExists
    let getFromAllProfiles
    let configAWS
    let getTemplateAsObject
    let getParamChanges
    let confirmStack
    let createSaveSettings
    let writeRcFile
    let updateStack

    // used in control flows
    let updateParams

    beforeEach(() => {
      testRc = {
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'stackProfile',
              test: 'stack',
            },
          },
        },
      }
      testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }
      testStack = {
        profile: 'stackProfile',
        test: 'stack',
      }
      saveSettings = {
        templates: {
          testTemplateName: {
            testStackName: {
              test: 'stack',
            },
          },
        },
      }

      getValidTemplate = sinon.stub(cmd, 'getValidTemplate')
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      getValidStackName = sinon.stub(cmd, 'getValidStackName')
      checkStackExists = sinon.stub(cmd, 'checkStackExists')
      getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
      configAWS = sinon.stub(awsUtils, 'configAWS')
      getTemplateAsObject = sinon.stub(utils, 'getTemplateAsObject')
      getParamChanges = sinon.stub(cmd, 'getParamChanges')
      confirmStack = sinon.stub(stackUtils, 'confirmStack')
      createSaveSettings = sinon.stub(utils, 'createSaveSettings')
      writeRcFile = sinon.stub(utils, 'writeRcFile')
      updateStack = sinon.stub(stackUtils, 'updateStack')

      updateParams = sinon.stub(cmd, 'updateParams')
    })

    afterEach(() => {
      getValidTemplate.restore()
      readJsonSync.restore()
      getValidStackName.restore()
      checkStackExists.restore()
      getFromAllProfiles.restore()
      configAWS.restore()
      getTemplateAsObject.restore()
      getParamChanges.restore()
      confirmStack.restore()
      createSaveSettings.restore()
      writeRcFile.restore()
      updateStack.restore()

      updateParams.restore()
    })

    it('should return a success message after calling to the `updateStack` method when no options or name is passed up', () => {
      getValidTemplate.returns('testTemplateName')
      readJsonSync.returns(testRc)
      getValidStackName.returns('testStackName')
      checkStackExists.returns(testStack)
      getFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      getParamChanges.returns(testStack)
      confirmStack.returns(true)
      createSaveSettings.returns(saveSettings)

      return cmd.update().then(() => {
        expect(log.s.lastCall.args).to.deep.equal([
          `Stack ${chk.cyan('testStackName')} successfully updated!`,
          2,
        ])
      })
    })

    it('should call to `updateParams` if the user does not want to use existing params', () => {
      getValidTemplate.returns('testTemplateName')
      readJsonSync.returns(testRc)
      getValidStackName.returns('testStackName')
      checkStackExists.returns(testStack)
      getFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      getParamChanges.returns(testStack)
      confirmStack.returns(false) // if they want use the exisitng params
      updateParams.returns(testStack)
      createSaveSettings.returns(saveSettings)

      return cmd.update().then(() => {
        expect(log.s.lastCall.args).to.deep.equal([
          `Stack ${chk.cyan('testStackName')} successfully updated!`,
          2,
        ])
      })
    })

    it('should return false if `updateParams` is called and no stack is returned', () => {
      getValidTemplate.returns('testTemplateName')
      readJsonSync.returns(testRc)
      getValidStackName.returns('testStackName')
      checkStackExists.returns(testStack)
      getFromAllProfiles.returns('selectedProfile')
      configAWS.returns('configuredAWS')
      getTemplateAsObject.returns(testTemplate)
      getParamChanges.returns(testStack)
      confirmStack.returns(false) // if they want use the exisitng params
      updateParams.returns(false)
      createSaveSettings.returns(saveSettings)

      return cmd.update().then((d) => {
        expect(d).to.be.false
      })
    })

    it('should throw an error if no template exists by the given name', () => {
      getValidTemplate.returns('wrong')
      readJsonSync.returns({})

      return cmd.update().catch((e) => {
        expect(e.message).to.equal(`Template ${chk.cyan('wrong')} not found!`)
      })
    })
  })

  describe('#updateParams', () => {
    let testTemplate
    let testStack

    let confirmStack
    let selectStackOptions
    let selectStackParams
    let inqPrompt

    beforeEach(() => {
      testTemplate = { Parameters: { ParamOne: 'Test', ParamTwo: 'Test' } }
      testStack = {
        profile: 'stackProfile',
        test: 'stack',
      }

      confirmStack = sinon.stub(stackUtils, 'confirmStack')
      selectStackOptions = sinon.stub(stackUtils, 'selectStackOptions')
      selectStackParams = sinon.stub(paramUtils, 'selectStackParams')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      confirmStack.restore()
      selectStackOptions.restore()
      selectStackParams.restore()
      inqPrompt.restore()
    })

    it('should return the structured stack', () => {
      inqPrompt.returns({ params: true })
      selectStackParams.returns('new params')
      selectStackOptions.returns('new options')
      confirmStack.returns(true)

      return cmd.updateParams('testTemplateName', testTemplate, 'testStackName', testStack, 'configuredAWS').then((d) => {
        expect(d).to.deep.equal({
          ...testStack,
          options: 'new options',
          parameters: 'new params',
        })
      })
    })

    it('should return false if they do not want to update existing params', () => {
      inqPrompt.returns({ params: false })

      return cmd.updateParams('testTemplateName', testTemplate, 'testStackName', testStack, 'configuredAWS').then((d) => {
        expect(d).to.be.false
      })
    })

    it('should return false if they update the params and say they do not want to use them ... again', () => {
      inqPrompt.returns({ params: true })
      selectStackParams.returns('new params')
      selectStackOptions.returns('new options')
      confirmStack.returns(false)

      return cmd.updateParams('testTemplateName', testTemplate, 'testStackName', testStack, 'configuredAWS').then((d) => {
        expect(d).to.be.false
      })
    })
  })
})
