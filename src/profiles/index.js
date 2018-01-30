const inq = require('inquirer')
const fs = require('fs-extra')
const os = require('os')
const chk = require('chalk')
const {
  log,
  hasConfiguredCfdn,
} = require('../utils')

const {
  hasAWSCreds,
  getAWSCreds,
  parseAWSCreds,
  mergeAWSCreds,
} = require('../utils/aws')

exports.parseProfileOption = function parseProfileOption (profile) {
  const p = profile.split('.')
  return {
    name: p[0],
    type: p[1] === 'aws' ? 'aws' : 'cfdn',
  }
}

exports._getProfiles = function getProfiles (homedir) {
  const home = homedir || os.homedir()
  const configuredCfdn = hasConfiguredCfdn(home)
  let profiles

  if (configuredCfdn) {
    profiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)
  } else {
    fs.ensureDirSync(`${home}/.cfdn`)
  }

  profiles = profiles || {}

  return profiles
}

exports._getLocalProfiles = function getLocalProfiles (cwd) {}

exports._getProfile = (name, type) => {
  try {
    const profiles = this._getProfiles()

    if (type) {
      return {
        ...profiles[type][name],
        name,
        type,
      }
    }

    if (profiles.cfdn && profiles.cfdn[name]) return { ...profiles.cfdn[name], name, type: 'cfdn' }

    return profiles.aws && { ...profiles.aws[name], name, type: 'aws' }
  } catch (error) {
    throw error
  }
}

exports.importAWSProfiles = function importAWSProfiles (homedir) {
  try {
    const home = homedir || os.homedir()
    const { creds, config } = getAWSCreds()
    const parsedProfiles = parseAWSCreds(creds)
    const regions = parseAWSCreds(config, true)
    const awsProfiles = mergeAWSCreds(parsedProfiles, regions)
    const cfdnProfiles = exports._getProfiles(home)

    cfdnProfiles.aws = awsProfiles

    fs.writeJSONSync(`${home}/.cfdn/profiles.json`, cfdnProfiles, { spaces: 2 })
  } catch (error) {
    throw error
  }
}

// Accepts a Profiles Object
exports.importAWSProfile = async function importAwsProfile (existingProfiles) {
  const { creds, config } = getAWSCreds()
  const parsedProfiles = parseAWSCreds(creds)
  const regions = parseAWSCreds(config, true)
  const awsProfiles = mergeAWSCreds(parsedProfiles, regions)

  const choices = Object.keys(awsProfiles).filter(p => existingProfiles && existingProfiles.includes(p))

  const profile = await inq.prompt({
    type: 'list',
    message: 'Which AWS Profile would you like to use?',
    name: 'use',
    choices,
  })

  return {
    [profile.use]: awsProfiles[profile.use],
  }
}

// Accepts a string Name and a Profiles Object
exports.setupProfile = async function setupProfile (name, existingProfiles) {
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

  return {
    [profileName]: {
      aws_access_key_id: profile.aws_access_key_id,
      aws_secret_access_key: profile.aws_secret_access_key,
      region: profile.region,
    },
  }
}

// What should this do?
// Well, we more or less need a local and global
// If local, it needs to write it to the current directory's
exports.addProfile = async function addCFDNProfile (name, homedir) {
  const home = homedir || os.homedir()

  const profiles = exports._getProfiles(home)

  if (profiles[name]) {
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

    fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })

    return profileName
  } catch (error) {
    throw error
  }
}

exports.checkValidProfile = function validProfile (profile) {
  const profiles = exports._getProfiles()
  const profilesExist = Object.keys(profiles.cfdn).length + Object.keys(profiles.aws).length

  if (!profilesExist) throw new Error(`No profiles are configured.  Please use ${chk.cyan('add-profiles')} or ${chk.cyan('import-profiles')} to set some up.`)

  if (!profiles.cfdn[profile] && !profiles.aws[profile]) {
    throw new Error(`Profile ${chk.cyan(profile)} does not exit!`)
  }
}

exports.writeGlobalProfiles = function writeGlobalProfiles (profiles, homedir) {
  const home = homedir || os.homedir()
  try {
    fs.ensureDirSync(`${home}/.cfdn`)
    fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })
  } catch (error) {
    throw error
  }
}

exports.writeLocalProfiles = function writeLocalProfiles (profiles) {}

// TODO UPDATE
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
    throw error
  }

  log.p()
  return log.i('Import complete!\n')
}

