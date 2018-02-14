const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const ut = require('../../src/utils')
const fs = require('fs-extra')
const inq = require('inquirer')
const glob = require('glob')
const cmd = require('../../src/build')

describe('Build Template Functions', () => {
  let log

  beforeEach(() => {
    log = {
      p: sinon.stub(ut.log, 'p'),
      e: sinon.stub(ut.log, 'e'),
      s: sinon.stub(ut.log, 's'),
      i: sinon.stub(ut.log, 'i'),
      m: sinon.stub(ut.log, 'm'),
    }
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
  })

  describe('#buildTemplate', () => {
    let getTemplateAsObject
    let ensureDirSync
    let writeFileSync

    beforeEach(() => {
      getTemplateAsObject = sinon.stub(ut, 'getTemplateAsObject')
      ensureDirSync = sinon.stub(fs, 'ensureDirSync')
      writeFileSync = sinon.stub(fs, 'writeFileSync')
    })

    afterEach(() => {
      getTemplateAsObject.restore()
      ensureDirSync.restore()
      writeFileSync.restore()
    })

    it('should write the full and minified json files', () => {
      getTemplateAsObject.returns({ test: 'template' })

      cmd.buildTemplate('main')

      expect(getTemplateAsObject.calledWith('main')).to.be.true

      expect(ensureDirSync.called).to.be.true

      // write full json file
      expect(writeFileSync.firstCall.args[0].includes('main.json')).to.be.true
      expect(writeFileSync.firstCall.args[1]).to.equal(JSON.stringify({ test: 'template' }, null, '  '))
      expect(writeFileSync.firstCall.args[2]).to.equal('utf8')

      // write minified json file
      expect(writeFileSync.lastCall.args[0].includes('main.min.json')).to.be.true
      expect(writeFileSync.lastCall.args[1]).to.equal(JSON.stringify({ test: 'template' }))
      expect(writeFileSync.lastCall.args[2]).to.equal('utf8')
    })
  })

  describe('#build', () => {
    let buildTemplate
    let inquireTemplateName

    beforeEach(() => {
      buildTemplate = sinon.stub(cmd, 'buildTemplate')
      inquireTemplateName = sinon.stub(ut, 'inquireTemplateName')
    })

    afterEach(() => {
      buildTemplate.restore()
      inquireTemplateName.restore()
    })

    it('should return a success log statement after building the template', () => (
      cmd.build('test').then(() => {
        expect(buildTemplate.calledWith('test')).to.be.true
        expect(log.s.lastCall.args).to.deep.equal([
          `Template ${chk.cyan('test.json')} and ${chk.cyan('test.min.json')} built in ${chk.cyan('./dist')}!`,
          2,
        ])
      })
    ))

    it('should call to the inquireTemplateName helper if no template name is passed', () => {
      inquireTemplateName.returns('test')

      return cmd.build().then(() => {
        expect(inquireTemplateName.firstCall.args[0]).to.equal('Which template would you like to build?')
        expect(buildTemplate.calledWith('test')).to.be.true
        expect(log.s.lastCall.args).to.deep.equal([
          `Template ${chk.cyan('test.json')} and ${chk.cyan('test.min.json')} built in ${chk.cyan('./dist')}!`,
          2,
        ])
      })
    })
  })

  describe('#buildAll', () => {
    let buildTemplate
    let globSync

    beforeEach(() => {
      buildTemplate = sinon.stub(cmd, 'buildTemplate')
      globSync = sinon.stub(glob, 'sync')
    })

    afterEach(() => {
      buildTemplate.restore()
      globSync.restore()
    })

    it('should return an info message on successful template builds', () => {
      globSync.returns([
        '/Users/test/project/src/first',
        '/Users/test/project/src/second',
        '/Users/test/project/src/third',
      ])

      return cmd.buildAll().then(() => {
        expect(buildTemplate.firstCall.args[0]).to.equal('first')
        expect(buildTemplate.secondCall.args[0]).to.equal('second')
        expect(buildTemplate.thirdCall.args[0]).to.equal('third')

        expect(log.m.firstCall.args[0]).to.equal(`${chk.cyan('first.json')} and ${chk.cyan('first.min.json')}`)
        expect(log.m.secondCall.args[0]).to.equal(`${chk.cyan('second.json')} and ${chk.cyan('second.min.json')}`)
        expect(log.m.thirdCall.args[0]).to.equal(`${chk.cyan('third.json')} and ${chk.cyan('third.min.json')}`)

        expect(log.i.lastCall.args).to.deep.equal([
          `Find the built templates in ${chk.cyan('./dist')}`,
          2,
        ])
      })
    })
  })
})
