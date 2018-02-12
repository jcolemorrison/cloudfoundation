const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const ut = require('../../src/utils')
const fs = require('fs-extra')
const inq = require('inquirer')
const glob = require('glob')
const build = require('../../src/build')

describe('Build Template Functions', () => {
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

      build.buildTemplate('main')

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
})
