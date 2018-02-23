const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const chk = require('chalk')
const stackUtils = require('../../src/utils/stacks.js')

describe('Stack Utility Functions', () => {
  describe('#checkStackExists', () => {
    it('should return the stack if it exists', () => {
      const rc = {
        templateName: {
          stackName: {
            test: 'stack',
            stackId: 'test:stack:id',
          },
        },
      }
      const result = stackUtils.checkStackExists(rc, 'templateName', 'stackName')
      expect(result).to.deep.equal({
        test: 'stack',
        stackId: 'test:stack:id',
      })
    })

    it('should throw an error if the stack does not have a stackId', () => {
      const rc = {
        templateName: {
          stackName: {
            test: 'stack',
          },
        },
      }
      const result = () => { stackUtils.checkStackExists(rc, 'templateName', 'stackName') }
      expect(result).throws().with.property('message', `Stack stackName has not been deployed yet. Run ${chk.cyan('cfdn deploy templateName --stackname stackName')} to deploy it.`)
    })

    it('should throw an error if no stack can be found', () => {
      const rc = {
        templateName: {
        },
      }
      const result = () => { stackUtils.checkStackExists(rc, 'templateName', 'stackName') }
      expect(result).throws().with.property('message', 'Stack stackName does not exist!')
    })
  })

  describe('#getValidStackName', () => {
    let inqPrompt

    beforeEach(() => {
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      inqPrompt.restore()
    })

    it('should return the name if no stackName option is passed', () => {
      const rc = {
        templateName: {
          stackName: {},
        },
      }

      inqPrompt.returns({ name: 'stackName' })
      return stackUtils.getValidStackName(undefined, rc, 'templateName').then((d) => {
        expect(d).to.equal('stackName')
      })
    })

    it('should return the name if it was passed', () => {
      const rc = {
        templateName: {
          stackName: {},
        },
      }

      return stackUtils.getValidStackName('stackName', rc, 'templateName').then((d) => {
        expect(d).to.equal('stackName')
      })
    })

    it('should throw an error if the template has no stacks', () => {
      const rc = {
        templateName: {},
      }

      return stackUtils.getValidStackName('stackName', rc, 'templateName').catch((e) => {
        expect(e.message).to.equal(`Template ${chk.cyan('templateName')} has no stacks!`)
      })
    })
  })
})
