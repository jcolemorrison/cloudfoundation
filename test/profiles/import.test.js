const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const utils = require('../../src/utils')
const profileUtils = require('../../src/profiles/utils.js')
const awsUtils = require('../../src/utils/aws.js')

const cmd = require('../../src/profiles/import.js')

describe('Profile Import AWS Function', () => {
  let log
  let inqPrompt
  let getScopedProfiles
  let getAWSProfiles
  let writeGlobalProfiles

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }

    inqPrompt = sinon.stub(inq, 'prompt')
    getScopedProfiles = sinon.stub(profileUtils, 'getScopedProfiles')
    getAWSProfiles = sinon.stub(awsUtils, 'getAWSProfiles')
    writeGlobalProfiles = sinon.stub(profileUtils, 'writeGlobalProfiles')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    inqPrompt.restore()
    getScopedProfiles.restore()
    getAWSProfiles.restore()
    writeGlobalProfiles.restore()
  })

  it('should return a success message after writing the AWS profiles globally', () => {
    inqPrompt.returns({ use: true })
    getScopedProfiles.returns({ profiles: {} })
    getAWSProfiles.returns({ awsProfiles: {} })

    return cmd().then(() => {
      expect(log.s.lastCall.args).to.deep.equal([
        'Profiles successfully imported!',
        2,
      ])
    })
  })

  it('should cancel if the user does not want to import the AWS Profiles', () => {
    inqPrompt.returns({ use: false })

    return cmd().then((d) => {
      expect(d).to.be.false
    })
  })
})
