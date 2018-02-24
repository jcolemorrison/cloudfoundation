const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const inq = require('inquirer')
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
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    getScopedProfiles.restore()
    getScopedProfiles.restore()
    importAWSProfile.restore()
    setupCFDNProfile.restore()
    writeGlobalProfiles.restore()
    writeLocalProfiles.restore()
  })

  it('should write the new profile to local profiles')
  it('should write the new profile to global profiles')
})
