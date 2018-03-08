const expect = require('chai').expect
const sinon = require('sinon')
const utils = require('../../src/utils/index.js')
const params = require('../../src/utils/params.js')

// File for AWS Params Tests

describe('Params AWS', () => {
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

  describe('#buildAWSParamInquiry', () => {
    let param
    let baseInqMsg
    let choices

    beforeEach(() => {
      param = {
        Default: 'Default',
        Description: 'description of param',
      }

      choices = sinon.stub().returns('choices')

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
    })

    afterEach(() => {
      baseInqMsg.restore()
    })

    it('should return the fully build inquiry as type list', () => {
      baseInqMsg.returns('Param Message')

      const result = params.buildAWSParamInquiry(param, 'Param', 'us-east-1', 'aws', 'list', undefined, choices)

      expect(result).to.deep.equal({
        type: 'list',
        name: 'Param',
        message: 'Param Message',
        default: 'Default',
        choices: 'choices',
      })
    })

    it('should set the array join filter if the type is checkbox', () => {
      baseInqMsg.returns('Param Message')

      const result = params.buildAWSParamInquiry(param, 'Param', 'us-east-1', 'aws', 'checkbox', undefined, choices)

      expect(result).to.deep.equal({
        type: 'checkbox',
        name: 'Param',
        message: 'Param Message',
        default: 'Default',
        choices: 'choices',
        filter: params.joinArrayFilter,
      })
    })
  })

  describe('#AZInquiryChoices', () => {
    const AvailabilityZones = [
      { State: 'available', ZoneName: 'us-east-1' },
      { State: 'available', ZoneName: 'us-west-1' },
      { State: 'unavailable', ZoneName: 'us-west-2' },
    ]
    let aws
    let complete
    let describeAvailabilityZones

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeAvailabilityZones = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeAvailabilityZones }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return all properly built choices', () => {
      complete.returns({ AvailabilityZones })
      describeAvailabilityZones.returns({ promise: complete })

      const fn = params.AZInquiryChoices(aws, 'us-east-1', 'ParamTest', 'input', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'us-east-1', value: 'us-east-1', disabled: false },
          { name: 'us-west-1', value: 'us-west-1', disabled: false },
          { name: 'us-west-2', value: 'us-west-2', disabled: 'unavailable' },
        ])
      })
    })

    it('should set the defaults if type is checkbox', () => {
      complete.returns({ AvailabilityZones })
      describeAvailabilityZones.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.AZInquiryChoices(aws, 'us-east-1', 'ParamTest', 'checkbox', ['defaults'])

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'us-east-1', value: 'us-east-1', disabled: false },
          { name: 'us-west-1', value: 'us-west-1', disabled: false },
          { name: 'us-west-2', value: 'us-west-2', disabled: 'unavailable' },
        ])
      })
    })
  })

  describe('#buildAZInquiry', () => {
    let param
    let baseInqMsg
    let AZInquiryChoices

    beforeEach(() => {
      param = {
        Default: 'Default',
        Description: 'description of param',
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      AZInquiryChoices = sinon.stub(params, 'AZInquiryChoices')
    })

    afterEach(() => {
      baseInqMsg.restore()
      AZInquiryChoices.restore()
    })

    it('should return the fully build inquiry as type list', () => {
      baseInqMsg.returns('ParamAZ Message')
      AZInquiryChoices.returns('choices')
      const result = params.buildAZInquiry(param, 'ParamAZ', 'us-east-1', 'aws', 'list', undefined)

      expect(result).to.deep.equal({
        type: 'list',
        name: 'ParamAZ',
        message: 'ParamAZ Message',
        default: 'Default',
        choices: 'choices',
      })
    })

    it('should set the array join filter if the type is checkbox', () => {
      baseInqMsg.returns('ParamAZ Message')
      AZInquiryChoices.returns('choices')
      const result = params.buildAZInquiry(param, 'ParamAZ', 'us-east-1', 'aws', 'checkbox', undefined)

      expect(result).to.deep.equal({
        type: 'checkbox',
        name: 'ParamAZ',
        message: 'ParamAZ Message',
        default: 'Default',
        choices: 'choices',
        filter: params.joinArrayFilter,
      })
    })
  })

  describe('#buildImageInquiry', () => {
    let param
    let baseInqMsg

    beforeEach(() => {
      param = {
        AllowedValues: undefined,
        Default: 'Default',
        Description: 'description of param',
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
    })

    afterEach(() => {
      baseInqMsg.restore()
    })

    it('should return the fully build inquiry as a type input', () => {
      baseInqMsg.returns('ParamImage test')

      const result = params.buildImageInquiry(param, 'ParamImage')

      expect(result).to.deep.equal({
        name: 'ParamImage',
        message: 'ParamImage test',
        type: 'input',
        default: 'Default',
        filter: params.stringTrim,
      })
    })

    it('should return the fully build inquiry as a type list and use previous params', () => {
      param.AllowedValues = ['one', 'two', 'some-image']
      baseInqMsg.returns('ParamImage test')

      const result = params.buildImageInquiry(param, 'ParamImage', 'some-image')

      expect(result).to.deep.equal({
        name: 'ParamImage',
        message: 'ParamImage test',
        type: 'list',
        default: 'some-image',
        choices: ['one', 'two', 'some-image'],
      })
    })
  })

  describe('#instanceInquiryChoices', () => {
    const Reservations = [{
      Instances: [
        {
          Tags: [{ Key: 'Name', Value: 'First Instance' }],
          InstanceId: 'abc',
        },
        {
          Tags: [],
          InstanceId: '123',
        },
      ],
    }]
    let aws
    let complete
    let describeInstances

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeInstances = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeInstances }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return the choices as type list', () => {
      complete.returns({ Reservations })
      describeInstances.returns({ promise: complete })

      const fn = params.instanceInquiryChoices(aws, 'us-east-1', 'ParamInstance', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc (First Instance)', value: 'abc' },
          { name: '123', value: '123' },
        ])
      })
    })

    it('should return the choices as type checkbox with defaults set', () => {
      complete.returns({ Reservations })
      describeInstances.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.instanceInquiryChoices(aws, 'us-east-1', 'ParamInstance', 'checkbox', ['defaults'])

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc (First Instance)', value: 'abc' },
          { name: '123', value: '123' },
        ])
      })
    })
  })

  describe('#buildInstanceInquiry', () => {
    let param
    let baseInqMsg
    let instanceInquiryChoices

    beforeEach(() => {
      param = {
        Default: 'Default',
        Description: 'description of param',
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      instanceInquiryChoices = sinon.stub(params, 'instanceInquiryChoices')
    })

    afterEach(() => {
      baseInqMsg.restore()
      instanceInquiryChoices.restore()
    })

    it('should return the built instance inquiry', () => {
      baseInqMsg.returns('Param Message')
      instanceInquiryChoices.returns('choices')

      const result = params.buildInstanceInquiry(param, 'ParamInstance', 'us-east-1', 'aws', 'list')

      expect(result).to.deep.equal({
        type: 'list',
        name: 'ParamInstance',
        message: 'Param Message',
        default: 'Default',
        choices: 'choices',
      })
    })

    it('should return the built instance inquiry and set a filter if type checkbox and previous params are passed', () => {
      baseInqMsg.returns('Param Message')
      instanceInquiryChoices.returns('choices')

      const result = params.buildInstanceInquiry(param, 'ParamInstance', 'us-east-1', 'aws', 'checkbox', 'prev value')

      expect(result).to.deep.equal({
        type: 'checkbox',
        name: 'ParamInstance',
        message: 'Param Message',
        default: 'prev value',
        choices: 'choices',
        filter: params.joinArrayFilter,
      })
    })
  })

  describe('#keyPairInquiryChoices', () => {
    const KeyPairs = [
      { KeyName: 'one' },
      { KeyName: 'two' },
    ]
    let aws
    let complete
    let describeKeyPairs

    beforeEach(() => {
      complete = sinon.stub()
      describeKeyPairs = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeKeyPairs }),
      }
    })

    afterEach(() => {
    })

    it('should return all key pairs for the given region as choices', () => {
      complete.returns({ KeyPairs })
      describeKeyPairs.returns({ promise: complete })

      const fn = params.keyPairInquiryChoices(aws, 'us-east-1', 'ParamKeyPair')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          'one',
          'two',
        ])
      })
    })
  })

  describe('#buildKeyPairInquiry', () => {
    let param
    let baseInqMsg
    let keyPairInquiryChoices

    beforeEach(() => {
      param = {
        Default: 'Default',
        Description: 'description of param',
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      keyPairInquiryChoices = sinon.stub(params, 'keyPairInquiryChoices')
    })

    afterEach(() => {
      baseInqMsg.restore()
      keyPairInquiryChoices.restore()
    })

    it('should return the built key pair inquiry if no prev params are passed', () => {
      baseInqMsg.returns('Param Message')
      keyPairInquiryChoices.returns('choices')

      const result = params.buildKeyPairInquiry(param, 'ParamKeyPair', 'us-east-1', 'aws')

      expect(result).to.deep.equal({
        type: 'list',
        name: 'ParamKeyPair',
        message: 'Param Message',
        default: 'Default',
        choices: 'choices',
      })
    })
  })

  describe('#securityGroupInquiryChoices', () => {
    const SecurityGroups = [
      { GroupId: 'abc', GroupName: 'abc group' },
      { GroupId: 'xyz', GroupName: 'xyz group' },
      { GroupId: 'qwe', GroupName: 'qwe group' },
    ]
    let aws
    let complete
    let describeSecurityGroups

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeSecurityGroups = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeSecurityGroups }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return all properly built choices for type GroupId', () => {
      complete.returns({ SecurityGroups })
      describeSecurityGroups.returns({ promise: complete })

      const fn = params.securityGroupInquiryChoices(aws, 'us-east-1', 'GroupId', 'ParamTest', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc (abc group)', value: 'abc' },
          { name: 'xyz (xyz group)', value: 'xyz' },
          { name: 'qwe (qwe group)', value: 'qwe' },
        ])
      })
    })

    it('should return all properly built choices for type GroupName', () => {
      complete.returns({ SecurityGroups })
      describeSecurityGroups.returns({ promise: complete })

      const fn = params.securityGroupInquiryChoices(aws, 'us-east-1', 'GroupName', 'ParamTest', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc group (abc)', value: 'abc group' },
          { name: 'xyz group (xyz)', value: 'xyz group' },
          { name: 'qwe group (qwe)', value: 'qwe group' },
        ])
      })
    })

    it('should call to the checkboxDefault() if the type is checkbox and also deal with defaults', () => {
      complete.returns({ SecurityGroups })
      describeSecurityGroups.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.securityGroupInquiryChoices(aws, 'us-east-1', 'GroupId', 'ParamTest', 'checkbox', 'abc,xyz')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc (abc group)', value: 'abc' },
          { name: 'xyz (xyz group)', value: 'xyz' },
          { name: 'qwe (qwe group)', value: 'qwe' },
        ])
      })
    })
  })

  describe('#buildSecurityGroupInquiry', () => {
    let param
    let baseInqMsg
    let securityGroupInquiryChoices

    beforeEach(() => {
      param = {
        Default: 'Default',
        Description: 'description of param',
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      securityGroupInquiryChoices = sinon.stub(params, 'securityGroupInquiryChoices')
    })

    afterEach(() => {
      baseInqMsg.restore()
      securityGroupInquiryChoices.restore()
    })

    it('should return the built security group inquiry', () => {
      baseInqMsg.returns('Param Message')
      securityGroupInquiryChoices.returns('choices')

      const result = params.buildSecurityGroupInquiry(param, 'ParamSG', 'us-east-1', 'aws', 'GroupId', 'list')

      expect(result).to.deep.equal({
        type: 'list',
        name: 'ParamSG',
        message: 'Param Message',
        default: 'Default',
        choices: 'choices',
      })
    })

    it('should return the built security group inquiry and set a filter if type checkbox and previous params are passed', () => {
      baseInqMsg.returns('Param Message')
      securityGroupInquiryChoices.returns('choices')

      const result = params.buildSecurityGroupInquiry(param, 'ParamSG', 'us-east-1', 'aws', 'GroupName', 'checkbox', 'prev value')

      expect(result).to.deep.equal({
        type: 'checkbox',
        name: 'ParamSG',
        message: 'Param Message',
        default: 'prev value',
        choices: 'choices',
        filter: params.joinArrayFilter,
      })
    })
  })

  describe('#subnetInquiryChoices', () => {
    const Subnets = [
      {
        Tags: [{ Key: 'Name', Value: 'First Subnet' }],
        SubnetId: 'subnet-abc',
        VpcId: 'vpc-123',
      },
      {
        SubnetId: 'subnet-xyz',
        VpcId: 'vpc-456',
      },
      {
        Tags: [],
        SubnetId: 'subnet-qwe',
        VpcId: 'vpc-789',
      },
    ]
    let aws
    let complete
    let describeSubnets

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeSubnets = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeSubnets }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return the choices as type list', () => {
      complete.returns({ Subnets })
      describeSubnets.returns({ promise: complete })

      const fn = params.subnetInquiryChoices(aws, 'us-east-1', 'ParamSubnets', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'subnet-abc (First Subnet) | vpc-123', value: 'subnet-abc' },
          { name: 'subnet-xyz | vpc-456', value: 'subnet-xyz' },
          { name: 'subnet-qwe | vpc-789', value: 'subnet-qwe' },
        ])
      })
    })

    it('should return the choices as type checkbox with defaults set', () => {
      complete.returns({ Subnets })
      describeSubnets.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.subnetInquiryChoices(aws, 'us-east-1', 'ParamSubnets', 'checkbox', 'default,values')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'subnet-abc (First Subnet) | vpc-123', value: 'subnet-abc' },
          { name: 'subnet-xyz | vpc-456', value: 'subnet-xyz' },
          { name: 'subnet-qwe | vpc-789', value: 'subnet-qwe' },
        ])
      })
    })
  })

  describe('#volumeInquiryChoices', () => {
    const Volumes = [
      {
        Tags: [{ Key: 'Name', Value: 'First Volume' }],
        VolumeId: 'volume-abc',
      },
      {
        VolumeId: 'volume-xyz',
      },
      {
        Tags: [],
        VolumeId: 'volume-qwe',
      },
    ]
    let aws
    let complete
    let describeVolumes

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeVolumes = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeVolumes }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return the choices as type list', () => {
      complete.returns({ Volumes })
      describeVolumes.returns({ promise: complete })

      const fn = params.volumeInquiryChoices(aws, 'us-east-1', 'ParamVolume', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'volume-abc (First Volume)', value: 'volume-abc' },
          { name: 'volume-xyz', value: 'volume-xyz' },
          { name: 'volume-qwe', value: 'volume-qwe' },
        ])
      })
    })

    it('should return the choices as type checkbox with defaults set', () => {
      complete.returns({ Volumes })
      describeVolumes.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.volumeInquiryChoices(aws, 'us-east-1', 'ParamVolume', 'checkbox', 'default,values')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'volume-abc (First Volume)', value: 'volume-abc' },
          { name: 'volume-xyz', value: 'volume-xyz' },
          { name: 'volume-qwe', value: 'volume-qwe' },
        ])
      })
    })
  })

  describe('#vpcInquiryChoices', () => {
    const Vpcs = [
      {
        Tags: [{ Key: 'Name', Value: 'First Vpc' }],
        VpcId: 'vpc-abc',
      },
      {
        VpcId: 'vpc-xyz',
      },
      {
        Tags: [],
        VpcId: 'vpc-qwe',
      },
    ]
    let aws
    let complete
    let describeVpcs

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      describeVpcs = sinon.stub()
      aws = {
        EC2: sinon.stub().returns({ describeVpcs }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return the choices as type list', () => {
      complete.returns({ Vpcs })
      describeVpcs.returns({ promise: complete })

      const fn = params.vpcInquiryChoices(aws, 'us-east-1', 'ParamVpc', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'vpc-abc (First Vpc)', value: 'vpc-abc' },
          { name: 'vpc-xyz', value: 'vpc-xyz' },
          { name: 'vpc-qwe', value: 'vpc-qwe' },
        ])
      })
    })

    it('should return the choices as type checkbox with defaults set', () => {
      complete.returns({ Vpcs })
      describeVpcs.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.vpcInquiryChoices(aws, 'us-east-1', 'ParamVpc', 'checkbox', 'default,values')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'vpc-abc (First Vpc)', value: 'vpc-abc' },
          { name: 'vpc-xyz', value: 'vpc-xyz' },
          { name: 'vpc-qwe', value: 'vpc-qwe' },
        ])
      })
    })
  })

  describe('#hostedZoneInquiryChoices', () => {
    const HostedZones = [
      {
        Name: 'abc.com',
        Id: '/hostedzone/abc',
      },
      {
        Name: 'xyz.com',
        Id: '/hostedzone/xyz',
      },
    ]
    let aws
    let complete
    let listHostedZones

    let checkboxDefault

    beforeEach(() => {
      checkboxDefault = sinon.stub(params, 'checkboxDefault')
      complete = sinon.stub()
      listHostedZones = sinon.stub()
      aws = {
        Route53: sinon.stub().returns({ listHostedZones }),
      }
    })

    afterEach(() => {
      checkboxDefault.restore()
    })

    it('should return the choices as type list', () => {
      complete.returns({ HostedZones })
      listHostedZones.returns({ promise: complete })

      const fn = params.hostedZoneInquiryChoices(aws, 'us-east-1', 'ParamHostedZone', 'list', undefined)

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc.com (abc)', value: 'abc' },
          { name: 'xyz.com (xyz)', value: 'xyz' },
        ])
      })
    })

    it('should return the choices as type checkbox with defaults set', () => {
      complete.returns({ HostedZones })
      listHostedZones.returns({ promise: complete })
      checkboxDefault.callsFake(c => c)

      const fn = params.hostedZoneInquiryChoices(aws, 'us-east-1', 'ParamHostedZone', 'checkbox', 'default,values')

      return fn().then((d) => {
        expect(d).to.deep.equal([
          { name: 'abc.com (abc)', value: 'abc' },
          { name: 'xyz.com (xyz)', value: 'xyz' },
        ])
      })
    })
  })
})
