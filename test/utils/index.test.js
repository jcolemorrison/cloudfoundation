const expect = require('chai').expect
const sinon = require('sinon')
const glob = require('glob')
const chk = require('chalk')
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
