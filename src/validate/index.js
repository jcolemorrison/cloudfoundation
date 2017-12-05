const chk = require('chalk')
const fse = require('fs-extra')
const {
  checkValidProject,
  validateJSON,
  AWS,
  log,
} = require('../utils')

module.exports = async function validate (env, opts) {
  const cwd = process.cwd()
  let aws

  try {
    checkValidProject('validate [stackname]')
  } catch (error) {
    return log.e(error.message)
  }

  try {
    aws = AWS()
  } catch (error) {
    return log.e(error.message)
  }

  // if at this point, we then everything is good to go
  // we need to..
  // a) check if src/ even has any damn folders
  // b) check if they've passed a valid name of a template and look for it
  // c) if they didn't pass anything, grab all the dirs, and show them as options
  // d) when either (b) or (c) succeed, begin looping through every json file
  // e) if any file fails, break out of the loop, and show them the failure

  // after that we'll need to loop through and validate each template..
  // a) create a .tmp/ folder
  // b) call the build function down on just that one template (Which highlights the need for an individual build function)
  // c) put the build template in .tmp/
  // d) call the SDK validate template function on the template.
  // e) either return the errors, or return a success message!

  try {
    validateJSON(env)
  } catch (error) {
    return log.e(error.message)
  }

  return
}
