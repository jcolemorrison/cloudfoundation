const inq = require('inquirer')
const fs = require('fs-extra')
const os = require('os')
const chk = require('chalk')
const {
  log,
  hasAWSCreds,
  getAWSCreds,
  parseAWSCreds,
  mergeAWSCreds,
  hasConfiguredCfdn,
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

    if (file) cfdnProfiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)

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

exports._addProfile = async function addCFDNProfile (name, homedir) {
  const home = homedir || os.homedir()
  const configuredCfdn = hasConfiguredCfdn(home)
  let profiles = {}

  if (configuredCfdn) profiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)

  profiles.cfdn = profiles.cfdn || {}

  if (profiles.cfdn[name]) {
    throw new Error(`Profile ${chk.cyan(name)} already exists.  Use ${chk.cyan('update-profile')} or ${chk.cyan('remove-profile')} to manage it.`)
  }

  try {
    const inqs = [
      {
        type: 'input',
        name: 'aws_access_key_id',
        message: `What is the ${chk.cyan('aws_access_key_id')}?`,
      },
      {
        type: 'input',
        name: 'aws_secret_access_key',
        message: `What is the ${chk.cyan('aws_secret_access_key')}?`,
      },
      {
        type: 'input',
        name: 'region',
        message: `What is the default ${chk.cyan('region')} of the profile?`,
        default: 'us-east-1',
      },
    ]
    if (!name) {
      inqs.unshift({
        type: 'input',
        name: 'name',
        message: 'What do you want to name this profile?',
      })
    }

    const profile = await inq.prompt(inqs)

    let profileName = name || 'default'

    if (profile.name) profileName = profile.name

    profiles.cfdn[profileName] = {
      aws_access_key_id: profile.aws_access_key_id,
      aws_secret_access_key: profile.aws_secret_access_key,
      region: profile.region,
    }

    if (configuredCfdn) fs.ensureDirSync(`${home}/.cfdn`)

    fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })

    return profileName
  } catch (error) {
    throw error
  }
}

exports.addProfile = async function addProfile (env) {
  log.p()
  const home = os.homedir()
  let profileName

  try {
    profileName = await exports._addProfile(env, home)
  } catch (error) {
    throw error
  }

  log.p()
  log.s(`profile ${chk.cyan(profileName)} created.`)
  log.m(`Use ${chk.cyan(`--profile ${profileName}`)} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.\n`)
}

exports.removeProfile = function removeProfile (env) {
  log.p('remove profile')
}

exports.updateProfile = function updateProfile (env) {
  log.p('update profile')
}

exports.listProfiles = function listProfiles () {
  log.p()

  const home = os.homedir()

  if (!hasConfiguredCfdn(home)) {
    log.e('You have no CFDN Profiles Setup')
    return log.m(`run ${chk.cyan('import-profiles')} or ${chk.cyan('add-profile')}.\n`)
  }

  try {
    const profiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)
    const { aws, cfdn } = profiles

    if (!aws && !cfdn) {
      log.e('You have no CFDN Profiles Setup')
      return log.m(`run ${chk.cyan('import-profiles')} or ${chk.cyan('add-profile')}.\n`)
    }

    const awsProfiles = Object.keys(aws)
    const cfdnProfiles = Object.keys(cfdn)

    if (cfdnProfiles.length > 0) {
      log.p('CloudFoundation Profiles')
      log.p('------------------------')
      cfdnProfiles.forEach((p) => {
        const {
          aws_access_key_id,
          aws_secret_access_key,
          region,
        } = cfdn[p]

        log.p(`[${p}]`)
        log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
        log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
        log.p(`region: ${region}\n`)
      })
    }

    if (awsProfiles.length > 0) {
      log.p('Imported AWS Profiles')
      log.p('------------------------')
      awsProfiles.forEach((p) => {
        const {
          aws_access_key_id,
          aws_secret_access_key,
          region,
        } = aws[p]

        log.p(`[${p}]`)
        log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
        log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
        log.p(`region: ${region}\n`)
      })
    }

    log.i(`To configure and manage profiles for usage with ${chk.cyan('cfdn')}:`)
    log.m(`Run ${chk.cyan('cfdn import-profiles')} to import AWS profiles for usage with ${chk.cyan('cfdn')} or...`)
    return log.m(`Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`)
  } catch (error) {
    throw error
  }
}
