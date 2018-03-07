const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const inq = require('inquirer')
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
    
  })
})
