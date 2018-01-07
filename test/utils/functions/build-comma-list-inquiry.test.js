const expect = require('chai').expect
const sinon = require('sinon')
const { buildCommaListInquiry, buildCommaListInquiryWithCheckbox } = require('../../../src/utils/index.js')

module.exports = function buildCommaListInquiryTest () {
  describe('#buildCommaListInquiry()', () => {
    describe('-> without AllowedValues', () => {
      const name = 'ParamCommaDelimitedList'
      const Description = 'A comma delimited list'
      const ConstraintDescription = `${name} must be a comma delimited list of strings i.e. testA,testB,testC`

      it('should return a fully built inquiry', () => {
        const testCase = {
          type: 'input',
          name,
          message: Description,
        }
        // NOTE: type is irrelevant for these functions because the only way they get to them is via the correct type
        const param = {
          Description,
        }

        const inquiry = buildCommaListInquiry(param, name)
        const { validate, filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(validate).to.be.instanceOf(Function)
        expect(filter).to.be.instanceOf(Function)
      })

      it('should return a fully built inquiry with defaults if passed', () => {
        const testCase = {
          type: 'input',
          name,
          message: Description,
          default: 'testA,testB',
        }

        const param = {
          Description,
          Default: 'testA,testB',
        }

        const inquiry = buildCommaListInquiry(param, name)
        const { validate, filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
      })

      describe('-> #inquiry.validate()', () => {
        const param = { Description }
        const inquiry = buildCommaListInquiry(param, name)
        const { validate } = inquiry
        it('should should return if no input is passed', () => {
          const test = validate()
          expect(test).to.be.true
        })
        it('should return the ConstraintDescription if input fails validation', () => {
          param.ConstraintDescription = ConstraintDescription
          const test = validate('one$two')
          expect(test).to.equal(ConstraintDescription)
          delete param.ConstraintDescription
        })
        it('should return the default message if input fails validation and there is no ConstraintDescription', () => {
          const test = validate('one$two')
          expect(test).to.equal(ConstraintDescription) // same as default message
        })
        it('should return true if there is input and it passes the validation', () => {
          const test = validate('one,two')
          expect(test).to.be.true
        })
      })

      describe('-> #inquiry.filter()', () => {
        const param = { Description }
        const inquiry = buildCommaListInquiry(param, name)
        const { filter } = inquiry

        it('should remove whitespace from the list', () => {
          const test = filter('a, b, c')
          expect(test).to.equal('a,b,c')
        })
      })
    })

    describe('-> with AllowedValues', () => {
      const name = 'ParamCommaDelimitedList'
      const Description = 'A comma delimited list'
      const AllowedValues = ['one', 'two', 'three']
      const Default = 'one'


      it('should return a fully built inquiry with AllowedValues set as choices', () => {
        const testCase = {
          type: 'list',
          name,
          message: Description,
          choices: [
            { name: 'one', value: 'one' },
            { name: 'two', value: 'two' },
            { name: 'three', value: 'three' },
          ],
        }

        const param = {
          Description,
          AllowedValues,
        }

        const inquiry = buildCommaListInquiry(param, name)
        const { filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(filter).to.be.instanceOf(Function)
      })

      it('should set AllowedValues as Default if present on the param', () => {
        const testCase = {
          type: 'list',
          name,
          message: Description,
          choices: [
            { name: 'one', value: 'one', checked: true },
            { name: 'two', value: 'two' },
            { name: 'three', value: 'three' },
          ],
        }

        const param = {
          Description,
          AllowedValues,
          Default,
        }

        const inquiry = buildCommaListInquiry(param, name)
        const { filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(filter).to.be.instanceOf(Function)
      })

      describe('-> #inquiry.filter', () => {
        it('should turn selected choices into a comma delimited string', () => {
          const param = {
            Description,
            AllowedValues,
          }

          const inquiry = buildCommaListInquiry(param, name)
          const { filter } = inquiry

          expect(filter(['one', 'three'])).to.equal('one,three')
        })
      })
    })
  })
  describe('#buildbuildCommaListInquiryWithCheckbox()', () => {
    describe('-> without AllowedValues', () => {
      const name = 'ParamCommaDelimitedList'
      const Description = 'A comma delimited list'
      const ConstraintDescription = `${name} must be a comma delimited list of strings i.e. testA,testB,testC`

      it('should return a fully built inquiry', () => {
        const testCase = {
          type: 'input',
          name,
          message: Description,
        }
        // NOTE: type is irrelevant for these functions because the only way they get to them is via the correct type
        const param = {
          Description,
        }

        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { validate, filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(validate).to.be.instanceOf(Function)
        expect(filter).to.be.instanceOf(Function)
      })

      it('should return a fully built inquiry with defaults if passed', () => {
        const testCase = {
          type: 'input',
          name,
          message: Description,
          default: 'testA,testB',
        }

        const param = {
          Description,
          Default: 'testA,testB',
        }

        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { validate, filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
      })

      describe('-> #inquiry.validate()', () => {
        const param = { Description }
        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { validate } = inquiry
        it('should should return if no input is passed', () => {
          const test = validate()
          expect(test).to.be.true
        })
        it('should return the ConstraintDescription if input fails validation', () => {
          param.ConstraintDescription = ConstraintDescription
          const test = validate('one$two')
          expect(test).to.equal(ConstraintDescription)
          delete param.ConstraintDescription
        })
        it('should return the default message if input fails validation and there is no ConstraintDescription', () => {
          const test = validate('one$two')
          expect(test).to.equal(ConstraintDescription) // same as default message
        })
        it('should return true if there is input and it passes the validation', () => {
          const test = validate('one,two')
          expect(test).to.be.true
        })
      })

      describe('-> #inquiry.filter()', () => {
        const param = { Description }
        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { filter } = inquiry

        it('should remove whitespace from the list', () => {
          const test = filter('a, b, c')
          expect(test).to.equal('a,b,c')
        })
      })
    })

    describe('-> with AllowedValues', () => {
      const name = 'ParamCommaDelimitedList'
      const Description = 'A comma delimited list'
      const AllowedValues = ['one', 'two', 'three']
      const Default = 'one,two'


      it('should return a fully built inquiry with AllowedValues set as choices', () => {
        const testCase = {
          type: 'checkbox',
          name,
          message: Description,
          choices: [
            { name: 'one', value: 'one' },
            { name: 'two', value: 'two' },
            { name: 'three', value: 'three' },
          ],
        }

        const param = {
          Description,
          AllowedValues,
        }

        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(filter).to.be.instanceOf(Function)
      })

      it('should set AllowedValues as Defaults if present on the param', () => {
        const testCase = {
          type: 'checkbox',
          name,
          message: Description,
          choices: [
            { name: 'one', value: 'one', checked: true },
            { name: 'two', value: 'two', checked: true },
            { name: 'three', value: 'three' },
          ],
        }

        const param = {
          Description,
          AllowedValues,
          Default,
        }

        const inquiry = buildCommaListInquiryWithCheckbox(param, name)
        const { filter, ...test } = inquiry

        expect(test).to.deep.equal(testCase)
        expect(filter).to.be.instanceOf(Function)
      })

      describe('-> #inquiry.filter', () => {
        it('should turn selected choices into a comma delimited string', () => {
          const param = {
            Description,
            AllowedValues,
          }

          const inquiry = buildCommaListInquiryWithCheckbox(param, name)
          const { filter } = inquiry

          expect(filter(['one', 'three'])).to.equal('one,three')
        })
      })
    })
  })
}
