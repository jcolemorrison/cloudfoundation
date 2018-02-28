const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils')
const profileUtils = require('../../src/profiles/utils.js')

const cmd = require('../../src/profiles/remove.js')

describe('Profile Remove Function', () => {
  let log
  let getScopedProfiles
  let inqPrompt
  let selectProfile
  let writeLocalProfiles
  let writeGlobalProfiles


  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }

    getScopedProfiles = sinon.stub(profileUtils, 'getScopedProfiles')
    inqPrompt = sinon.stub(inq, 'prompt')
    selectProfile = sinon.stub(profileUtils, 'selectProfile')
    writeLocalProfiles = sinon.stub(profileUtils, 'writeLocalProfiles')
    writeGlobalProfiles = sinon.stub(profileUtils, 'writeGlobalProfiles')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    getScopedProfiles.restore()
    inqPrompt.restore()
    selectProfile.restore()
    writeLocalProfiles.restore()
    writeGlobalProfiles.restore()
  })

  it('should write the global profiles without the removed profile via selection', () => {
    getScopedProfiles.returns({
      profiles: {
        oldProfileName: {},
        profileName: {},
      },
      scope: 'global',
    })
    selectProfile.returns({ name: 'profileName' })
    inqPrompt.returns({ remove: true })

    return cmd().then(() => {
      expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
        oldProfileName: {},
      })
      expect(log.s.lastCall.args).to.deep.equal([
        `Profile ${chk.cyan('profileName')} successfully removed!`,
        2,
      ])
    })
  })

  it('should write local profiles without the removed profile via selection', () => {
    getScopedProfiles.returns({
      profiles: {
        oldProfileName: {},
        profileName: {},
      },
      scope: 'local',
    })
    selectProfile.returns({ name: 'profileName' })
    inqPrompt.returns({ remove: true })

    return cmd().then(() => {
      expect(writeLocalProfiles.lastCall.args[0]).to.deep.equal({
        oldProfileName: {},
      })
      expect(log.s.lastCall.args).to.deep.equal([
        `Profile ${chk.cyan('profileName')} successfully removed!`,
        2,
      ])
    })
  })

  it('should return false if they do not confirm', () => {
    getScopedProfiles.returns({
      profiles: {
        oldProfileName: {},
        profileName: {},
      },
      scope: 'local',
    })
    selectProfile.returns({ name: 'profileName' })
    inqPrompt.returns({ remove: false })

    return cmd().then((d) => {
      expect(d).to.be.false
    })
  })

  it('should write the global profiles if name passed via options', () => {
    getScopedProfiles.returns({
      profiles: {
        oldProfileName: {},
        profileName: {},
      },
      scope: 'global',
    })
    inqPrompt.returns({ remove: true })

    return cmd('profileName').then(() => {
      expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
        oldProfileName: {},
      })
      expect(log.s.lastCall.args).to.deep.equal([
        `Profile ${chk.cyan('profileName')} successfully removed!`,
        2,
      ])
    })
  })

  it('should throw an error if the profile name passed via options does not exist', () => {
    getScopedProfiles.returns({
      profiles: {
        oldProfileName: {},
        profileName: {},
      },
      scope: 'local',
    })

    return cmd('missing').catch((e) => {
      expect(e.message).to.equal('Profile missing does not exist!')
    })
  })
})
