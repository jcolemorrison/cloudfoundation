const expect = require('chai').expect
const sinon = require('sinon')
const utils = require('../../src/utils/index.js')
const params = require('../../src/utils/params.js')

// File for the NON-AWS Param Inquiries

describe('Params Non AWS', () => {
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

  describe('#stringFilter', () => {
    it('should transform whatever input to a string', () => {
      expect(params.stringFilter(1)).to.equal('1')
    })
  })

  describe('#stringTrim', () => {
    it('should trim string input', () => {
      expect(params.stringTrim(' thing ')).to.equal('thing')
    })
  })

  describe('#stringFilterNoSpace', () => {
    it('should transform whatever input to a string', () => {
      expect(params.stringFilterNoSpace('thing with space')).to.equal('thingwithspace')
    })
  })

  describe('#joinArrayFilter', () => {
    it('should join an array into a string separated by commas', () => {
      expect(params.joinArrayFilter(['a', 'b'])).to.equal('a,b')
    })
  })

  describe('#baseInqMsg', () => {
    it('should return the name and description in proper format', () => {
      expect(params.baseInqMsg('name', 'description')).to.equal('name - description')
    })

    it('should only return the name if there is no description', () => {
      expect(params.baseInqMsg('name')).to.equal('name')
    })
  })

  describe('#numberInquiryValidate', () => {
    it('should return true if the user input is a number and falls within all contraints', () => {
      const fn = params.numberInquiryValidate('test', 'ParamTest', 1, 10)
      expect(fn(9)).to.equal(true)
    })

    it('should return the ConstraintDescription if it is not a number', () => {
      const fn = params.numberInquiryValidate('wrong', 'ParamTest', 1, 10)
      expect(fn('a')).to.equal('wrong')
    })

    it('should return the default error message if it is not a number', () => {
      const fn = params.numberInquiryValidate(undefined, 'ParamTest', 1, 10)
      expect(fn('a')).to.equal('ParamTest must be an integer or float!')
    })

    it('should return an error message if the value is greater than the max', () => {
      const fn = params.numberInquiryValidate(undefined, 'ParamTest', 1, 10)
      expect(fn(11)).to.equal('ParamTest can be no greater than 10!')
    })

    it('should return an error message if the value is less than the min', () => {
      const fn = params.numberInquiryValidate(undefined, 'ParamTest', 1, 10)
      expect(fn(0)).to.equal('ParamTest can be no less than 1!')
    })
  })

  describe('#buildNumberInquiry', () => {
    let param
    let baseInqMsg
    let numberInquiryValidate

    beforeEach(() => {
      param = {
        AllowedValues: undefined,
        ConstraintDescription: 'constraint',
        Default: 'Default',
        Description: 'description of param',
        MaxValue: 10,
        MinValue: 1,
        NoEcho: undefined,
      }

      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      numberInquiryValidate = sinon.stub(params, 'numberInquiryValidate')
    })

    afterEach(() => {
      baseInqMsg.restore()
      numberInquiryValidate.restore()
    })

    it('should return the fully built inquiry if type input', () => {
      baseInqMsg.returns('ParamTest Message')
      numberInquiryValidate.returns('validateFn')
      const result = params.buildNumberInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: 'Default',
        filter: params.stringFilter,
        validate: 'validateFn',
        type: 'input',
      })
    })

    it('should return a password type inquiry if NoEcho is true and a previous param was passed', () => {
      param.NoEcho = true
      baseInqMsg.returns('ParamTest Message')
      numberInquiryValidate.returns('validateFn')
      const result = params.buildNumberInquiry(param, 'ParamTest', 'secret')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: '******',
        filter: params.stringFilter,
        validate: 'validateFn',
        type: 'password',
      })
    })

    it('should return a list style inquiry if AllowedValues is passed', () => {
      param.AllowedValues = [1, 2, 3]
      param.Default = 1
      baseInqMsg.returns('ParamTest Message')
      numberInquiryValidate.returns('validateFn')
      const result = params.buildNumberInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: '1',
        choices: ['1', '2', '3'],
        filter: params.stringFilter,
        type: 'list',
      })
    })
  })

  describe('#stringInquiryValidate', () => {
    it('should return true if the input is a string and falls within all constraints', () => {
      const fn = params.stringInquiryValidate('Constraint', 'ParamTest', 1, 10)
      expect(fn('yes')).to.equal(true)
    })

    it('should return an error message if the length is greater than the max length', () => {
      const fn = params.stringInquiryValidate('Constraint', 'ParamTest', 1, 10, '.*')
      expect(fn('hellohelloooo')).to.equal('ParamTest length can be no greater than 10 characters!')
    })

    it('should return an error message if the length is less than the min length', () => {
      const fn = params.stringInquiryValidate('Constraint', 'ParamTest', 3, 10, '.*')
      expect(fn('h')).to.equal('ParamTest length can be no less than 3 characters!')
    })

    it('should return the ConstraintDescription if one exists and it does not pass the AllowedPattern', () => {
      const fn = params.stringInquiryValidate('Constraint', 'ParamTest', 3, 10, 'hello')
      expect(fn('hee')).to.equal('Constraint')
    })

    it('should return the default error message if no ConstraintDescription is passed and it does not pass the AllowedPattern', () => {
      const fn = params.stringInquiryValidate(undefined, 'ParamTest', 3, 10, 'hello')
      expect(fn('hee')).to.equal('ParamTest must match pattern hello')
    })

    it('should reutrn true if the user input is a string, falls within all constraints, and matches the AllowedPattern', () => {
      const fn = params.stringInquiryValidate('Constraint', 'ParamTest', 1, 10, '.*')
      expect(fn('yes')).to.equal(true)
    })
  })

  describe('#buildStringInquiry', () => {
    let param
    let baseInqMsg
    let stringInquiryValidate

    beforeEach(() => {
      param = {
        AllowedPattern: undefined,
        AllowedValues: undefined,
        ConstraintDescription: 'Constraint!',
        Default: 'Default',
        Description: 'A String Inquiry',
        MaxLength: 10,
        MinLength: 1,
        NoEcho: undefined,
      }
      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      stringInquiryValidate = sinon.stub(params, 'stringInquiryValidate')
    })

    afterEach(() => {
      baseInqMsg.restore()
      stringInquiryValidate.restore()
    })

    it('should return the fully built inquiry of type input', () => {
      baseInqMsg.returns('ParamTest Message')
      stringInquiryValidate.returns('validateFn')
      const result = params.buildStringInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: 'Default',
        filter: params.stringFilter,
        validate: 'validateFn',
        type: 'input',
      })
    })

    it('should set the type to Password and filter previous params is NoEcho is true', () => {
      param.NoEcho = true
      baseInqMsg.returns('ParamTest Message')
      stringInquiryValidate.returns('validateFn')
      const result = params.buildStringInquiry(param, 'ParamTest', 'secret')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: '****',
        filter: params.stringFilter,
        validate: 'validateFn',
        type: 'password',
      })
    })

    it('should set the type to List and make choices out of the AllowedValues', () => {
      param.AllowedValues = ['one', 'two', 'three']
      param.Default = 'one'
      baseInqMsg.returns('ParamTest Message')
      stringInquiryValidate.returns('validateFn')
      const result = params.buildStringInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: 'one',
        filter: params.stringFilter,
        type: 'list',
        choices: ['one', 'two', 'three'],
      })
    })
  })

  describe('#numbeListInquiryValidate', () => {
    it('should return true if it is in the correct format', () => {
      const fn = params.numberListInquiryValidate('Constraint', 'ParamTest')
      expect(fn('1,2,3')).to.be.true
    })

    it('should return the constraint if there is one AND if it fails the test', () => {
      const fn = params.numberListInquiryValidate('Constraint', 'ParamTest')
      expect(fn('wrong')).to.equal('Constraint')
    })

    it('should return the default error message if there is no constraint AND if it fails the test', () => {
      const fn = params.numberListInquiryValidate(undefined, 'ParamTest')
      expect(fn('wrong')).to.equal('ParamTest must be a comma separated list of numbers i.e 1,2,3.14,-5')
    })

    it('should return true if no input is given', () => {
      const fn = params.numberListInquiryValidate('Constraint', 'ParamTest')
      expect(fn()).to.be.true
    })
  })

  describe('#buildNumberListInquiry', () => {
    let param
    let baseInqMsg
    let numberListInquiryValidate

    beforeEach(() => {
      param = {
        ConstraintDescription: 'Constraint!',
        Default: 'Default',
        Description: 'A String Inquiry',
      }
      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      numberListInquiryValidate = sinon.stub(params, 'numberListInquiryValidate')
    })

    afterEach(() => {
      baseInqMsg.restore()
      numberListInquiryValidate.restore()
    })

    it('should return the built inquiry if no Previous Params are passed', () => {
      baseInqMsg.returns('ParamTest Message')
      numberListInquiryValidate.returns('validateFn')
      const result = params.buildNumberListInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: 'Default',
        filter: params.stringFilterNoSpace,
        validate: 'validateFn',
        type: 'input',
      })
    })
  })

  describe('#commaListInquiryValidate', () => {
    it('should return true if input is submitted in a comma delimited list format', () => {
      const fn = params.commaListInquiryValidate('Constraint', 'ParamTest')
      expect(fn('testA,testB')).to.be.true
    })

    it('should return the ConstraintDescription if it fails the test and a constraint is passed', () => {
      const fn = params.commaListInquiryValidate('Constraint', 'ParamTest')
      expect(fn('testA,1##')).to.equal('Constraint')
    })

    it('should return the default error message if it fails the test and no constraint is passed', () => {
      const fn = params.commaListInquiryValidate(undefined, 'ParamTest')
      expect(fn('testA,1##')).to.equal('ParamTest must be a comma delimited list of strings i.e. testA,testB,testC')
    })

    it('should return true no input is submitted', () => {
      const fn = params.commaListInquiryValidate('Constraint', 'ParamTest')
      expect(fn()).to.be.true
    })
  })

  describe('#buildCommaListInquiry', () => {
    let param
    let baseInqMsg
    let commaListInquiryValidate

    beforeEach(() => {
      param = {
        ConstraintDescription: 'Constraint!',
        Default: 'Default',
        Description: 'A Comma List Inquiry',
      }
      baseInqMsg = sinon.stub(params, 'baseInqMsg')
      commaListInquiryValidate = sinon.stub(params, 'commaListInquiryValidate')
    })

    afterEach(() => {
      baseInqMsg.restore()
      commaListInquiryValidate.restore()
    })

    it('should return the fully built inquiry', () => {
      baseInqMsg.returns('ParamTest Message')
      commaListInquiryValidate.returns('validateFn')
      const result = params.buildCommaListInquiry(param, 'ParamTest')

      expect(result).to.deep.equal({
        name: 'ParamTest',
        message: 'ParamTest Message',
        default: 'Default',
        filter: params.stringFilterNoSpace,
        validate: 'validateFn',
        type: 'input',
      })
    })
  })

  describe('#checkboxDefault', () => {
    it('should return the choice with checked set as true if the choice value is in the defaults', () => {
      const result = params.checkboxDefault({ value: 'thing' }, ['thing'])

      expect(result).to.deep.equal({
        value: 'thing',
        checked: true,
      })
    })

    it('should return the choice without checked if it is not in the defaults', () => {
      const result = params.checkboxDefault({ value: 'thing' }, ['other'])

      expect(result).to.deep.equal({
        value: 'thing',
      })
    })
  })
})
