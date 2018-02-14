const chk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const jshint = require('jshint')

const profileUtils = require('../profiles/utils')
const awsUtils = require('../utils/aws.js')
const utils = require('../utils')

const { DESCRIPTION_ERROR_MSG } = require('../utils/constants')

const jshintOpts = {
  asi: true,
  esversion: 6,
  node: true,
}

// Singular
exports.validateTemplateFileJSON = (templateFile) => {
  const errors = []

  const j = fs.readFileSync(path.resolve(templateFile), 'utf8')

  jshint.JSHINT(j, jshintOpts)

  if (jshint.JSHINT.errors.length > 0) errors.push({ file: templateFile, errors: jshint.JSHINT.errors })

  return errors
}

// Multiple
exports.validateTemplateFilesJSON = (templateFiles) => {
  let errors = []

  templateFiles.forEach((tf) => {
    const isDir = fs.lstatSync(tf).isDirectory()
    const cfnProp = utils.getCfnPropType(tf)

    if (!isDir) {
      errors = errors.concat(exports.validateTemplateFileJSON(tf))
    } else {
      if (cfnProp === 'Description') throw new Error(DESCRIPTION_ERROR_MSG)

      glob.sync(`${tf}/**/*.+(js|json)`).forEach((f) => {
        errors = errors.concat(exports.validateTemplateFileJSON(f))
      })
    }
  })

  return errors
}

exports.validate = async (env, opts) => {
  utils.log.p()
  let profile = opts && opts.profile
  let name = env

  if (!name) name = await utils.inquireTemplateName('Which template would you like to validate?')
  else utils.checkValidTemplate(name)

  if (!profile) profile = await profileUtils.selectFromAllProfiles()
  else profile = profileUtils.getFromAllProfiles(profile)

  const aws = awsUtils.configAWS(profile)
  const templateFiles = utils.getTemplateFiles(name)
  const errors = exports.validateTemplateFilesJSON(templateFiles)

  // Log JSON Errors
  let ecount = 0

  errors.forEach((e) => {
    utils.log.p(chk.underline.whiteBright(`\nErrors found in ./src${e.file.split('src')[1]}\n`))

    e.errors.forEach((e) => {
      utils.log.p(`  Line ${e.line} - ${e.reason}`)
    })

    utils.log.p()

    ecount += e.errors.length
  })

  if (errors.length > 0) {
    return utils.log.e(`${ecount} syntax errors found across ${errors.length} files.  Please fix before continuing.`, 3)
  }

  utils.log.s(`No syntax errors found across ${templateFiles.length} files for ${chk.cyan(name)} template!`)
  utils.log.i('Beginning Cloudformation Template Validation...')

  // Run Template through CloudFormation
  const templateObject = utils.getTemplateAsObject(name)

  const cfn = new aws.CloudFormation()

  await cfn.validateTemplate({ TemplateBody: JSON.stringify(templateObject) }).promise()

  utils.log.s('No CloudFormation Template Errors found!')
  return utils.log.i('Reminder - the validate-template API will not catch every error.  Some can only be found by deploying the full template.', 2)
}
