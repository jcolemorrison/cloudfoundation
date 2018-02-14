const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const utils = require('../../src/utils')
const fs = require('fs-extra')
const inq = require('inquirer')
const create = require('../../src/create')

describe('Create Template Function', () => {
  let log
  let inqPrompt
  let existsSync
  let copySync
  let writeJsonSync

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
    inqPrompt = sinon.stub(inq, 'prompt')
    existsSync = sinon.stub(fs, 'existsSync')
    copySync = sinon.stub(fs, 'copySync')
    writeJsonSync = sinon.stub(fs, 'writeJsonSync')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
    inqPrompt.restore()
    existsSync.restore()
    copySync.restore()
    writeJsonSync.restore()
  })

  it('should return a success message after new template is created without template name option', () => {
    inqPrompt.returns({ templatename: 'main' })
    existsSync.returns(false)

    return create().then(() => {
      expect(log.p.called).to.be.true
      expect(inqPrompt.getCall(0).args[0]).to.deep.equal({
        type: 'input',
        name: 'templatename',
        message: 'What is the name of your new template?',
        default: 'main',
      })

      const copyTpl = copySync.getCall(0).args

      expect(copyTpl[0].includes('/../tpls/new')).to.be.true
      expect(copyTpl[1].includes('/src/main')).to.be.true
      expect(copyTpl[2]).to.deep.equal({ errorOnExist: true })

      const writeDescription = writeJsonSync.getCall(0).args

      expect(writeDescription[0].includes('description.json')).to.be.true
      expect(writeDescription[1]).to.deep.equal({
        Description: 'main cloudformation template template',
      })
      expect(writeDescription[2]).to.deep.equal({ spaces: 2 })

      expect(log.s.lastCall.args[0]).to.equal(`Template ${chk.cyan('main')} template created!`, 2)
    })
  })

  it('should log an error message if the template already exists', () => {
    inqPrompt.returns({ templatename: 'main' })
    existsSync.returns(true)

    return create().then(() => {
      expect(log.e.getCall(0).args[0]).to.equal(`Template ${chk.cyan('main')} already exists!`)
    })
  })

  it('should not call to the inquirer if a template name option is passed', () => {
    inqPrompt.returns({ templatename: 'main' })
    existsSync.returns(false)

    return create('main').then(() => {
      expect(log.p.called).to.be.false
      expect(inqPrompt.called).to.false
    })
  })
})
