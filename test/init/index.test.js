0onst expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const chk = require('chalk')
const inq = require('inquirer')
const initialize = require('../../src/init')
const utils = require('../../src/utils')
const addProfileCmd = require('../../src/profiles/add.js')

const { cyan } = chk

describe('Init Function', () => {
  const cwd = process.cwd()
  let readdir
  let inqPrompt
  let writeJsonSync
  let ensureDirSync
  let copySync
  let addProfile
  let existsSync
  let log

  beforeEach(() => {
    readdir = sinon.stub(fs, 'readdir')
    inqPrompt = sinon.stub(inq, 'prompt')
    writeJsonSync = sinon.stub(fs, 'writeJsonSync')
    ensureDirSync = sinon.stub(fs, 'ensureDirSync')
    copySync = sinon.stub(fs, 'copySync')
    existsSync = sinon.stub(fs, 'existsSync')
    addProfile = sinon.stub(addProfileCmd, 'addProfile')
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
  })

  afterEach(() => {
    readdir.restore()
    inqPrompt.restore()
    writeJsonSync.restore()
    ensureDirSync.restore()
    copySync.restore()
    existsSync.restore()
    addProfile.restore()
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
  })

  it('should log a success message after initialization with all extra options', () => {
    readdir.returns([])
    inqPrompt.onCall(0).returns({ name: 'test-project' })
    inqPrompt.onCall(1).returns({ use: true })
    inqPrompt.onCall(2).returns({ use: true })
    existsSync.returns(true)

    return initialize().then(() => {
      // Read directory
      expect(readdir.called).to.be.true

      // Project name prompt
      const projectInq = inqPrompt.getCall(0).args[0]

      expect(projectInq.type).to.equal('input')
      expect(projectInq.name).to.equal('name')
      expect(projectInq.message).to.equal('What is the name of your new project?')
      expect(projectInq.default).to.equal('cloudfoundation-project')

      // Project name validate fn
      expect(projectInq.validate('cloudfoundation-project')).to.equal(true)
      expect(projectInq.validate('Cloud Foundation Project')).to.equal('Invalid Project Name Format - must follow NPM package naming conventions')

      // Using pre-defined VPC
      expect(inqPrompt.getCall(1).args[0]).to.deep.equal({
        type: 'confirm',
        name: 'use',
        message: 'Would you like a production VPC template included?',
        default: true,
      })

      // Using pre-defined DB
      expect(inqPrompt.getCall(2).args[0]).to.deep.equal({
        type: 'confirm',
        name: 'use',
        message: 'Would you like an encrypted, multi-AZ RDS Aurora Database template included?',
        default: true,
      })

      // Package JSON
      expect(writeJsonSync.getCall(0).args).to.deep.equal([
        `${cwd}/package.json`,
        {
          name: 'test-project',
          version: '0.1.0',
          description: 'A CloudFormation project - generated with CloudFoundation',
          cloudfoundation: true,
        },
        { spaces: 2, errorOnExist: true },
      ])

      // Base Project
      expect(ensureDirSync.getCall(0).args[0].includes('/src')).to.be.true

      // README
      expect(copySync.getCall(0).args[0].includes('/base/README.md')).to.be.true
      expect(copySync.getCall(0).args[1]).to.equal(`${cwd}/README.md`)
      expect(copySync.getCall(0).args[2]).to.deep.equal({ errorOnExist: true })

      // .gitignore
      expect(copySync.getCall(1).args[0].includes('/base/gitignore')).to.be.true
      expect(copySync.getCall(1).args[1]).to.equal(`${cwd}/.gitignore`)
      expect(copySync.getCall(1).args[2]).to.deep.equal({ errorOnExist: true })

      // use vpc
      expect(copySync.getCall(2).args[0].includes('/vpc')).to.be.true
      expect(copySync.getCall(2).args[1]).to.equal(`${cwd}/src/vpc`)
      expect(copySync.getCall(2).args[2]).to.deep.equal({ errorOnExist: true })

      // use db
      expect(copySync.getCall(3).args[0].includes('/db')).to.be.true
      expect(copySync.getCall(3).args[1]).to.equal(`${cwd}/src/db`)
      expect(copySync.getCall(3).args[2]).to.deep.equal({ errorOnExist: true })

      expect(writeJsonSync.getCall(1).args).to.deep.equal([
        `${cwd}/.cfdnrc`,
        { project: 'test-project' },
        { spaces: 2, errorOnExist: true },
      ])

      expect(addProfile.called).to.be.true

      expect(log.i.lastCall.args).to.deep.equal([
        `For more information and commands run ${cyan('cfdn --help')} or visit url`,
        3,
      ])
    })
  })

  it('should inform the user of profiles on very first init', () => {
    readdir.returns([])
    inqPrompt.onCall(0).returns({ name: 'test-project' })
    inqPrompt.onCall(1).returns({ use: true })
    inqPrompt.onCall(2).returns({ use: true })
    existsSync.returns(false)

    return initialize().then(() => {
      expect(log.i.getCall(1).args[0]).to.equal(`To ${cyan('validate')}, ${cyan('deploy')}, ${cyan('update')}, and ${cyan('describe')} stacks with ${cyan('cfdn')}, AWS Credentials (Profiles) are needed:`)
    })
  })

  it('should skip the DB template if not selected', () => {
    readdir.returns([])
    inqPrompt.onCall(0).returns({ name: 'test-project' })
    inqPrompt.onCall(1).returns({ use: true })
    inqPrompt.onCall(2).returns({ use: false })
    existsSync.returns(true)

    return initialize().then(() => {
      expect(copySync.getCall(4)).to.equal(null)
    })
  })

  it('should skip the VPC and DB template if not selected', () => {
    readdir.returns([])
    inqPrompt.onCall(0).returns({ name: 'test-project' })
    inqPrompt.onCall(1).returns({ use: false })
    existsSync.returns(true)

    return initialize().then(() => {
      expect(copySync.getCall(3)).to.equal(null)
      expect(copySync.getCall(4)).to.equal(null)
    })
  })

  it('should return an error message if the directory is not empty', () => {
    readdir.returns([1])

    return initialize().then(() => {
      expect(log.e.getCall(0).args[0]).to.equal(`${chk.cyan('cfdn init')} should be used in an empty project directory`)
    })
  })
})
