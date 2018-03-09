const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../../src/utils/index.js')
const stackUtils = require('../../src/utils/stacks.js')

describe('Stack Utility Functions', () => {
  let log
  let inqPrompt

  beforeEach(() => {
    log = {
      p: sinon.stub(utils.log, 'p'),
      e: sinon.stub(utils.log, 'e'),
      s: sinon.stub(utils.log, 's'),
      i: sinon.stub(utils.log, 'i'),
      m: sinon.stub(utils.log, 'm'),
    }

    inqPrompt = sinon.stub(inq, 'prompt')
  })

  afterEach(() => {
    log.p.restore()
    log.e.restore()
    log.s.restore()
    log.i.restore()
    log.m.restore()

    inqPrompt.restore()
  })

  describe('#addTag', () => {
    it('should return the tag as a key value pair based on selection', () => {
      inqPrompt.onFirstCall().returns({ value: 'key' })
      inqPrompt.onSecondCall().returns({ value: 'value' })

      return stackUtils.addTag().then((d) => {
        expect(d).to.deep.equal({ Key: 'key', Value: 'value' })
      })
    })

    it('should return false if no tag name is set', () => {
      inqPrompt.onFirstCall().returns({})

      return stackUtils.addTag().then((d) => {
        expect(d).to.equal(false)
      })
    })
  })

  describe('#addTags', () => {
    let addTag

    beforeEach(() => {
      addTag = sinon.stub(stackUtils, 'addTag')
    })

    afterEach(() => {
      addTag.restore()
    })

    it('should return all tags generated by #addTag', () => {
      addTag.onCall(0).returns({ Key: 'Name', Value: 'TagOne' })
      addTag.onCall(1).returns({ Key: 'Name', Value: 'TagTwo' })
      addTag.onCall(2).returns(false)

      return stackUtils.addTags().then((d) => {
        expect(d).to.deep.equal([
          { Key: 'Name', Value: 'TagOne' },
          { Key: 'Name', Value: 'TagTwo' },
        ])
      })
    })

    it('should return the tags if done is set to true', () => (
      stackUtils.addTags([], true).then((d) => {
        expect(d).to.deep.equal([])
      })
    ))
  })

  describe('#addIamRole', () => {
    it('should return the given IAM ARN', () => {
      inqPrompt.returns({ arn: 'default' })

      return stackUtils.addIamRole('default').then((d) => {
        expect(d).to.equal('default')
      })
    })

    it('shoudl return false if no ARN is specified', () => {
      inqPrompt.returns(false)

      return stackUtils.addIamRole('default').then((d) => {
        expect(d).to.equal(false)
      })
    })
  })

  describe('#SNSTopicValidate', () => {
    it('should return true if there is input', () => {
      expect(stackUtils.SNSTopicValidate('test')).to.be.true
    })

    it('should return `name required!` if there is no input', () => {
      expect(stackUtils.SNSTopicValidate()).to.equal('name required!')
    })
  })

  describe('#createSNSTopic', () => {
    let aws
    let completeCreate
    let createTopic
    let completeSubscribe
    let subscribe

    // let checkboxDefault

    beforeEach(() => {
      completeCreate = sinon.stub()
      completeSubscribe = sinon.stub()
      createTopic = sinon.stub().returns({ promise: completeCreate })
      subscribe = sinon.stub().returns({ promise: completeSubscribe })
      aws = {
        SNS: sinon.stub().returns({
          createTopic,
          subscribe,
        }),
      }
    })

    it('should return the created SNS Topic ARN', () => {
      inqPrompt.returns({
        name: 'name',
        protocol: 'email',
        endpoint: 'test@cloudfoundation.com',
      })
      completeCreate.returns({ TopicArn: 'SNS:Arn' })

      return stackUtils.createSNSTopic('us-east-1', aws).then((d) => {
        expect(d).to.deep.equal({ TopicArn: 'SNS:Arn' })
      })
    })
  })

  describe('#stackTimeoutValidate', () => {
    it('should return `Value must be an integer` if the input is not an integer', () => {
      expect(stackUtils.stackTimeoutValidate('a')).to.equal('Value must be an integer')
    })

    it('should return true if the input is an integer', () => {
      expect(stackUtils.stackTimeoutValidate(1)).to.equal(true)
    })

    it('should return true if no input is passed', () => {
      expect(stackUtils.stackTimeoutValidate()).to.equal(true)
    })
  })

  describe('#setStackSNS', () => {
    let createSNSTopic

    beforeEach(() => {
      createSNSTopic = sinon.stub(stackUtils, 'createSNSTopic')
    })

    afterEach(() => {
      createSNSTopic.restore()
    })

    it('should return the SNS Topic Arn without a previous value and if the user create a new one', () => {
      inqPrompt.onCall(0).returns({ type: 'new' })
      createSNSTopic.returns({ TopicArn: 'SNS:Arn' })

      return stackUtils.setStackSNS('us-east-1', 'aws').then((d) => {
        expect(d).to.equal('SNS:Arn')
      })
    })

    it('should return the SNS Topic Arn with a previous value and if the user use an existing one', () => {
      inqPrompt.onCall(0).returns({ type: 'existing' })
      inqPrompt.onCall(1).returns({ TopicArn: 'SNS:Arn' })

      return stackUtils.setStackSNS('us-east-1', 'aws').then((d) => {
        expect(d).to.equal('SNS:Arn')
      })
    })
  })

  describe('#selectAdvancedStackOptions', () => {
    let setStackSNS
    beforeEach(() => {
      setStackSNS = sinon.stub(stackUtils, 'setStackSNS')
    })

    afterEach(() => {
      setStackSNS.restore()
    })

    it('should return the options if all are selected and used and is NOT an update', () => {
      inqPrompt.onCall(0).returns({ add: true })
      setStackSNS.returns('SNS:Arn')
      inqPrompt.onCall(1).returns({ enable: true })
      inqPrompt.onCall(2).returns({ minutes: 100 })
      inqPrompt.onCall(3).returns({ action: 'ROLLBACK' })

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws').then((d) => {
        expect(d).to.deep.equal({
          snsTopicArn: 'SNS:Arn',
          terminationProtection: true,
          timeout: 100,
          onFailure: 'ROLLBACK',
        })
      })
    })

    it('should return the options if all but the timeout options is passed and is NOT an update', () => {
      inqPrompt.onCall(0).returns({ add: true })
      setStackSNS.returns('SNS:Arn')
      inqPrompt.onCall(1).returns({ enable: true })
      inqPrompt.onCall(2).returns({})
      inqPrompt.onCall(3).returns({ action: 'ROLLBACK' })

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws').then((d) => {
        expect(d).to.deep.equal({
          snsTopicArn: 'SNS:Arn',
          terminationProtection: true,
          onFailure: 'ROLLBACK',
        })
      })
    })

    it('should return the options if all but the terminationProtection option is passed and is NOT an update', () => {
      inqPrompt.onCall(0).returns({ add: true })
      setStackSNS.returns('SNS:Arn')
      inqPrompt.onCall(1).returns({})
      inqPrompt.onCall(2).returns({})
      inqPrompt.onCall(3).returns({ action: 'ROLLBACK' })

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws').then((d) => {
        expect(d).to.deep.equal({
          snsTopicArn: 'SNS:Arn',
          onFailure: 'ROLLBACK',
        })
      })
    })

    it('should return the options with previous values if passed', () => {
      inqPrompt.onCall(0).returns({ add: true })
      setStackSNS.returns('SNS:Arn')

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws', {
        snsTopicArn: 'SNS:Arn',
        terminationProtection: true,
        timeout: 100,
        onFailure: 'ROLLBACK',
      }, true).then((d) => {
        expect(d).to.deep.equal({
          snsTopicArn: 'SNS:Arn',
          terminationProtection: true,
          timeout: 100,
          onFailure: 'ROLLBACK',
        })
      })
    })

    it('should return the options with out an SNS topic arn if not selected', () => {
      inqPrompt.onCall(0).returns({ add: true })
      setStackSNS.returns(false)
      inqPrompt.onCall(1).returns({ enable: true })
      inqPrompt.onCall(2).returns({ minutes: 100 })
      inqPrompt.onCall(3).returns({ action: 'ROLLBACK' })

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws').then((d) => {
        expect(d).to.deep.equal({
          terminationProtection: true,
          timeout: 100,
          onFailure: 'ROLLBACK',
        })
      })
    })

    it('should not set an SNS topic if not selected', () => {
      inqPrompt.onCall(0).returns({ add: false })
      inqPrompt.onCall(1).returns({ enable: true })
      inqPrompt.onCall(2).returns({ minutes: 100 })
      inqPrompt.onCall(3).returns({ action: 'ROLLBACK' })

      return stackUtils.selectAdvancedStackOptions('us-east-1', 'aws').then((d) => {
        expect(d).to.deep.equal({
          terminationProtection: true,
          timeout: 100,
          onFailure: 'ROLLBACK',
        })
      })
    })
  })

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
