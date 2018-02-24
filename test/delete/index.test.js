const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const inq = require('inquirer')
const utils = require('../../src/utils')
const stackUtils = require('../../src/utils/stacks.js')
const profileUtils = require('../../src/profiles/utils.js')
const awsUtils = require('../../src/utils/aws.js')

const cmd = require('../../src/delete/index.js')

describe('Delete Function', () => {
  let log
  let getValidTemplateName
  let readJsonSync
  let selectStackName
  let inqPrompt
  let getFromAllProfiles
  let configAWS
  let writeRcFile
  let deleteStackPromise

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
    getValidTemplateName = sinon.stub(utils, 'getValidTemplateName')
    readJsonSync = sinon.stub(fs, 'readJsonSync')
    selectStackName = sinon.stub(stackUtils, 'selectStackName')
    inqPrompt = sinon.stub(inq, 'prompt')
    getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
    configAWS = sinon.stub(awsUtils, 'configAWS')
    writeRcFile = sinon.stub(utils, 'writeRcFile')
    deleteStackPromise = sinon.stub()
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    getValidTemplateName.restore()
    readJsonSync.restore()
    selectStackName.restore()
    inqPrompt.restore()
    getFromAllProfiles.restore()
    configAWS.restore()
    writeRcFile.restore()
  })

  it('should delete the stack and remove it from the RC file without any template name or options passed up', () => {
    getValidTemplateName.returns('testTemplateName')
    readJsonSync.returns({
      templates: {
        testTemplateName: {
          testStackName: {
            profile: 'testProfileName',
            region: 'us-east-1',
            stackId: 'test:stack:one',
          },
          testStackName2: {
            profile: 'testProfileName',
            region: 'us-west-2',
            stackId: 'test:stack:two',
          },
        },
      },
    })
    selectStackName.returns('testStackName')
    inqPrompt.returns({ delete: true })
    getFromAllProfiles.returns('testProfileName')
    configAWS.returns({
      CloudFormation: function CloudFormation () {
        return {
          deleteStack: () => ({
            promise: deleteStackPromise.returns(),
          }),
        }
      },
    })

    return cmd().then(() => {
      expect(writeRcFile.lastCall.args).to.deep.equal([
        process.cwd(),
        {
          templates: {
            testTemplateName: {
              testStackName2: {
                profile: 'testProfileName',
                region: 'us-west-2',
                stackId: 'test:stack:two',
              },
            },
          },
        },
      ])
    })
  })

  it('should return false if they decide they do not want to delete the stack after confirmation', () => {
    getValidTemplateName.returns('testTemplateName')
    readJsonSync.returns({
      templates: {
        testTemplateName: {
          testStackName: {
            profile: 'testProfileName',
            region: 'us-east-1',
            stackId: 'test:stack:one',
          },
          testStackName2: {
            profile: 'testProfileName',
            region: 'us-west-2',
            stackId: 'test:stack:two',
          },
        },
      },
    })
    selectStackName.returns('testStackName')
    inqPrompt.returns({ delete: false })

    return cmd().then((d) => {
      expect(d).to.be.false
    })
  })

  it('return an error message if the stack is not in the template', () => {
    getValidTemplateName.returns('testTemplateName')
    readJsonSync.returns({
      templates: {
        testTemplateName: {
          testStackName: {
            profile: 'testProfileName',
            region: 'us-east-1',
            stackId: 'test:stack:one',
          },
          testStackName2: {
            profile: 'testProfileName',
            region: 'us-west-2',
            stackId: 'test:stack:two',
          },
        },
      },
    })

    return cmd(undefined, { stackname: 'testStackName3' }).then(() => {
      expect(log.e.lastCall.args).to.deep.equal(['Stack testStackName3 not found.', 2])
    })
  })

  it('should throw an error if no stacks are found for the given template', () => {
    getValidTemplateName.returns('testTemplateName')
    readJsonSync.returns({})

    return cmd().catch((e) => {
      expect(e.message).to.equal('No stacks for testTemplateName found.')
    })
  })
})
