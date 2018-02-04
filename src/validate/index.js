const chk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const jshint = require('jshint').JSHINT

const { DESCRIPTION_ERROR_MSG } = require('../utils/constants')

const {
  selectFromAllProfiles,
  getFromAllProfiles,
} = require('../profiles/utils')

const { configAWS } = require('../utils/aws.js')

const {
  log,
  getTemplateFiles,
  getTemplateAsObject,
  getCfnPropType,
  inquireTemplateName,
  checkValidTemplate,
} = require('../utils')

const jshintOpts = {
  asi: true,
  esversion: 6,
  node: true,
}

module.exports = async function validate (env, opts) {
  log.p()
  let profile = opts && opts.profile
  let name = env

  if (!name) name = await inquireTemplateName('Which template would you like to validate?')
  else checkValidTemplate(name)

  if (!profile) profile = await selectFromAllProfiles()
  else profile = getFromAllProfiles(profile)

  const aws = configAWS(profile)
  const templateFiles = getTemplateFiles(name)
  const errors = []

  // Validate each file individually for better error reports
  templateFiles.forEach((tf) => {
    const isDir = fs.lstatSync(tf).isDirectory()
    const cfnProp = getCfnPropType(tf)

    if (!isDir) {
      const j = fs.readFileSync(path.resolve(tf), 'utf8')
      jshint(j, jshintOpts)
      if (jshint.errors.length > 0) errors.push({ file: tf, errors: jshint.errors })
    } else {
      if (cfnProp === 'Description') throw new Error(DESCRIPTION_ERROR_MSG)

      glob.sync(`${tf}/**/*.+(js|json)`).forEach((f) => {
        const j = fs.readFileSync(path.resolve(f), 'utf8')
        jshint(j, jshintOpts)
        if (jshint.errors.length > 0) errors.push({ file: f, errors: jshint.errors })
      })
    }
  })

  // Log JSON Errors
  let ecount = 0

  errors.forEach((e) => {
    log.p(chk.underline.whiteBright(`\nErrors found in ./src${e.file.split('src')[1]}\n`))

    e.errors.forEach((e) => {
      log.p(`  Line ${e.line} - ${e.reason}`)
    })

    log.p()

    ecount += e.errors.length
  })

  if (errors.length > 0) {
    return log.e(`${ecount} syntax errors found across ${errors.length} files.  Please fix before continuing.`, 3)
  }

  log.s(`No syntax errors found across ${templateFiles.length} files for ${chk.cyan(name)} template!`)
  log.i('Beginning Cloudformation Template Validation...')

  // Run Template through CloudFormation
  const templateObject = getTemplateAsObject(name)

  const cfn = new aws.CloudFormation()

  await cfn.validateTemplate({ TemplateBody: JSON.stringify(templateObject) }).promise()

  log.s('No CloudFormation Template Errors found!')
  return log.i('Reminder - the validate-template API will not catch every error.  Some can only be found by deploying the full template.', 2)
}
