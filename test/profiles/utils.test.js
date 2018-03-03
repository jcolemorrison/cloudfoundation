const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const fs = require('fs-extra')
const os = require('os')
const chk = require('chalk')
const utils = require('../../src/utils')
const awsUtils = require('../../src/utils/aws.js')

const profileUtils = require('../../src/profiles/utils.js')

describe('Profile Utility Functions', () => {
  let homedir
  let log

  beforeEach(() => {
    homedir = sinon.stub(os, 'homedir')
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
  })

  afterEach(() => {
    homedir.restore()
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
  })

  describe('#hasGlobalProfiles', () => {
    let existsSync

    beforeEach(() => {
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      existsSync.restore()
    })

    it('should return if the profiles.json file exists with no homedir passed', () => {
      existsSync.returns(true)
      const exists = profileUtils.hasGlobalProfiles()
      expect(exists).to.be.true
    })
    it('should return if the profiles.json file exists with no homedir passed', () => {
      existsSync.returns(true)
      const exists = profileUtils.hasGlobalProfiles('home')
      expect(exists).to.be.true
    })
  })

  describe('#getGlobalProfiles', () => {
    let hasGlobalProfiles
    let readJsonSync
    let ensureDirSync

    beforeEach(() => {
      hasGlobalProfiles = sinon.stub(profileUtils, 'hasGlobalProfiles')
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      ensureDirSync = sinon.stub(fs, 'ensureDirSync')
    })

    afterEach(() => {
      hasGlobalProfiles.restore()
      readJsonSync.restore()
      ensureDirSync.restore()
    })

    it('should return the profiles if no homedir is passed and the .cfdn directory has not been created', () => {
      hasGlobalProfiles.returns(false)

      const profiles = profileUtils.getGlobalProfiles()

      expect(profiles).to.deep.equal({})
    })

    it('should return the profiles if a homedir is passed and the .cfdn directory exists with profiles', () => {
      hasGlobalProfiles.returns(true)
      readJsonSync.returns({})

      const profiles = profileUtils.getGlobalProfiles('home')

      expect(profiles).to.deep.equal({})
    })
  })

  describe('#getLocalProfiles', () => {
    let readJsonSync
    let existsSync

    beforeEach(() => {
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      readJsonSync.restore()
      existsSync.restore()
    })

    it('should throw an error if not in a CFDN project and no cwd is passed', () => {
      existsSync.returns(false)
      const result = () => { profileUtils.getLocalProfiles() }
      expect(result).to.throw().with.property('message', 'No local .cfdnrc file found!  Make sure you\'re in a valid project directory.')
    })

    it('should return the profiles if they exist if a cwd is passed', () => {
      existsSync.returns(true)
      readJsonSync.returns({})
      expect(profileUtils.getLocalProfiles('cwd')).to.deep.equal({})
    })
  })

  describe('#getScopedProfiles', () => {
    let getGlobalProfiles
    let getLocalProfiles
    let inqPrompt

    beforeEach(() => {
      getGlobalProfiles = sinon.stub(profileUtils, 'getGlobalProfiles')
      getLocalProfiles = sinon.stub(profileUtils, 'getLocalProfiles')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      getGlobalProfiles.restore()
      getLocalProfiles.restore()
      inqPrompt.restore()
    })

    it('should return both the scope and profiles if neither global, local, or action options are passed and global is selected', () => {
      inqPrompt.returns({ type: 'global' })
      getGlobalProfiles.returns({ global: 'profiles' })

      return profileUtils.getScopedProfiles().then(({ scope, profiles }) => {
        expect(scope).to.equal('global')
        expect(profiles).to.deep.equal({ global: 'profiles' })
      })
    })

    it('should return both the scope and profiles if neither global, local, or action options are passed and local is selected', () => {
      inqPrompt.returns({ type: 'local' })
      getLocalProfiles.returns({ local: 'profiles' })

      return profileUtils.getScopedProfiles().then(({ scope, profiles }) => {
        expect(scope).to.equal('local')
        expect(profiles).to.deep.equal({ local: 'profiles' })
      })
    })

    it('should return both the scope and profiles if the global option is passed and and an action is passed', () => {
      getGlobalProfiles.returns({ global: 'profiles' })

      return profileUtils.getScopedProfiles(true, false, 'make').then(({ scope, profiles }) => {
        expect(scope).to.equal('global')
        expect(profiles).to.deep.equal({ global: 'profiles' })
      })
    })

    it('should return both the scope and profiles if the local option is passed and and an action is passed', () => {
      getLocalProfiles.returns({ local: 'profiles' })

      return profileUtils.getScopedProfiles(false, true, 'make').then(({ scope, profiles }) => {
        expect(scope).to.equal('local')
        expect(profiles).to.deep.equal({ local: 'profiles' })
      })
    })

    it('should throw an error if both global and local options are passed', () => (
      profileUtils.getScopedProfiles(true, true).catch((e) => {
        expect(e.message).to.equal(`Select one of either ${chk.cyan('-g|--global')} or ${chk.cyan('-l|--local')} only.`)
      })
    ))
  })


  describe('#importAWSProfile', () => {
    let getAWSProfiles
    let inqPrompt

    beforeEach(() => {
      getAWSProfiles = sinon.stub(awsUtils, 'getAWSProfiles')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      getAWSProfiles.restore()
      inqPrompt.restore()
    })

    it('should return the selected AWS Profile if there are existing profiles, no name is passed, and it has not already been imported', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      getAWSProfiles.returns({
        one: { profile: 'one' },
        two: { profile: 'two' },
        three: { profile: 'three' },
      })
      inqPrompt.returns({ use: 'three' })

      return profileUtils.importAWSProfile(false, existing).then((p) => {
        expect(p).to.deep.equal({
          three: { profile: 'three' },
        })
      })
    })

    it('should return the selected AWS Profile if there are existing profiles, a name is passed, and it has not already been imported', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      getAWSProfiles.returns({
        one: { profile: 'one' },
        two: { profile: 'two' },
        three: { profile: 'three' },
      })
      inqPrompt.returns({ use: 'three' })

      return profileUtils.importAWSProfile('three', existing).then((p) => {
        expect(p).to.deep.equal({
          three: { profile: 'three' },
        })
      })
    })

    it('should throw an error if the existing profiles already includes the selected profile', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      getAWSProfiles.returns({
        one: { profile: 'one' },
        two: { profile: 'two' },
      })

      return profileUtils.importAWSProfile('two', existing).catch((e) => {
        expect(e.message).to.equal(`Profile ${chk.cyan('two')} already exists!`)
      })
    })

    it('should throw an error if a non-existing profile name is passed', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      getAWSProfiles.returns({
        one: { profile: 'one' },
        two: { profile: 'two' },
      })

      return profileUtils.importAWSProfile('three', existing).catch((e) => {
        expect(e.message).to.equal(`Profile ${chk.cyan('three')} does not exist!`)
      })
    })
  })


  describe('#setupCFDNProfile', () => {
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return a fully built CFDN profile if no name is passed and it does not already exist', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      inqPrompt.returns({
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
        name: 'three',
      })

      return profileUtils.setupCFDNProfile(false, existing).then((d) => {
        expect(d).to.deep.equal({
          three: {
            aws_access_key_id: 'abcd',
            aws_secret_access_key: 'efgh',
            region: 'us-east-1',
          },
        })
      })
    })

    it('should return a fully built CFDN profile if a name is passed and it does not already exist', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      inqPrompt.returns({
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
      })

      return profileUtils.setupCFDNProfile('three', existing).then((d) => {
        expect(d).to.deep.equal({
          three: {
            aws_access_key_id: 'abcd',
            aws_secret_access_key: 'efgh',
            region: 'us-east-1',
          },
        })
      })
    })

    it('should throw an errorif a name is passed but it already exists', () => {
      const existing = {
        one: { profile: 'one' },
        two: { profile: 'two' },
      }
      inqPrompt.returns({
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
      })

      return profileUtils.setupCFDNProfile('one', existing).catch((e) => {
        expect(e.message).to.equal(`${chk.cyan('one')} already exists!`)
      })
    })
  })

  describe('#writeGlobalProfiles', () => {
    let ensureDirSync
    let writeJsonSync

    beforeEach(() => {
      ensureDirSync = sinon.stub(fs, 'ensureDirSync')
      writeJsonSync = sinon.stub(fs, 'writeJsonSync')
    })

    afterEach(() => {
      ensureDirSync.restore()
      writeJsonSync.restore()
    })

    it('should write to the global profiles file if no home is passed', () => {
      profileUtils.writeGlobalProfiles()
      expect(homedir.called).to.be.true
      expect(ensureDirSync.called).to.be.true
      expect(writeJsonSync.called).to.be.true
    })
  })

  describe('#writeLocalProfiles', () => {
    let readJsonSync
    let writeJsonSync

    beforeEach(() => {
      readJsonSync = sinon.stub(fs, 'readJsonSync')
      writeJsonSync = sinon.stub(fs, 'writeJsonSync')
    })

    afterEach(() => {
      readJsonSync.restore()
      writeJsonSync.restore()
    })

    it('should write to the global profiles file if no home is passed', () => {
      readJsonSync.returns({ profiles: {} })

      profileUtils.writeLocalProfiles({})

      expect(readJsonSync.called).to.be.true
      expect(writeJsonSync.called).to.be.true
    })
  })

  describe('#selectProfile', () => {
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return the selected profile with the name added as a key', () => {
      const profiles = {
        testProfile: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
        otherProfile: {
          aws_access_key_id: 'qwerjlj',
          aws_secret_access_key: 'vbnm',
          region: 'us-east-2',
        },
      }
      inqPrompt.returns({ choice: 'testProfile' })

      return profileUtils.selectProfile(profiles, 'choose profile').then((d) => {
        expect(d).to.deep.equal({
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
          name: 'testProfile',
        })
      })
    })

    it('should return the selected profile with the name added as a key if no message is passed', () => {
      const profiles = {
        testProfile: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
        otherProfile: {
          aws_access_key_id: 'qwerjlj',
          aws_secret_access_key: 'vbnm',
          region: 'us-east-2',
        },
      }
      inqPrompt.returns({ choice: 'testProfile' })

      return profileUtils.selectProfile(profiles).then((d) => {
        expect(d).to.deep.equal({
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
          name: 'testProfile',
        })
      })
    })
  })


  describe('#getFromAllProfiles', () => {
    let getGlobalProfiles
    let getLocalProfiles

    beforeEach(() => {
      getGlobalProfiles = sinon.stub(profileUtils, 'getGlobalProfiles')
      getLocalProfiles = sinon.stub(profileUtils, 'getLocalProfiles')
    })

    afterEach(() => {
      getGlobalProfiles.restore()
      getLocalProfiles.restore()
    })

    it('should return a local profile with its name as a key', () => {
      getLocalProfiles.returns({
        testProfile: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
      })
      getGlobalProfiles.returns({})

      const profile = profileUtils.getFromAllProfiles('testProfile')

      expect(profile).to.deep.equal({
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
        name: 'testProfile',
      })
    })

    it('should return a global profile with its name as a key', () => {
      getLocalProfiles.returns({})
      getGlobalProfiles.returns({
        testProfile: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
      })

      const profile = profileUtils.getFromAllProfiles('testProfile')

      expect(profile).to.deep.equal({
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
        name: 'testProfile',
      })
    })

    it('throw an error if the profile is not found', () => {
      getLocalProfiles.returns({})
      getGlobalProfiles.returns({})

      const result = () => { profileUtils.getFromAllProfiles('testProfile') }

      expect(result).to.throw().with.property('message', `Profile ${chk.cyan('testProfile')} not found!`)
    })
  })

  describe('#selectFromAllProfiles', () => {
    const localProfiles = {
      localOne: {
        aws_access_key_id: 'abc',
        aws_secret_access_key: 'def',
        region: 'us-east-1',
      },
      localTwo: {
        aws_access_key_id: 'abc',
        aws_secret_access_key: 'def',
        region: 'us-east-2',
      },
    }

    const globalProfiles = {
      globalOne: {
        aws_access_key_id: 'abc',
        aws_secret_access_key: 'def',
        region: 'us-west-1',
      },
      globalTwo: {
        aws_access_key_id: 'abc',
        aws_secret_access_key: 'def',
        region: 'us-west-2',
      },
    }

    let getGlobalProfiles
    let getLocalProfiles
    let inqPrompt

    beforeEach(() => {
      getGlobalProfiles = sinon.stub(profileUtils, 'getGlobalProfiles')
      getLocalProfiles = sinon.stub(profileUtils, 'getLocalProfiles')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      getGlobalProfiles.restore()
      getLocalProfiles.restore()
      inqPrompt.restore()
    })

    it('should return a selected profile if both valid global and local profiles exist', () => {
      getLocalProfiles.returns(localProfiles)
      getGlobalProfiles.returns(globalProfiles)
      inqPrompt.returns({ use: 'localOne' })

      return profileUtils.selectFromAllProfiles().then((d) => {
        expect(d).to.equal('localOne')
      })
    })

    it('should return a selected profile if only valid global profiles exist', () => {
      getLocalProfiles.returns({})
      getGlobalProfiles.returns(globalProfiles)
      inqPrompt.returns({ use: 'globalOne' })

      return profileUtils.selectFromAllProfiles().then((d) => {
        expect(d).to.equal('globalOne')
      })
    })

    it('should return a selected profile if only valid local profiles exist', () => {
      getLocalProfiles.returns(localProfiles)
      getGlobalProfiles.returns({})
      inqPrompt.returns({ use: 'localOne' })

      return profileUtils.selectFromAllProfiles().then((d) => {
        expect(d).to.equal('localOne')
      })
    })

    it('should throw an error if neither local or global profiles exist', () => {
      getLocalProfiles.returns({})
      getGlobalProfiles.returns({})

      return profileUtils.selectFromAllProfiles().catch((e) => {
        expect(e.message).to.equal('No CFDN Profiles set up.')
      })
    })
  })
})
