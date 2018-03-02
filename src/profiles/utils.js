const inq = require('inquirer')
const fs = require('fs-extra')
const os = require('os')
const chk = require('chalk')
const utils = require('../utils')
const awsUtils = require('../utils/aws')

exports.hasGlobalProfiles = function hasGlobalProfiles (homedir) {
  const home = homedir || os.homedir()
  return fs.existsSync(`${home}/.cfdn/profiles.json`)
}

exports.getGlobalProfiles = function getGlobalProfiles (homedir) {
  const home = homedir || os.homedir()
  let profiles

  if (exports.hasGlobalProfiles(home)) {
    profiles = fs.readJsonSync(`${home}/.cfdn/profiles.json`)
  } else {
    fs.ensureDirSync(`${home}/.cfdn`)
  }

  profiles = profiles || {}

  return profiles
}

exports.getLocalProfiles = function getLocalProfiles (currentdir) {
  const cwd = currentdir || process.cwd()
  if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) throw new Error('No local .cfdnrc file found!  Make sure you\'re in a valid project directory.')
  return fs.readJsonSync(`${cwd}/.cfdnrc`).profiles || {}
}

// Returns both the scope of the profiles, and the profiles themselves
exports.getScopedProfiles = async function getProfiles (global, local, action = 'set up') {
  let profiles
  let scope

  if (global && local) throw new Error(`Select one of either ${chk.cyan('-g|--global')} or ${chk.cyan('-l|--local')} only.`)

  if (global) {
    scope = 'global'
    profiles = exports.getGlobalProfiles()
  } else if (local) {
    scope = 'local'
    profiles = exports.getLocalProfiles()
  } else {
    const scopeInq = await inq.prompt({
      type: 'list',
      default: 'local',
      name: 'type',
      message: `Would you like to ${action} a Local or Global Profile?`,
      choices: [
        { name: `Local ${chk.gray('(this project only)')}`, value: 'local' },
        { name: `Global ${chk.gray('(all projects)')}`, value: 'global' },
      ],
    })

    scope = scopeInq.type
    profiles = scope === 'global'
      ? exports.getGlobalProfiles()
      : exports.getLocalProfiles()
  }

  return { scope, profiles }
}

/* Creating a profile via Setup or Import */

// Accepts a Profiles Object
exports.importAWSProfile = async function importAwsProfile (name, existingProfiles) {
  const awsProfiles = awsUtils.getAWSProfiles()
  const existing = existingProfiles && Object.keys(existingProfiles)
  let profileName = name

  const choices = Object.keys(awsProfiles).filter(p => existing && !existing.includes(p))

  utils.log.i('Profiles already imported are omitted from the below choices.', 2)

  if (!profileName) {
    const profile = await inq.prompt({
      type: 'list',
      message: 'Which AWS Profile would you like to use?',
      name: 'use',
      choices,
    })
    profileName = profile.use
  }

  if (existing.includes(profileName)) throw new Error(`Profile ${chk.cyan(profileName)} already exists!`)
  if (!awsProfiles[profileName]) throw new Error(`Profile ${chk.cyan(profileName)} does not exist!`)

  return {
    [profileName]: awsProfiles[profileName],
  }
}

// Accepts a string Name and a Profiles Object
exports.setupCFDNProfile = async function setupProfile (name, existingProfiles) {
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

  let profileName = name || 'main'

  if (profile.name) profileName = profile.name
  if (Object.keys(existingProfiles).includes(profileName)) throw new Error(`${chk.cyan(profileName)} already exists!`)

  return {
    [profileName]: {
      aws_access_key_id: profile.aws_access_key_id,
      aws_secret_access_key: profile.aws_secret_access_key,
      region: profile.region,
    },
  }
}

// Both of these writes assume that you're passing back the the FULL updated profiles object...
// not just an individual profile addition / removal / update
exports.writeGlobalProfiles = function writeGlobalProfiles (profiles, homedir) {
  const home = homedir || os.homedir()
  fs.ensureDirSync(`${home}/.cfdn`)
  fs.writeJsonSync(`${home}/.cfdn/profiles.json`, profiles, { spaces: 2 })
}

exports.writeLocalProfiles = function writeLocalProfiles (profiles, dir) {
  const cwd = dir || process.cwd()
  const path = `${cwd}/.cfdnrc`
  const rc = fs.readJsonSync(path)

  rc.profiles = profiles
  fs.writeJsonSync(path, rc, { spaces: 2 })
}

// Profiles are an object of { profilename: { ...profileData } }, Message is the wording for selecting a profile
exports.selectProfile = async function selectProfile (profiles, message) {
  const msg = message || 'Which profile would you like to use?'
  const choices = Object.keys(profiles)

  const profile = await inq.prompt({
    type: 'list',
    message: msg,
    name: 'choice',
    choices,
  })

  return {
    ...profiles[profile.choice],
    name: profile.choice,
  }
}


// Get and Select from ALL Profiles.  Local take priority over Global.
exports.getFromAllProfiles = function getFromAllProfiles (name) {
  const global = exports.getGlobalProfiles()
  const local = exports.getLocalProfiles()

  if (local[name]) return { name, ...local[name] }
  if (global[name]) return { name, ...global[name] }

  throw new Error(`Profile ${chk.cyan(name)} not found!`)
}

exports.selectFromAllProfiles = async function selectFromAllProfiles (message) {
  const msg = message || 'Which profile would you like to use?'

  const global = Object.entries(exports.getGlobalProfiles())
    .map(([name, profile]) => ({
      name,
      value: { name, ...profile },
    }))

  const local = Object.entries(exports.getLocalProfiles())
    .map(([name, profile]) => ({
      name,
      value: { name, ...profile },
    }))

  let choices = []

  if (!local.length && !global.length) throw new Error('No CFDN Profiles set up.')

  if (local.length) {
    choices = choices.concat([
      new inq.Separator('\n  [Local Profiles]'),
    ], local)
  }

  if (global.length) {
    choices = choices.concat([
      new inq.Separator('\n  [Global Profiles]'),
    ], global)
  }

  const profile = await inq.prompt({
    type: 'list',
    choices,
    message: msg,
    name: 'use',
  })

  return profile.use
}
