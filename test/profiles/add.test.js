const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils')
const profileUtils = require('../../src/profiles/utils.js')

const cmd = require('../../src/profiles/add.js')

describe('Profile Add Function', () => {
  let log
  let getScopedProfiles
  let importAWSProfile
  let setupCFDNProfile
  let writeGlobalProfiles
  let writeLocalProfiles
  let inqPrompt

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }

    getScopedProfiles = sinon.stub(profileUtils, 'getScopedProfiles')
    importAWSProfile = sinon.stub(profileUtils, 'importAWSProfile')
    setupCFDNProfile = sinon.stub(profileUtils, 'setupCFDNProfile')
    writeGlobalProfiles = sinon.stub(profileUtils, 'writeGlobalProfiles')
    writeLocalProfiles = sinon.stub(profileUtils, 'writeLocalProfiles')
    inqPrompt = sinon.stub(inq, 'prompt')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    getScopedProfiles.restore()
    importAWSProfile.restore()
    setupCFDNProfile.restore()
    writeGlobalProfiles.restore()
    writeLocalProfiles.restore()
    inqPrompt.restore()
  })

  it('should write a new CFDN local profile to local profiles if no options passed and cfdn selected', () => {
    getScopedProfiles.returns({
      profiles: {
        otherProfile: {},
      },
      scope: 'local',
    })
    inqPrompt.returns({ type: 'cfdn' })
    setupCFDNProfile.returns({ testProfile: {} })
    return cmd.addProfile().then(() => {
      expect(writeLocalProfiles.lastCall.args[0]).to.deep.equal({
        otherProfile: {},
        testProfile: {},
      })
      expect(log.i.lastCall.args).to.deep.equal([
        `Use ${chk.cyan('--profile testProfile')} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`,
        3,
      ])
    })
  })

  it('should write a new CFDN global profile to global profiles if no options passed and cfdn selected', () => {
    getScopedProfiles.returns({
      profiles: {
        otherProfile: {},
      },
      scope: 'global',
    })
    inqPrompt.returns({ type: 'cfdn' })
    setupCFDNProfile.returns({ testProfile: {} })
    return cmd.addProfile().then(() => {
      expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
        otherProfile: {},
        testProfile: {},
      })
      expect(log.i.lastCall.args).to.deep.equal([
        `Use ${chk.cyan('--profile testProfile')} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`,
        3,
      ])
    })
  })

  it('should import an AWS profile if no options are passed and AWS is selected', () => {
    getScopedProfiles.returns({
      profiles: {
        otherProfile: {},
      },
      scope: 'local',
    })
    inqPrompt.returns({ type: 'aws' })
    importAWSProfile.returns({ testAwsProfile: {} })
    return cmd.addProfile().then(() => {
      expect(writeLocalProfiles.lastCall.args[0]).to.deep.equal({
        otherProfile: {},
        testAwsProfile: {},
      })
      expect(log.i.lastCall.args).to.deep.equal([
        `Use ${chk.cyan('--profile testAwsProfile')} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`,
        3,
      ])
    })
  })

  it('should locally import an AWS profile if the cli option `--aws --local` is passed', () => {
    getScopedProfiles.returns({
      profiles: {
        otherProfile: {},
      },
      scope: 'local',
    })
    importAWSProfile.returns({ testAwsProfile: {} })
    return cmd.addProfile(undefined, { local: true, aws: true }).then(() => {
      expect(writeLocalProfiles.lastCall.args[0]).to.deep.equal({
        otherProfile: {},
        testAwsProfile: {},
      })
      expect(log.i.lastCall.args).to.deep.equal([
        `Use ${chk.cyan('--profile testAwsProfile')} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`,
        3,
      ])
    })
  })

  it('should globally create a CFDN profile if the cli option `--cfdn --global` is passed', () => {
    getScopedProfiles.returns({
      profiles: {
        otherProfile: {},
      },
      scope: 'global',
    })
    setupCFDNProfile.returns({ testCfdnProfile: {} })
    return cmd.addProfile('testCfdnProfile', { global: true, cfdn: true }).then(() => {
      expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
        otherProfile: {},
        testCfdnProfile: {},
      })
      expect(log.i.lastCall.args).to.deep.equal([
        `Use ${chk.cyan('--profile testCfdnProfile')} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`,
        3,
      ])
    })
  })

  it('should throw an error if both `--aws` and `--cfdn` are passed up', () => (
    cmd.addProfile('testCfdnProfile', { aws: true, cfdn: true }).catch((e) => {
      expect(e.message).to.equal(`Select one of either ${chk.cyan('-a|--aws')} or ${chk.cyan('-c|--cfdn')}only.`)
    })
  ))
})
