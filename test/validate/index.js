const expect = require('chai').expect
const sinon = require('sinon')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const jshint = require('jshint')

const profileUtils = require('../../src/profiles/utils')
const awsUtils = require('../../src/utils/aws.js')
const utils = require('../../src/utils')

const cmd = require('../../src/validate')

describe('Validate Functions', () => {
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

  describe('#validate', () => {
    let inquireTemplateName
    let checkValidTemplate
    let selectFromAllProfiles
    let getFromAllProfiles
    let configAWS
    let getTemplateFiles
    let validateTemplateFilesJSON
    let getTemplateAsObject
    let cfnValidateTemplate

    beforeEach(() => {
      inquireTemplateName = sinon.stub(utils, 'inquireTemplateName')
      checkValidTemplate = sinon.stub(utils, 'checkValidTemplate')
      selectFromAllProfiles = sinon.stub(profileUtils, 'selectFromAllProfiles')
      getFromAllProfiles = sinon.stub(profileUtils, 'getFromAllProfiles')
      configAWS = sinon.stub(awsUtils, 'configAWS')
      getTemplateFiles = sinon.stub(utils, 'getTemplateFiles')
      validateTemplateFilesJSON = sinon.stub(cmd, 'validateTemplateFilesJSON')
      getTemplateAsObject = sinon.stub(utils, 'getTemplateAsObject')
      cfnValidateTemplate = sinon.stub()
    })

    afterEach(() => {
      inquireTemplateName.restore()
      checkValidTemplate.restore()
      selectFromAllProfiles.restore()
      getFromAllProfiles.restore()
      configAWS.restore()
      getTemplateFiles.restore()
      validateTemplateFilesJSON.restore()
      getTemplateAsObject.restore()
    })

    it('should fully validate the template and log an information message', () => {
      const env = 'test'
      const opts = { profile: 'TestProfile' }

      getFromAllProfiles.returns('TestProfile')
      cfnValidateTemplate.returns({ promise: sinon.stub() })
      configAWS.returns({
        CloudFormation: sinon.stub().returns({
          validateTemplate: cfnValidateTemplate,
        }),
      })
      getTemplateFiles.returns([
        '/Users/test/project/src/test/one.json',
        '/Users/test/project/src/test/two.json',
        '/Users/test/project/src/test/three.json',
      ])
      validateTemplateFilesJSON.returns([])
      getTemplateAsObject.returns({ test: 'template' })


      return cmd.validate(env, opts).then(() => {
        expect(checkValidTemplate.calledWith('test')).to.be.true
        expect(getFromAllProfiles.calledWith('TestProfile')).to.be.true
        expect(configAWS.calledWith('TestProfile')).to.be.true
        expect(getTemplateFiles.calledWith('test')).to.be.true
        expect(validateTemplateFilesJSON.getCall(0).args[0]).to.deep.equal([
          '/Users/test/project/src/test/one.json',
          '/Users/test/project/src/test/two.json',
          '/Users/test/project/src/test/three.json',
        ])
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

    it('should fully validate the template and without a profile and template name passed up', () => {
      const env = null
      const opts = {}

      inquireTemplateName.returns('test')
      selectFromAllProfiles.returns('TestProfile')
      cfnValidateTemplate.returns({ promise: sinon.stub() })
      configAWS.returns({
        CloudFormation: sinon.stub().returns({
          validateTemplate: cfnValidateTemplate,
        }),
      })
      getTemplateFiles.returns([
        '/Users/test/project/src/test/one.json',
        '/Users/test/project/src/test/two.json',
        '/Users/test/project/src/test/three.json',
      ])
      validateTemplateFilesJSON.returns([])
      getTemplateAsObject.returns({ test: 'template' })


      return cmd.validate(env, opts).then(() => {
        expect(inquireTemplateName.called).to.be.true
        expect(selectFromAllProfiles.called).to.be.true
      })
    })

    it('should log all errors and a final error message if any json errors occur', () => {
      const env = null
      const opts = {}

      inquireTemplateName.returns('test')
      selectFromAllProfiles.returns('TestProfile')
      cfnValidateTemplate.returns({ promise: sinon.stub() })
      configAWS.returns({
        CloudFormation: sinon.stub().returns({
          validateTemplate: cfnValidateTemplate,
        }),
      })
      getTemplateFiles.returns([
        '/Users/test/project/src/test/one.json',
        '/Users/test/project/src/test/two.json',
        '/Users/test/project/src/test/three.json',
      ])
      validateTemplateFilesJSON.returns([
        {
          file: '/Users/test/project/src/test/one.json',
          errors: [
            { line: 1, reason: 'test' },
            { line: 2, reason: 'test' },
          ],
        },
        {
          file: '/Users/test/project/src/test/two.json',
          errors: [
            { line: 1, reason: 'test' },
          ],
        },
        {
          file: '/Users/test/project/src/test/three.json',
          errors: [
            { line: 1, reason: 'test' },
            { line: 2, reason: 'test' },
            { line: 3, reason: 'test' },
          ],
        },
      ])
      getTemplateAsObject.returns({ test: 'template' })


      return cmd.validate(env, opts).then(() => {
        expect(log.e.lastCall.args).to.deep.equal([
          '6 syntax errors found across 3 files.  Please fix before continuing.',
          3,
        ])
      })
    })
  })

  describe('#validateTemplateFilesJSON', () => {
    let validateTemplateFileJSON
    let globSync
    let getCfnPropType
    let lstatSync
    let isDirectory

    beforeEach(() => {
      validateTemplateFileJSON = sinon.stub(cmd, 'validateTemplateFileJSON')
      globSync = sinon.stub(glob, 'sync')
      getCfnPropType = sinon.stub(utils, 'getCfnPropType')
      lstatSync = sinon.stub(fs, 'lstatSync')
      isDirectory = sinon.stub()
    })

    afterEach(() => {
      validateTemplateFileJSON.restore()
      globSync.restore()
      getCfnPropType.restore()
      lstatSync.restore()
    })

    it('should return an array of json errors', () => {
      const templateFiles = [
        '/Users/test/project/src/test/description.json',
        '/Users/test/project/src/test/metadata.json',
        '/Users/test/project/src/test/ec2/',
      ]
      const ec2Files = [
        '/Users/test/project/src/test/ec2/instance.json',
        '/Users/test/project/src/test/ec2/loadbalancer.json',
      ]

      isDirectory.onCall(0).returns(false)
      isDirectory.onCall(1).returns(false)
      isDirectory.onCall(2).returns(true)
      lstatSync.returns({ isDirectory })
      validateTemplateFileJSON.returns(['error'])
      globSync.returns(ec2Files)

      const result = cmd.validateTemplateFilesJSON(templateFiles)

      expect(result.length).to.equal(4)
      expect(result).to.deep.equal([
        'error',
        'error',
        'error',
        'error',
      ])
    })

    it('should throw an error if Description is a directory', () => {
      const templateFiles = [
        '/Users/test/project/src/test/description',
      ]

      isDirectory.onCall(0).returns(true)
      lstatSync.returns({ isDirectory })
      getCfnPropType.returns('Description')


      const result = () => cmd.validateTemplateFilesJSON(templateFiles)

      expect(result).to.throw().with.property('message', 'Description should be in "description.json" with one property "Description" and with a string value.')
    })
  })

  describe('#validateTemplateFileJSON', () => {
    const originalHint = jshint.JSHINT
    let resolvePath
    let readFileSync

    beforeEach(() => {
      resolvePath = sinon.stub(path, 'resolve').returns('/resolved/path/')
      readFileSync = sinon.stub(fs, 'readFileSync').returns({ test: 'json' })
    })

    afterEach(() => {
      resolvePath.restore()
      readFileSync.restore()
      jshint.JSHINT = originalHint
    })

    it('should return any errors found by JSHINT', () => {
      jshint.JSHINT = function errors () { this.JSHINT.errors = ['error'] }

      const result = cmd.validateTemplateFileJSON('testfile.json')

      expect(result).to.deep.equal([
        {
          errors: ['error'],
          file: 'testfile.json',
        },
      ])
    })

    it('should not return errors if none found by JSHINT', () => {
      jshint.JSHINT = function errors () { this.JSHINT.errors = [] }

      const result = cmd.validateTemplateFileJSON('testfile.json')

      expect(result).to.deep.equal([])
    })
  })
})
