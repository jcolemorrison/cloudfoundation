const expect = require('chai').expect
const sinon = require('sinon')
const inq = require('inquirer')
const utils = require('../../src/utils/index.js')
const params = require('../../src/utils/params.js')

describe('Params Inquiry', () => {
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

  describe('#buildParamInquiry', () => {
    let buildStringInquiry
    let buildNumberInquiry
    let buildNumberListInquiry
    let buildCommaListInquiry
    let buildAWSParamInquiry
    // let AZInquiryChoices
    let buildImageInquiry
    let instanceInquiryChoices
    let buildKeyPairInquiry
    let buildSecurityGroupInquiry
    let subnetInquiryChoices
    let volumeInquiryChoices
    let vpcInquiryChoices
    let hostedZoneInquiryChoices

    beforeEach(() => {
      buildStringInquiry = sinon.stub(params, 'buildStringInquiry')
      buildNumberInquiry = sinon.stub(params, 'buildNumberInquiry')
      buildNumberListInquiry = sinon.stub(params, 'buildNumberListInquiry')
      buildCommaListInquiry = sinon.stub(params, 'buildCommaListInquiry')
      buildAWSParamInquiry = sinon.stub(params, 'buildAWSParamInquiry')
      // AZInquiryChoices = sinon.stub(params, 'AZInquiryChoices')
      buildImageInquiry = sinon.stub(params, 'buildImageInquiry')
      instanceInquiryChoices = sinon.stub(params, 'instanceInquiryChoices')
      buildKeyPairInquiry = sinon.stub(params, 'buildKeyPairInquiry')
      buildSecurityGroupInquiry = sinon.stub(params, 'buildSecurityGroupInquiry')
      subnetInquiryChoices = sinon.stub(params, 'subnetInquiryChoices')
      volumeInquiryChoices = sinon.stub(params, 'volumeInquiryChoices')
      vpcInquiryChoices = sinon.stub(params, 'vpcInquiryChoices')
      hostedZoneInquiryChoices = sinon.stub(params, 'hostedZoneInquiryChoices')
    })

    afterEach(() => {
      buildStringInquiry.restore()
      buildNumberInquiry.restore()
      buildNumberListInquiry.restore()
      buildCommaListInquiry.restore()
      buildAWSParamInquiry.restore()
      // AZInquiryChoices.restore()
      buildImageInquiry.restore()
      instanceInquiryChoices.restore()
      buildKeyPairInquiry.restore()
      buildSecurityGroupInquiry.restore()
      subnetInquiryChoices.restore()
      volumeInquiryChoices.restore()
      vpcInquiryChoices.restore()
      hostedZoneInquiryChoices.restore()
    })

    it('should call to #buildStringInquiry on param type `String`', () => {
      buildStringInquiry.returns('string param')
      const result = params.buildParamInquiry({ Type: 'String' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('string param')
    })

    it('should call to #buildNumberInquiry on param type `Number`', () => {
      buildNumberInquiry.returns('number param')
      const result = params.buildParamInquiry({ Type: 'Number' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('number param')
    })

    it('should call to #buildNumberListInquiry on param type `List<Number>`', () => {
      buildNumberListInquiry.returns('number param')
      const result = params.buildParamInquiry({ Type: 'List<Number>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('number param')
    })

    it('should call to #buildCommaListInquiry on param type `CommaDelimitedList`', () => {
      buildCommaListInquiry.returns('comma param')
      const result = params.buildParamInquiry({ Type: 'CommaDelimitedList' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('comma param')
    })

    it('should call #buildAWSParamInquiry with #AZInquiryChoices and `list` as arguments on param type `AWS::EC2::AvailabilityZone::Name`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::AvailabilityZone::Name' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.AZInquiryChoices)
    })

    it('should call to #buildImageInquiry on param type `AWS::EC2::Image::Id`', () => {
      buildImageInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::Image::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
    })

    it('should call #buildAWSParamInquiry with #instanceInquiryChoices and `list` as arguments on param type `AWS::EC2::Instance::Id`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::Instance::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.instanceInquiryChoices)
    })

    it('should call to #buildKeyPairInquiry on param type `AWS::EC2::KeyPair::KeyName`', () => {
      buildKeyPairInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::KeyPair::KeyName' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
    })

    it('should call to #buildSecurityGroupInquiry on param type `AWS::EC2::SecurityGroup::GroupName`', () => {
      buildSecurityGroupInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::SecurityGroup::GroupName' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(buildSecurityGroupInquiry.firstCall.args[4]).to.equal('GroupName')
      expect(buildSecurityGroupInquiry.firstCall.args[5]).to.equal('list')
    })

    it('should call to #buildSecurityGroupInquiry on param type `AWS::EC2::SecurityGroup::Id`', () => {
      buildSecurityGroupInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::SecurityGroup::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(buildSecurityGroupInquiry.firstCall.args[4]).to.equal('GroupId')
      expect(buildSecurityGroupInquiry.firstCall.args[5]).to.equal('list')
    })

    it('should call #buildAWSParamInquiry with #subnetInquiryChoices and `list` as arguments on param type `AWS::EC2::Subnet::Id`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::Subnet::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.subnetInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #volumeInquiryChoices and `list` as arguments on param type `AWS::EC2::Volume::Id`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::Volume::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.volumeInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #vpcInquiryChoices and `list` as arguments on param type `AWS::EC2::VPC::Id`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::EC2::VPC::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.vpcInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #hostedZoneInquiryChoices and `list` as arguments on param type `AWS::Route53::HostedZone::Id`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'AWS::Route53::HostedZone::Id' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('list')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.hostedZoneInquiryChoices)
    })

    it('should call to #buildCommaListInquiry if the param is type `List<AWS::EC2::Image::Id>`', () => {
      buildCommaListInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::Image::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
    })

    it('should call #buildAWSParamInquiry with #AZInquiryChoices and `checkbox` as arguments on param type `List<AWS::EC2::AvailabilityZone::Name>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::AvailabilityZone::Name>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.AZInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #instanceInquiryChoices and `checkbox` as arguments on param type `List<AWS::EC2::Instance::Id>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::Instance::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.instanceInquiryChoices)
    })

    it('should call to #buildSecurityGroupInquiry on param type `List<AWS::EC2::SecurityGroup::GroupName>`', () => {
      buildSecurityGroupInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::SecurityGroup::GroupName>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(buildSecurityGroupInquiry.firstCall.args[4]).to.equal('GroupName')
      expect(buildSecurityGroupInquiry.firstCall.args[5]).to.equal('checkbox')
    })

    it('should call to #buildSecurityGroupInquiry on param type `List<AWS::EC2::SecurityGroup::Id>`', () => {
      buildSecurityGroupInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::SecurityGroup::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(buildSecurityGroupInquiry.firstCall.args[4]).to.equal('GroupId')
      expect(buildSecurityGroupInquiry.firstCall.args[5]).to.equal('checkbox')
    })

    it('should call #buildAWSParamInquiry with #subnetInquiryChoices and `checkbox` as arguments on param type `List<AWS::EC2::Subnet::Id>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::Subnet::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.subnetInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #volumeInquiryChoices and `checkbox` as arguments on param type `List<AWS::EC2::Volume::Id>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::Volume::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.volumeInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #vpcInquiryChoices and `checkbox` as arguments on param type `List<AWS::EC2::VPC::Id>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::EC2::VPC::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.vpcInquiryChoices)
    })

    it('should call #buildAWSParamInquiry with #hostedZoneInquiryChoices and `checkbox` as arguments on param type `List<AWS::Route53::HostedZone::Id>`', () => {
      buildAWSParamInquiry.returns('param')
      const result = params.buildParamInquiry({ Type: 'List<AWS::Route53::HostedZone::Id>' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.equal('param')
      expect(params.buildAWSParamInquiry.firstCall.args[4]).to.equal('checkbox')
      expect(params.buildAWSParamInquiry.firstCall.args[6]).to.equal(params.hostedZoneInquiryChoices)
    })

    it('should throw an error if an invalid param type is submitted', () => {
      const result = () => params.buildParamInquiry({ Type: 'invalid' }, 'Param', 'us-east-1', 'aws', 'prev')
      expect(result).to.throw().with.property('message', 'Invalid CloudFormation Param type \'invalid\'')
    })
  })

  describe('#selectStackParams', () => {
    const Parameters = {
      ParamOne: {},
      ParamTwo: {},
    }
    let buildParamInquiry
    let inqPrompt

    beforeEach(() => {
      buildParamInquiry = sinon.stub(params, 'buildParamInquiry')
      inqPrompt = sinon.stub(inq, 'prompt')
    })

    afterEach(() => {
      buildParamInquiry.restore()
      inqPrompt.restore()
    })

    it('should return all selected choices', () => {
      inqPrompt.returns('choices')

      return params.selectStackParams(Parameters, 'us-east-1', 'aws', {}).then((d) => {
        expect(d).to.equal('choices')
        expect(buildParamInquiry.callCount).to.equal(2)
      })
    })

    it('should return false if no Parameters are passed', () => (
      params.selectStackParams({}, 'us-east-1', 'aws', {}).then((d) => {
        expect(d).to.equal(false)
      })
    ))
  })
})
