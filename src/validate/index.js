const chk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const glob = require('glob')
const jshint = require('jshint')

const { DESCRIPTION_ERROR_MSG } = require('../utils/constants')

const profileUtils = require('../profiles/utils')

const awsUtils = require('../utils/aws.js')

const utils = require('../utils')

const jshintOpts = {
  asi: true,
  esversion: 6,
  node: true,
}

module.exports = async function validate (env, opts) {
  utils.log.p()
  let profile = opts && opts.profile
  let name = env

  if (!name) name = await utils.inquireTemplateName('Which template would you like to validate?')
  else utils.checkValidTemplate(name)

  if (!profile) profile = await profileUtils.selectFromAllProfiles()
  else profile = profileUtils.getFromAllProfiles(profile)

  const aws = awsUtils.configAWS(profile)
  const templateFiles = utils.getTemplateFiles(name)
  const errors = []

  // Validate each file individually for better error reports
  templateFiles.forEach((tf) => {
    const isDir = fs.lstatSync(tf).isDirectory()
    const cfnProp = utils.getCfnPropType(tf)

    if (!isDir) {
      const j = fs.readFileSync(path.resolve(tf), 'utf8')

      jshint.JSHINT(j, jshintOpts)

      if (jshint.JSHINT.errors.length > 0) errors.push({ file: tf, errors: jshint.errors })
    } else {
      if (cfnProp === 'Description') throw new Error(DESCRIPTION_ERROR_MSG)

      glob.sync(`${tf}/**/*.+(js|json)`).forEach((f) => {
        const j = fs.readFileSync(path.resolve(f), 'utf8')

        jshint.JSHINT(j, jshintOpts)

        if (jshint.JSHINT.errors.length > 0) errors.push({ file: f, errors: jshint.errors })
      })
    }
  })

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
