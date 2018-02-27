const expect = require('chai').expect
const sinon = require('sinon')
const os = require('os')
const chk = require('chalk')
const utils = require('../../src/utils')
const profileUtils = require('../../src/profiles/utils.js')

const cmd = require('../../src/profiles/list.js')

describe('List Profile Functions', () => {
  let log
  let osStub

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
    osStub = sinon.stub(os, 'homedir')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
    osStub.restore()
  })

  describe('#listProfiles', () => {
    let hasGlobalProfiles
    let getLocalProfiles
    let getGlobalProfiles
    let listGlobalProfiles
    let listLocalProfiles

    beforeEach(() => {
      hasGlobalProfiles = sinon.stub(profileUtils, 'hasGlobalProfiles')
      getLocalProfiles = sinon.stub(profileUtils, 'getLocalProfiles')
      getGlobalProfiles = sinon.stub(profileUtils, 'getGlobalProfiles')
      listGlobalProfiles = sinon.stub(cmd, 'listGlobalProfiles')
      listLocalProfiles = sinon.stub(cmd, 'listLocalProfiles')
    })

    afterEach(() => {
      hasGlobalProfiles.restore()
      getLocalProfiles.restore()
      getGlobalProfiles.restore()
      listGlobalProfiles.restore()
      listLocalProfiles.restore()
    })

    it('should log local and global and return a help message after successful listing if no options are passed', () => {
      hasGlobalProfiles.returns(true)
      getLocalProfiles.returns({ local: {} })
      getGlobalProfiles.returns({ global: {} })

      return cmd.listProfiles().then(() => {
        expect(log.m.lastCall.args).to.deep.equal([
          `Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`,
        ])
      })
    })

    it('should log only local profiles and return a help message if `--local` option is passed', () => {
      getLocalProfiles.returns({ local: {} })

      return cmd.listProfiles({ local: true }).then(() => {
        expect(log.m.lastCall.args).to.deep.equal([
          `Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`,
        ])
      })
    })

    it('should log only global and return a help message if `--global` option is passed', () => {
      hasGlobalProfiles.returns(true)
      getGlobalProfiles.returns({ global: {} })

      return cmd.listProfiles({ global: true }).then(() => {
        expect(log.m.lastCall.args).to.deep.equal([
          `Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`,
        ])
      })
    })

    it('should return an info message if they choose to log only global profiles but have none', () => {
      hasGlobalProfiles.returns(false)

      return cmd.listProfiles({ global: true }).then(() => {
        expect(log.i.lastCall.args).to.deep.equal([
          `Run ${chk.cyan('cfdn add-profile')} or ${chk.cyan('cfdn import-profiles')}.`,
          3,
        ])
      })
    })
  })

  describe('#listLocalProfiles', () => {
    it('should iterate and log all local profiles given as Object.entries', () => {
      const profiles = {
        profileOne: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
        profileTwo: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
      }
      expect(cmd.listLocalProfiles(Object.entries(profiles))).to.equal(undefined)
    })
  })

  describe('#listGlobalProfiles', () => {
    it('should iterate and log all global profiles given as Object.entries', () => {
      const profiles = {
        profileOne: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
        profileTwo: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
      }
      expect(cmd.listGlobalProfiles(Object.entries(profiles))).to.equal(undefined)
    })
  })
})
