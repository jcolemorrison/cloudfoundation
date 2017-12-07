const chk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const jsonlint = require('jsonlint')

const { DESCRIPTION_ERROR_MSG } = require('../utils/constants')

const {
  validateJSON,
  configAWS,
  log,
  getStackFiles,
  getCfnPropType,
} = require('../utils')

module.exports = async function validate (env, opts) {
  const cwd = process.cwd()
  let aws
  let stackFiles
  let errors

  try {
    aws = configAWS()
    stackFiles = getStackFiles(env)
    errors = []

    stackFiles.forEach((sf) => {
      const isDir = fs.lstatSync(sf).isDirectory()
      const cfnProp = getCfnPropType(sf)
      
      if (!isDir) {
        try {
          // const j = require(path.resolve(sf))
          const j = fs.readFileSync(path.resolve(sf), 'utf8')
          // JSON.parse(j)
          console.log(j)
          jsonlint.parse(j)
          // console.log(j)
          // JSON.parse(JSON.stringify(j), null, '  ')
          // JSON.parse(require(path.resolve(sf)))
        } catch (error) {
          errors.push({ file: sf, error: error.message })
        }
      } else {
        if (cfnProp === 'Description') throw new Error(DESCRIPTION_ERROR_MSG)
      }
    })
  } catch (error) {
    return log.e(error.message)
  }
  // console.log(stackFiles)
  console.log(errors[0].error)

  // so now we need to go through every fucking file




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

  // try {
  //   validateJSON(env)
  // } catch (error) {
  //   return log.e(error.message)
  // }

  return
}
