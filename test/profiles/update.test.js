const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils')
const profileUtils = require('../../src/profiles/utils.js')

const cmd = require('../../src/profiles/update.js')

describe('Profile Update Functions', () => {
  let log
  let inqPrompt

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }

    inqPrompt = sinon.stub(inq, 'prompt')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
    inqPrompt.restore()
  })

  describe('#updateProfile', () => {
    let getScopedProfiles
    let selectProfile
    let updateProfileInquiry
    let writeLocalProfiles
    let writeGlobalProfiles


    beforeEach(() => {
      getScopedProfiles = sinon.stub(profileUtils, 'getScopedProfiles')
      selectProfile = sinon.stub(profileUtils, 'selectProfile')
      updateProfileInquiry = sinon.stub(cmd, 'updateProfileInquiry')
      writeLocalProfiles = sinon.stub(profileUtils, 'writeLocalProfiles')
      writeGlobalProfiles = sinon.stub(profileUtils, 'writeGlobalProfiles')
    })

    afterEach(() => {
      getScopedProfiles.restore()
      selectProfile.restore()
      updateProfileInquiry.restore()
      writeLocalProfiles.restore()
      writeGlobalProfiles.restore()
    })

    it('should write the global profiles with the updated profile via selection', () => {
      getScopedProfiles.returns({
        profiles: {
          oldProfileName: {},
          profileName: {
            key: 'old',
          },
        },
        scope: 'global',
      })
      selectProfile.returns({ name: 'profileName' })
      updateProfileInquiry.returns({ key: 'new' })

      return cmd.updateProfile().then(() => {
        expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
          oldProfileName: {},
          profileName: {
            key: 'new',
          },
        })
        expect(log.s.lastCall.args).to.deep.equal([
          `Profile ${chk.cyan('profileName')} successfully updated!`,
          2,
        ])
      })
    })

    it('should write local profiles with the updated profile via selection', () => {
      getScopedProfiles.returns({
        profiles: {
          oldProfileName: {},
          profileName: {
            key: 'old',
          },
        },
        scope: 'local',
      })
      selectProfile.returns({ name: 'profileName' })
      updateProfileInquiry.returns({ key: 'new' })

      return cmd.updateProfile().then(() => {
        expect(writeLocalProfiles.lastCall.args[0]).to.deep.equal({
          oldProfileName: {},
          profileName: {
            key: 'new',
          },
        })
        expect(log.s.lastCall.args).to.deep.equal([
          `Profile ${chk.cyan('profileName')} successfully updated!`,
          2,
        ])
      })
    })

    it('should write the global profiles if name passed via options', () => {
      getScopedProfiles.returns({
        profiles: {
          oldProfileName: {},
          profileName: {
            key: 'old',
          },
        },
        scope: 'global',
      })
      updateProfileInquiry.returns({ key: 'new' })

      return cmd.updateProfile('profileName').then(() => {
        expect(writeGlobalProfiles.lastCall.args[0]).to.deep.equal({
          oldProfileName: {},
          profileName: {
            key: 'new',
          },
        })
        expect(log.s.lastCall.args).to.deep.equal([
          `Profile ${chk.cyan('profileName')} successfully updated!`,
          2,
        ])
      })
    })

    it('should throw an error if the profile name passed via options does not exist', () => {
      getScopedProfiles.returns({
        profiles: {
          oldProfileName: {},
          profileName: {
            key: 'old',
          },
        },
        scope: 'global',
      })

      return cmd.updateProfile('missing').catch((e) => {
        expect(e.message).to.equal('Profile missing does not exist!')
      })
    })
  })

  describe('#updateProfileInquiry', () => {
    it('should return a prompt to fill in the new profile updates', () => {
      const profile = {
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
      }
      const name = 'profileName'

      return cmd.updateProfileInquiry(profile, name).then(() => {
        expect(inqPrompt.called).to.be.true
      })
    })
  })
})
