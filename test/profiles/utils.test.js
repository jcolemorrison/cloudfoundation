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

  beforeEach(() => {
    homedir = sinon.stub(os, 'homedir')
  })

  afterEach(() => {
    homedir.restore()
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
})
