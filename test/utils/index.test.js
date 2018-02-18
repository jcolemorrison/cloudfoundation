const expect = require('chai').expect
const sinon = require('sinon')
const utils = require('../../src/utils/index.js')
// const buildCommaListInquiryTest = require('./functions/build-comma-list-inquiry.test.js')
// const buildNumberListInquiryTest = require('./functions/build-number-list-inquiry.test.js')

describe('Utility Functions', () => {
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
})
