const inq = require('inquirer')
const { log } = require('../utils')
const { getScopedProfiles, writeGlobalProfiles } = require('./utils.js')
const { getAWSProfiles } = require('../utils/aws.js')

module.exports = async function importProfiles () {
  log.i('This will overwrite any existing profiles with the same name.', 2)

  const confirm = await inq.prompt({
    type: 'confirm',
    default: false,
    message: 'Import all AWS Credentials as Global Profiles for CloudFoundation?',
    name: 'use',
  })

  if (!confirm.use) return false

  const { profiles } = await getScopedProfiles(true)
  const awsProfiles = getAWSProfiles()
  const updated = { ...profiles, ...awsProfiles }
  
  writeGlobalProfiles(updated)

  return log.s('Profiles successfully imported!', 2)
}
