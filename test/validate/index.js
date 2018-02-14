const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const jshint = require('jshint')

const profileUtils = require('../../src/profiles/utils')
const awsUtils = require('../../src/utils/aws.js')
const utils = require('../../src/utils')

describe('Validate Function', () => {
  let log

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()
  })

  it('should fully validate the template and log an information message', () => {
    return validate(env, opts).then(() => {
      expect(getTemplateAsObject.calledWith('test')).to.be.true
      expect(cfnValidateTemplate.getCall(0).args[0]).to.deep.equal({
        TemplateBody: JSON.stringify({ test: 'template' }),
      })
      expect(log.s.lastCall.args[0]).to.equal('No CloudFormation Template Errors found!')
      expect(log.i.lastCall.args).to.deep.equal([
        'Reminder - the validate-template API will not catch every error.  Some can only be found by deploying the full template.',
        2,
      ])
    })
  })
})