// The `cfdn add-profile` method
exports.add = async function addProfile (env, opts) {
  log.p()
  const global = opts && opts.global
  const local = opts && opts.local
  const aws = opts && opts.aws
  const cfdn = opts && opts.cfdn
  let profileName
  let profiles
  let profile
  let scope

  if (global && local) throw new Error(`Select one of either ${chk.cyan('-g|--global')} or ${chk.cyan('-l|--local')} only.`)
  if (aws && cfdn) throw new Error(`Select one of either ${chk.cyan('-a|--aws')} or ${chk.cyan('-c|--cfdn')}only.`)

  if (global) {
    scope = 'global'
    profiles = this._getProfiles()
  } else if (local) {
    scope = 'local'
    profiles = this._getLocalProfiles()
  } else if (!local || !global) {
    const scopeInq = await inq.prompt({
      type: 'list',
      default: 'local',
      name: 'type',
      message: 'Would you like to set up a Local or Global Profile?',
      choices: [
        { name: 'Local', value: 'local' },
        { name: 'Global', value: 'global' },
      ],
    })

    scope = scopeInq.type
    profiles = scopeInq.type === 'global'
      ? this._getProfiles()
      : this._getLocalProfiles
  }

  if (aws) {
    profile = this.importAwsProfile(profiles)
  } else if (cfdn) {
    profile = this.setupProfile(profiles)
  } else if (!aws || !cfdn) {
    const add = await inq.prompt({
      type: 'list',
      default: 'cfdn',
      name: 'type',
      message: 'Which type of profile would you like to add?',
      choices: [
        { name: 'Setup a CFDN Profile', value: 'cfdn' },
        { name: 'Import an AWS Profile', value: 'aws' },
      ],
    })

    profile = add.type === 'aws'
      ? this.importAwsProfile(profiles)
      : this.setupProfile(profiles)
  }

  profiles = { ...profiles, ...profile }

  if (scope === 'global') {
    this.writeGlobalProfiles(profiles)
  } else {
    this.writeLocalProfiles(profiles)
  }

  log.p()
  log.s(`profile ${chk.cyan(profileName)} created.\n`)
  log.i(`Use ${chk.cyan(`--profile ${profileName}`)} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.\n`)
}

// TODO Update
exports.selectProfile = async function selectProfile (action, profiles, onlyCfdn) {
  try {
    if (!profiles) profiles = exports._getProfiles()

    const { cfdn, aws } = profiles
    let choices = cfdn ? Object.keys(cfdn) : []
    let type = 'cfdn'

    if (!onlyCfdn) {
      const awsProfiles = aws
        ? Object.keys(aws).reduce((prev, curr) => (prev.concat(`${curr} (aws)`)), [])
        : []
      choices = choices.concat(awsProfiles)
    }

    let choice = await inq.prompt([
      {
        type: 'list',
        message: `Which profile would you like to ${action}?`,
        name: 'profile',
        choices,
      },
    ])

    choice = choice.profile.split(' (aws)')[0]

    if (profiles.aws[choice]) type = 'aws'

    return { ...profiles[type][choice], name: choice, type }
  } catch (error) {
    throw error
  }
}


// TODO UPDATE
exports.removeProfile = async function removeProfile (env) {
  log.p()
  const home = os.homedir()
  const profiles = exports._getProfiles(home)
  let name = env
  let type = 'cfdn'

  if (!name) {
    const profile = await exports.selectProfile('remove', profiles)
    name = profile.name
  }

  if (!profiles.cfdn[name] && !profiles.aws[name]) {
    return log.e(`Profile ${chk.cyan(name)} does not exist!\n`)
  }

  if (profiles.aws[name]) type = 'aws'

  try {
    if (type === 'aws') log.i(`Profile ${chk.cyan(name)} will only be removed from CFDN, but not from the AWS CLI.\n`)

    const message = `Are you sure you want to remove the profile ${chk.cyan(name)}?`

    const confirm = await inq.prompt([
      {
        type: 'confirm',
        message,
        default: false,
        name: 'remove',
      },
    ])

    if (!confirm.remove) return false

    delete profiles[type][name]

    fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })

    log.p()
    return log.s(`Profile ${chk.cyan(name)} removed.\n`)
  } catch (error) {
    throw error
  }
}


// TODO UPDATE
exports.updateProfile = async function updateProfile (env) {
  log.p()
  const home = os.homedir()
  const profiles = exports._getProfiles(home)
  let name = env

  log.i('Only CFDN profiles can be updated.  AWS ones must be configured through the AWS CLI.\n')

  if (!name) {
    const profile = await exports.selectProfile('remove', profiles)
    name = profile.name
  }

  if (!profiles.cfdn[name] && !profiles.aws[name]) {
    return log.e(`Profile ${chk.cyan(name)} does not exist!\n`)
  }

  if (!profiles.cfdn[name] && profiles.aws[name]) {
    log.e('You can only update CFDN profiles.')
    return log.m(`To update AWS profiles, configure them through the AWS CLI and then use ${chk.cyan('cfdn import-profiles')}.\n`)
  }

  const { aws_access_key_id, aws_secret_access_key, region } = profiles.cfdn[name]

  try {
    const update = await inq.prompt([
      {
        type: 'input',
        name: 'aws_access_key_id',
        message: `Change ${chk.cyan(name)}'s aws_access_key_id to:`,
        default: aws_access_key_id,
      },
      {
        type: 'input',
        name: 'aws_secret_access_key',
        message: `Change ${chk.cyan(name)}'s aws_secret_access_key to:`,
        default: aws_secret_access_key,
      },
      {
        type: 'input',
        name: 'region',
        message: `Change ${chk.cyan(name)}'s region to:`,
        default: region,
      },
    ])

    profiles.cfdn[name] = update

    fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })
  } catch (error) {
    log.e(error.message)
    throw error
  }

  log.p()
  return log.s(`Profile ${chk.cyan(name)} successfully updated!\n`)
}


// TODO UPDATE
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
