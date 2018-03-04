const expect = require('chai').expect
const sinon = require('sinon')
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
