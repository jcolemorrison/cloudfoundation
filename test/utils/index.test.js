const expect = require('chai').expect
const sinon = require('sinon')
const utils = require('../../src/utils/index.js')

const { buildNumberListInquiry } = utils

describe('Utility Funcitons', () => {
  describe('#buildNumberListInquiry()', () => {
    describe('-> with AllowedValues', () => {
      const ConstraintDescription = 'Only 1 2 or 3'
      const Description = 'Choose a number 1 through 3'

      it('should set the inquiry with choices equal to AllowedValues and handle Number choices and defaults', () => {
        const param = {
          Default: 1,
          AllowedValues: [1, 2, 3],
          ConstraintDescription,
          Description,
        }
        const name = 'ParamNumbersList'
        const testCase = {
          type: 'checkbox',
          name,
          message: param.Description,
          default: 1,
          choices: [
            { name: 1, value: 1, checked: true },
            { name: 2, value: 2 },
            { name: 3, value: 3 },
          ],
        }
        const result = buildNumberListInquiry(param, name)
        const { filter, ...props } = result

        expect(props).to.deep.equal(testCase)
        expect(filter([1, 3])).to.equal('1,3')
      })
    })
  })
})
