const expect = require('chai').expect
const sinon = require('sinon')
const glob = require('glob')
const chk = require('chalk')
const inq = require('inquirer')
const fs = require('fs-extra')
const utils = require('../../src/utils/index.js')

describe('Utility Functions', () => {
  describe('#log', () => {
    describe('#_b', () => {
      it('should log all different line break cases', () => {
        utils.log._b('test', 0)
        utils.log._b('test', 1)
        utils.log._b('test', 2)
        utils.log._b('test', 3)
        utils.log._b('test')
      })
    })

    describe('#log.e', () => {
      it('should log an error style message', () => {
        utils.log.e('test error', 0)
      })
    })

    describe('#log.s', () => {
      it('should log an success style message', () => {
        utils.log.s('test success', 0)
      })
    })

    describe('#log.i', () => {
      it('should log an info style message', () => {
        utils.log.i('test info', 0)
      })
    })
  })

  describe('#getCfnPropType', () => {
    it('should return the valid CFN Prop with the first letter upper cased', () => {
      expect(utils.getCfnPropType('/path/src/resources')).to.equal('Resources')
    })

    it('should throw an error if no prop is passed', () => {
      const result = () => utils.getCfnPropType()
      expect(result).to.throw().with.property('message', 'a cloudformation property type is required')
    })

    it('should throw an error if an invalid prop is passed', () => {
      const msg = `${chk.red('error')}: "invalid" is not a valid CFN top level template property.\n
Template top level directory must be one of:\n
conditions/ or conditions.json\n
mappings/ or mappings.json\n
metadata/ or metadata.json\n
outputs/ or outputs.json\n
parameters/ or parameters.json\n
resources/ or resources.json\n
and description.json
`
      const result = () => utils.getCfnPropType('invalid')
      expect(result).to.throw().with.property('message', msg)
    })
  })

  describe('#reduceTemplateProps', () => {
    it('should return all json and js files paths', () => {
      utils.reduceTemplateProps(`${__dirname}/../../src/tpls/vpc/outputs/`)
    })
  })

  describe('#getTemplateFiles', () => {
    let existsSync
    let globSync

    beforeEach(() => {
      existsSync = sinon.stub(fs, 'existsSync')
      globSync = sinon.stub(glob, 'sync')
    })

    afterEach(() => {
      existsSync.restore()
      globSync.restore()
    })

    it('should return all files that match the glob', () => {
      existsSync.returns(true)
      globSync.returns('files')

      expect(utils.getTemplateFiles('name')).to.equal('files')
    })

    it('should throw an error if the directory does not exist', () => {
      existsSync.returns(false)

      const result = () => utils.getTemplateFiles('name')

      expect(result).to.throw().with.property('message', `${chk.cyan('name')} not found!`)
    })

    it('should throw an error if no files are found', () => {
      existsSync.returns(true)
      globSync.returns([])

      const result = () => utils.getTemplateFiles('name')

      expect(result).to.throw().with.property('message', `${chk.cyan('name')} has no files in it!`)
    })
  })

  describe('#getTemplateAsObject', () => {
    it('should properly require a valid template directory', () => {
      utils.getTemplateAsObject('db', `${__dirname}/../../src/tpls`)
    })
    it('should throw an error if Description is a directory', () => {
      const result = () => utils.getTemplateAsObject('error', `${__dirname}/tpls`)
      expect(result).to.throw().with.property('message', `${chk.red('error')}: Description should be contained in "description.json" with one property "Description" and with a string value.`)
    })
    it('should throw an error if the template does not exist', () => {
      const existsSync = sinon.stub(fs, 'existsSync').returns(false)
      const result = () => utils.getTemplateAsObject('error')
      expect(result).to.throw().with.property('message', `${chk.cyan('error')} not found!`)
      existsSync.restore()
    })
  })

  describe('#checkValidProject', () => {
    const action = () => ({
      catch: (cb) => { cb('error') },
    })
    let log
    let existsSync

    beforeEach(() => {
      log = {
        p: sinon.stub(utils.log, 'p'),
        e: sinon.stub(utils.log, 'e'),
        s: sinon.stub(utils.log, 's'),
        i: sinon.stub(utils.log, 'i'),
        m: sinon.stub(utils.log, 'm'),
      }
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      log.p.restore()
      log.e.restore()
      log.s.restore()
      log.i.restore()
      log.m.restore()
      existsSync.restore()
    })

    it('should catch an error if calling to the action fails', () => {
      utils.checkValidProject('test', action, 'env', 'opts', true)
      expect(log.p.called).to.be.true
    })

    it('should log an error if the command is not global and a project is not set up locally', () => {
      existsSync.returns(false)
      utils.checkValidProject('test', action, 'env', 'opts', false)
      expect(log.e.firstCall.args[0]).to.equal(`${chk.cyan('cfdn test')} can only be run in a valid cfdn project`)
    })

    it('should run normally if a local project and no errors occur', () => {
      existsSync.returns(true)
      utils.checkValidProject('test', action, 'env', 'opts', false)
      expect(log.p.called).to.be.true
    })
  })

  describe('#inquireTemplateName', () => {
    let globSync
    let inqPrompt

    beforeEach(() => {
      globSync = sinon.stub(glob, 'sync')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      globSync.restore()
      inqPrompt.restore()
    })

    it('should return the selected template name', () => {
      globSync.returns([
        '/test',
        '/testTwo',
      ])
      inqPrompt.returns({ templatename: 'testTwo' })

      return utils.inquireTemplateName('message').then((d) => {
        expect(d).to.equal('testTwo')
      })
    })
  })

  describe('#checkValidTemplate', () => {
    let existsSync

    beforeEach(() => {
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      existsSync.restore()
    })

    it('should return the name of the template if it exists', () => {
      existsSync.returns(true)
      const result = utils.checkValidTemplate('name')
      expect(result).to.equal('name')
    })

    it('should throw an error if the template does not exist', () => {
      existsSync.returns(false)
      const result = () => utils.checkValidTemplate('name')
      expect(result).to.throw().with.property('message', `Template ${chk.cyan('name')} does not exist!`)
    })
  })

  describe('#writeRcFile', () => {
    let writeFileSync

    beforeEach(() => {
      writeFileSync = sinon.stub(fs, 'writeFileSync')
    })

    afterEach(() => {
      writeFileSync.restore()
    })

    it('should write the stringified json to the RC file', () => {
      const result = utils.writeRcFile(false, {})
      expect(result).to.equal(undefined)
    })
  })

  describe('#selectRegion', () => {
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return the selected region', () => {
      inqPrompt.returns({ selected: 'us-east-1' })

      return utils.selectRegion({ region: 'us-west-2' }, 'select a region').then((d) => {
        expect(d).to.equal('us-east-1')
      })
    })

    it('should return the selected region and set the default region to us-east-1 if none is passed', () => {
      inqPrompt.returns({ selected: 'us-east-1' })

      return utils.selectRegion(undefined, 'select a region').then((d) => {
        expect(d).to.equal('us-east-1')
      })
    })
  })

  describe('#hasConfiguredCfdn', () => {
    let existsSync

    beforeEach(() => {
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      existsSync.restore()
    })

    it('should return true if the cfdn directory exists', () => {
      existsSync.returns(true)
      const result = utils.hasConfiguredCfdn()
      expect(result).to.equal(true)
    })

    it('should return true if the cfdn directory exists and a homedir is passed', () => {
      existsSync.returns(true)
      const result = utils.hasConfiguredCfdn('/home')
      expect(result).to.equal(true)
    })
  })

  describe('#createSaveSettings', () => {
    it('should properly structure the RC file with new settings', () => {
      const rc = {
        project: 'test-project',
        profiles: {
          testProfile: {
            aws_access_key_id: 'abcd',
            aws_secret_access_key: 'efgh',
            region: 'us-east-1',
          },
        },
        templates: {
          other: {},
          testTemplateName: {
            otherStack: {},
          },
        },
      }
      const stack = {
        profile: 'testProfile',
        parameters: {},
      }
      const result = utils.createSaveSettings(rc, 'testTemplateName', 'testStackName', stack)

      expect(result).to.deep.equal({
        project: 'test-project',
        profiles: {
          testProfile: {
            aws_access_key_id: 'abcd',
            aws_secret_access_key: 'efgh',
            region: 'us-east-1',
          },
        },
        templates: {
          other: {},
          testTemplateName: {
            otherStack: {},
            testStackName: {
              profile: 'testProfile',
              parameters: {},
            },
          },
        },
      })
    })
  })

  describe('#getValidTemplateName', () => {
    let checkValidTemplate
    let inquireTemplateName

    beforeEach(() => {
      checkValidTemplate = sinon.stub(utils, 'checkValidTemplate')
      inquireTemplateName = sinon.stub(utils, 'inquireTemplateName')
    })

    afterEach(() => {
      checkValidTemplate.restore()
      inquireTemplateName.restore()
    })

    it('should return the inquired template name if no templateName is passed', () => {
      inquireTemplateName.returns('templateName')

      return utils.getValidTemplateName().then((d) => {
        expect(inquireTemplateName.called).to.be.true
        expect(d).to.equal('templateName')
      })
    })

    it('should call to check the template name if a templateName is passed', () => (
      utils.getValidTemplateName('templateName').then((d) => {
        expect(checkValidTemplate.called).to.be.true
        expect(d).to.equal('templateName')
      })
    ))
  })
})
