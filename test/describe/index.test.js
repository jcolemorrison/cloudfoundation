const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const chk = require('chalk')
const inq = require('inquirer')
const utils = require('../../src/utils/index.js')
const profileUtils = require('../../src/profiles/utils.js')
const stackUtils = require('../../src/utils/stacks.js')
const awsUtils = require('../../src/utils/aws.js')

const cmd = require('../../src/describe/index.js')

describe('Describe Stack Functions', () => {
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

  describe('#describeAll', () => {
    const testStacks = {
      Stacks: [
        {
          StackName: 'testStack1',
          CreationTime: '2018-02-18 10:51:11 UTC-0800',
          StackStatus: 'UPDATE_COMPLETE',
          Description: 'Test Stack',
        },
      ],
    }
    let getValidTemplateName
    let readJsonSync
    let getValidTemplateProfile
    let getValidTemplateRegion
    let getFromAllProfiles
    let configAWS
    let describeStacksPromise

    beforeEach(() => {
      getValidTemplateName = sinon.stub(utils, 'getValidTemplateName')
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      getValidTemplateProfile = sinon.stub(cmd, 'getValidTemplateProfile')
      getValidTemplateRegion = sinon.stub(cmd, 'getValidTemplateRegion')
      getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
      configAWS = sinon.stub(awsUtils, 'configAWS')
      describeStacksPromise = sinon.stub()
    })

    afterEach(() => {
      getValidTemplateName.restore()
      readJsonSync.restore()
      getValidTemplateProfile.restore()
      getValidTemplateRegion.restore()
      getFromAllProfiles.restore()
      configAWS.restore()
    })

    it('should log the stack info given selected profile and region', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'testProfileName',
            },
          },
        },
      })
      getValidTemplateProfile.returns('testProfileName')
      getValidTemplateRegion.returns('us-east-1')
      getFromAllProfiles.returns({
        name: 'testProfileName',
      })
      configAWS.returns({
        CloudFormation: function CloudFormation () {
          return {
            describeStacks: () => ({
              promise: describeStacksPromise.returns(testStacks),
            }),
          }
        },
      })

      return cmd.describeAll().then(() => {
        expect(describeStacksPromise.called).to.be.true
        expect(log.p.called).to.be.true
      })
    })

    it('should throw an error if no stacks are found', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({})

      return cmd.describeAll().catch((e) => {
        expect(e.message).to.equal('No stacks for testTemplateName found.')
      })
    })

    it('should return an info message if no stacks are returned from CloudFormation', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'testProfileName',
            },
          },
        },
      })
      getValidTemplateProfile.returns('testProfileName')
      getValidTemplateRegion.returns('us-east-1')
      getFromAllProfiles.returns({
        name: 'testProfileName',
      })
      configAWS.returns({
        CloudFormation: function CloudFormation () {
          return {
            describeStacks: () => ({
              promise: describeStacksPromise.returns({ Stacks: [] }),
            }),
          }
        },
      })

      return cmd.describeAll().then(() => {
        expect(log.i.lastCall.args).to.deep.equal([
          `No stacks found for Template ${chk.cyan('testTemplateName')} for Profile ${chk.cyan('testProfileName')} in Region ${chk.cyan('us-east-1')}`,
          2,
        ])
      })
    })
  })

  describe('#describe', () => {
    const testStacks = {
      Stacks: [
        {
          StackName: 'testStack1',
          CreationTime: '2018-02-18 10:51:11 UTC-0800',
          StackStatus: 'UPDATE_COMPLETE',
          Description: 'Test Stack',
        },
      ],
    }
    let getValidTemplateName
    let readJsonSync
    let selectStackName
    let getFromAllProfiles
    let configAWS
    let describeStacksPromise
    let displayStack

    beforeEach(() => {
      getValidTemplateName = sinon.stub(utils, 'getValidTemplateName')
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      selectStackName = sinon.stub(stackUtils, 'selectStackName')
      getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
      configAWS = sinon.stub(awsUtils, 'configAWS')
      describeStacksPromise = sinon.stub()
      displayStack = sinon.stub(stackUtils, 'displayStack')
    })

    afterEach(() => {
      getValidTemplateName.restore()
      readJsonSync.restore()
      selectStackName.restore()
      getFromAllProfiles.restore()
      configAWS.restore()
      displayStack.restore()
    })

    it('should call to `displayStack` upon successful describe and show ALL columns when none specified', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'testProfileName',
            },
          },
        },
      })
      selectStackName.returns('testStackName')
      getFromAllProfiles.returns({
        name: 'testProfileName',
      })
      configAWS.returns({
        CloudFormation: function CloudFormation () {
          return {
            describeStacks: () => ({
              promise: describeStacksPromise.returns(testStacks),
            }),
          }
        },
      })

      return cmd.describe().then(() => {
        expect(displayStack.called).to.be.true
      })
    })

    it('should limit the columns returned if at least one option is passed', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'testProfileName',
            },
          },
        },
      })
      selectStackName.returns('testStackName')
      getFromAllProfiles.returns({
        name: 'testProfileName',
      })
      configAWS.returns({
        CloudFormation: function CloudFormation () {
          return {
            describeStacks: () => ({
              promise: describeStacksPromise.returns(testStacks),
            }),
          }
        },
      })

      return cmd.describe(undefined, { status: true }).then(() => {
        expect(displayStack.lastCall.args[1]).to.deep.equal({
          status: true,
          parameters: undefined,
          outputs: undefined,
          tags: undefined,
          info: undefined,
        })
      })
    })

    it('should throw an error if the specified stack is not found', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({
        templates: {
          testTemplateName: {
            testStackName: {
              profile: 'testProfileName',
            },
          },
        },
      })
      selectStackName.returns('missingStack')

      return cmd.describe(undefined, { status: true }).then(() => {
        expect(log.e.lastCall.args).to.deep.equal([
          'Stack missingStack not found.',
          2,
        ])
      })
    })

    it('should throw an error if no stacks are found found', () => {
      getValidTemplateName.returns('testTemplateName')
      readJsonSync.returns({})

      return cmd.describe(undefined, { status: true }).catch((e) => {
        expect(e.message).to.equal('No stacks for testTemplateName found.')
      })
    })
  })

  describe('#getValidTemplateProfile', () => {
    const stacks = [
      ['testStack', { profile: 'testProfile1' }],
      ['testStack2', { profile: 'testProfile1' }],
      ['testStack3', { profile: 'testProfile3' }],
    ]
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return a valid profile being used in a template\'s stacks', () => (
      cmd.getValidTemplateProfile('testProfile1', 'testTemplateName', stacks).then((d) => {
        expect(d).to.equal('testProfile1')
      })
    ))

    it('should throw an error if the passed profile does not match any template stack profiles', () => (
      cmd.getValidTemplateProfile('testProfile2', 'testTemplateName', stacks).catch((e) => {
        expect(e.message).to.equal(`${chk.cyan('testProfile2')} is not used for any of ${chk.cyan('testTemplateName')}'s stacks.`)
      })
    ))

    it('should inquire the user about which profile they want to use if none is specified via options', () => {
      inqPrompt.returns({ use: 'testProfile1' })

      return cmd.getValidTemplateProfile(undefined, 'testTemplateName', stacks).then((d) => {
        expect(d).to.equal('testProfile1')
      })
    })
  })

  describe('#getValidTemplateRegion', () => {
    const stacks = [
      ['testStack', { profile: 'testProfile1', region: 'us-east-1' }],
      ['testStack2', { profile: 'testProfile1', region: 'us-west-2' }],
      ['testStack3', { profile: 'testProfile3', region: 'us-east-1' }],
      ['testStack4', { profile: 'testProfile1', region: 'us-west-2' }],
    ]
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return the region if it is valid', () => (
      cmd.getValidTemplateRegion('us-east-1', 'testProfile1', stacks).then((d) => {
        expect(d).to.equal('us-east-1')
      })
    ))

    it('should return an error message if no valid regions are found for a given profile and template', () => (
      cmd.getValidTemplateRegion('us-east-1', 'testProfile4', stacks).then(() => {
        expect(log.e.lastCall.args).to.deep.equal([
          `No stacks found for Profile ${chk.cyan('testProfile4')}`,
          2,
        ])
      })
    ))

    it('should throw an error if a region is passed but matches no stacks', () => (
      cmd.getValidTemplateRegion('us-east-3', 'testProfile1', stacks).catch((e) => {
        expect(e.message).to.equal(`${chk.cyan('us-east-3')} is not used for any of ${chk.cyan('testProfile1')}'s stacks.`)
      })
    ))

    it('should inquire the user for a region from the list of valid regions if no region option is passed', () => {
      inqPrompt.returns({ use: 'us-east-1' })

      return cmd.getValidTemplateRegion(undefined, 'testProfile1', stacks).then((d) => {
        expect(d).to.equal('us-east-1')
      })
    })
  })
})
