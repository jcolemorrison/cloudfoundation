// const expect = require('chai').expect
// const sinon = require('sinon')
// const { buildNumberListInquiry, buildNumberListInquiryWithCheckbox } = require('../../../src/utils/index.js')

// module.exports = function buildNumberListInquiryTest () {
//   describe('#buildNumberListInquiry', () => {
//     const ConstraintDescription = 'Only 1 2 or 3'
//     const Description = 'Choose a number 1 through 3'
//     const name = 'ParamNumbersList'

//     it('should not add a default if there is none set', () => {
//       const param = {
//         Description,
//       }
//       const testCase = {
//         type: 'input',
//         name,
//         message: Description,
//       }

//       const result = buildNumberListInquiry(param, name)
//       const { filter, validate, ...props } = result

//       expect(props).to.deep.equal(testCase)
//     })

//     it('should add a default if there is none set', () => {
//       const param = {
//         Description,
//         Default: 1,
//       }
//       const testCase = {
//         type: 'input',
//         default: 1,
//         name,
//         message: Description,
//       }

//       const result = buildNumberListInquiry(param, name)
//       const { filter, validate, ...props } = result

//       expect(props).to.deep.equal(testCase)
//     })

//     describe('-> #inquiry.validate', () => {
//       const param = {
//         Description,
//       }
//       const result = buildNumberListInquiry(param, name)
//       const { validate } = result

//       it('should return true if there is no input', () => {
//         const result = validate()
//         expect(result).to.equal(true)
//       })

//       it('should return the ConstraintDescription if the input fails the validation', () => {
//         param.ConstraintDescription = ConstraintDescription
//         const result = buildNumberListInquiry(param, name)
//         const { validate } = result
//         const test = validate('wrong-input')
//         expect(test).to.equal(ConstraintDescription)
//         delete param.ConstraintDescription
//       })

//       it('should return the default message if it fails the validation and no ConstraintDescription exists', () => {
//         const result = validate('my-stuff')
//         expect(result).to.equal(`${name} must be a comma separated list of numbers i.e 1,2,3.14,-5`)
//       })

//       it('should return true if there is input and it passes the validation', () => {
//         const result = validate('1,2')
//         expect(result).to.equal(true)
//       })
//     })

//     describe('-> #inquiry.filter', () => {
//       const param = {
//         Description,
//       }
//       const result = buildNumberListInquiry(param, name)
//       const { filter } = result

//       it('should return a string without white space', () => {
//         const result = filter('1, 2')
//         expect(result).to.equal('1,2')
//       })
//     })
//   })

//   describe('#buildNumberListInquiryWithCheckbox()', () => {
//     const ConstraintDescription = 'Only 1 2 or 3'
//     const Description = 'Choose a number 1 through 3'
//     const name = 'ParamNumbersList'

//     describe('-> without AllowedValues', () => {
//       it('should not add a default if there is none set', () => {
//         const param = {
//           Description,
//         }
//         const testCase = {
//           type: 'input',
//           name,
//           message: Description,
//         }

//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, validate, ...props } = result

//         expect(props).to.deep.equal(testCase)
//       })

//       it('should add a default if there is none set', () => {
//         const param = {
//           Description,
//           Default: 1,
//         }
//         const testCase = {
//           type: 'input',
//           default: 1,
//           name,
//           message: Description,
//         }

//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, validate, ...props } = result

//         expect(props).to.deep.equal(testCase)
//       })

//       describe('-> #inquiry.validate', () => {
//         const param = {
//           Description,
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { validate } = result

//         it('should return true if there is no input', () => {
//           const result = validate()
//           expect(result).to.equal(true)
//         })

//         it('should return the ConstraintDescription if the input fails the validation', () => {
//           param.ConstraintDescription = ConstraintDescription
//           const result = buildNumberListInquiryWithCheckbox(param, name)
//           const { validate } = result
//           const test = validate('wrong-input')
//           expect(test).to.equal(ConstraintDescription)
//           delete param.ConstraintDescription
//         })

//         it('should return the default message if it fails the validation and no ConstraintDescription exists', () => {
//           const result = validate('my-stuff')
//           expect(result).to.equal(`${name} must be a comma separated list of numbers i.e 1,2,3.14,-5`)
//         })

//         it('should return true if there is input and it passes the validation', () => {
//           const result = validate('1,2')
//           expect(result).to.equal(true)
//         })
//       })

//       describe('-> #inquiry.filter', () => {
//         const param = {
//           Description,
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter } = result

//         it('should return a string without white space', () => {
//           const result = filter('1, 2')
//           expect(result).to.equal('1,2')
//         })
//       })
//     })

//     describe('-> with AllowedValues', () => {
//       it('should set the inquiry with choices equal to AllowedValues and handle Number choices and defaults', () => {
//         const param = {
//           Default: 1,
//           AllowedValues: [1, 2, 3],
//           ConstraintDescription,
//           Description,
//         }
//         const testCase = {
//           type: 'checkbox',
//           name,
//           message: Description,
//           choices: [
//             { name: 1, value: 1, checked: true },
//             { name: 2, value: 2 },
//             { name: 3, value: 3 },
//           ],
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, ...props } = result

//         expect(props).to.deep.equal(testCase)
//         expect(filter([1, 3])).to.equal('1,3')
//       })

//       it('should set the inquiry with choices equal to AllowedValues and handle String choices and defaults', () => {
//         const param = {
//           Default: '1',
//           AllowedValues: ['1', '2', '3'],
//           ConstraintDescription,
//           Description,
//         }
//         const testCase = {
//           type: 'checkbox',
//           name,
//           message: Description,
//           choices: [
//             { name: 1, value: 1, checked: true },
//             { name: 2, value: 2 },
//             { name: 3, value: 3 },
//           ],
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, ...props } = result

//         expect(props).to.deep.equal(testCase)
//       })

//       it('should set the inquiry with choices equal to AllowedValues and handle comma separated defaults', () => {
//         const param = {
//           Default: '1,2',
//           AllowedValues: ['1', '2', '3'],
//           ConstraintDescription,
//           Description,
//         }
//         const testCase = {
//           type: 'checkbox',
//           name,
//           message: Description,
//           choices: [
//             { name: 1, value: 1, checked: true },
//             { name: 2, value: 2, checked: true },
//             { name: 3, value: 3 },
//           ],
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, ...props } = result

//         expect(props).to.deep.equal(testCase)
//       })

//       it('should set the inquiry with choices equal to AllowedValues and allow for no defaults', () => {
//         const param = {
//           AllowedValues: ['1', '2', '3'],
//           Description,
//         }
//         const testCase = {
//           type: 'checkbox',
//           name,
//           message: Description,
//           choices: [
//             { name: 1, value: 1 },
//             { name: 2, value: 2 },
//             { name: 3, value: 3 },
//           ],
//         }
//         const result = buildNumberListInquiryWithCheckbox(param, name)
//         const { filter, ...props } = result

//         expect(props).to.deep.equal(testCase)
//       })
//     })
//   })
// }