const inq = require('inquirer')
const fs = require('fs-extra')
const os = require('os')
const {
  log,
  hasAWSCreds,
  getAWSCreds,
  parseAWSCreds,
  mergeAWSCreds,
} = require('../utils')

exports._importAWSProfiles = function importAWSProfiles (homedir) {
  try {
    const home = homedir || os.homedir()
    const { creds, config } = getAWSCreds()
    const profiles = parseAWSCreds(creds)
    const regions = parseAWSCreds(config, true)
    const full = mergeAWSCreds(profiles, regions)
    let cfdnProfiles = {}

    fs.ensureDirSync(`${home}/.cfdn`)

    const file = fs.existsSync(`${home}/.cfdn/profiles.json`)

    if (!file) cfdnProfiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)

    cfdnProfiles.aws = full

    fs.writeJSONSync(`${home}/.cfdn/profiles.json`, cfdnProfiles, { spaces: 2 })
  } catch (error) {
    throw error
  }
}

exports.importProfiles = async function importAllProfilesCmd () {
  log.p()

  if (!hasAWSCreds()) return log.i('You do not have any AWS Shared Credentials to import!\n')

  try {
    const answer = await inq.prompt([
      {
        type: 'confirm',
        message: 'Import your AWS Profiles for usage in CFDN?  This will overwrite any previously imported CFDN profiles.',
        default: true,
        name: 'import',
      },
    ])
    if (answer.import) exports._importAWSProfiles()
  } catch (error) {
    return log.e(error.message)
  }

  log.p()
  return log.i('Import complete!\n')
}
