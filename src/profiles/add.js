const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const profileUtils = require('./utils.js')

module.exports = function exportAddProfile (...args) {
  return module.exports.addProfile.apply(this, args)
}

module.exports.addProfile = async function addProfile (env, opts = {}) {
  utils.log.p()
  const name = env
  const { global, local, aws, cfdn } = opts
  let profile

  if (aws && cfdn) throw new Error(`Select one of either ${chk.cyan('-a|--aws')} or ${chk.cyan('-c|--cfdn')}only.`)

  const { profiles, scope } = await profileUtils.getScopedProfiles(global, local)

  if (aws) {
    profile = await profileUtils.importAWSProfile(name, profiles)
  } else if (cfdn) {
    profile = await profileUtils.setupCFDNProfile(name, profiles)
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
      ? await profileUtils.importAWSProfile(name, profiles)
      : await profileUtils.setupCFDNProfile(name, profiles)
  }

  const updatedProfiles = { ...profiles, ...profile }

  if (scope === 'global') profileUtils.writeGlobalProfiles(updatedProfiles)
  else profileUtils.writeLocalProfiles(updatedProfiles)

  const profileName = Object.keys(profile)[0]

  utils.log.s(`Profile ${chk.cyan(profileName)} created.`, 1)
  return utils.log.i(`Use ${chk.cyan(`--profile ${profileName}`)} with ${chk.cyan('deploy, update, or validate')} to make use of the credentials and region.`, 3)
}
