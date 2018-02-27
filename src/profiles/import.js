const inq = require('inquirer')
const utils = require('../utils')
const profileUtils = require('./utils.js')
const awsUtils = require('../utils/aws.js')

module.exports = async function importProfiles () {
  utils.log.i('This will overwrite any existing profiles with the same name.', 2)

  const confirm = await inq.prompt({
    type: 'confirm',
    default: false,
    message: 'Import all AWS Credentials as Global Profiles for CloudFoundation?',
    name: 'use',
  })

  if (!confirm.use) return false

  const { profiles } = await profileUtils.getScopedProfiles(true)
  const awsProfiles = awsUtils.getAWSProfiles()
  const updated = { ...profiles, ...awsProfiles }

  profileUtils.writeGlobalProfiles(updated)

  return utils.log.s('Profiles successfully imported!', 2)
}
