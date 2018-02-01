const inq = require('inquirer')
const chk = require('chalk')
const {
  log,
} = require('../utils')

const {
  getProfiles,
  getLocalProfiles,
  importAWSProfile,
  setupProfile,
  writeGlobalProfiles,
  writeLocalProfiles,
} = require('./utils')

module.exports = async function addProfile (env, opts) {
  log.p()
  const name = env
  const { global, local, aws, cfdn } = opts
  let profiles
  let profile
  let scope

  if (global && local) throw new Error(`Select one of either ${chk.cyan('-g|--global')} or ${chk.cyan('-l|--local')} only.`)
  if (aws && cfdn) throw new Error(`Select one of either ${chk.cyan('-a|--aws')} or ${chk.cyan('-c|--cfdn')}only.`)

  if (global) {
    scope = 'global'
    profiles = getProfiles()
  } else if (local) {
    scope = 'local'
    profiles = getLocalProfiles()
  } else {
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
    profiles = scope === 'global'
      ? getProfiles()
      : getLocalProfiles()
  }

  if (aws) {
    profile = await importAWSProfile(name, profiles)
  } else if (cfdn) {
    profile = await setupProfile(name, profiles)
  } else {
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
      ? await importAWSProfile(name, profiles)
      : await setupProfile(name, profiles)
  }

  profiles = { ...profiles, ...profile }

  if (scope === 'global') {
    writeGlobalProfiles(profiles)
  } else {
    writeLocalProfiles(profiles)
  }

  const profileName = Object.keys(profile)[0]

  log.s(`Profile ${chk.cyan(profileName)} created.`, 1)
  log.i(`Use ${chk.cyan(`--profile ${profileName}`)} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`, 3)
}
