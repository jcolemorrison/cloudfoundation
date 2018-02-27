const os = require('os')
const chk = require('chalk')
const utils = require('../utils')
const profileUtils = require('./utils.js')

exports.listLocalProfiles = (localPairs) => {
  utils.log.p(chk.green('Local Profiles (This project only)'))
  utils.log.p('------------------------')
  localPairs.forEach(([name, data]) => {
    const {
      aws_access_key_id,
      aws_secret_access_key,
      region,
    } = data

    utils.log.p(`[${name}]`)
    utils.log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
    utils.log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
    utils.log.p(`region: ${region}\n`)
  })
}

exports.listGlobalProfiles = (globalPairs) => {
  utils.log.p(chk.green('Global Profiles (Use in any project)'))
  utils.log.p('------------------------')
  globalPairs.forEach(([name, data]) => {
    const {
      aws_access_key_id,
      aws_secret_access_key,
      region,
    } = data

    utils.log.p(`[${name}]`)
    utils.log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
    utils.log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
    utils.log.p(`region: ${region}\n`)
  })
}

exports.listProfiles = async function listProfiles (opts = {}) {
  utils.log.p()
  const home = os.homedir()
  const cwd = process.cwd()
  const { local, global } = opts
  const all = !local && !global
  let locals
  let globals

  if (global && !profileUtils.hasGlobalProfiles(home)) {
    utils.log.e('You have no Profiles setup', 1)
    return utils.log.i(`Run ${chk.cyan('cfdn add-profile')} or ${chk.cyan('cfdn import-profiles')}.`, 3)
  }

  if (local || all) locals = profileUtils.getLocalProfiles(cwd) // handles existence of local profiles
  if (global || all) globals = profileUtils.getGlobalProfiles(home)

  const localPairs = locals && Object.entries(locals)
  const globalPairs = globals && Object.entries(globals)

  if (localPairs && localPairs.length) exports.listLocalProfiles(localPairs)

  if (globalPairs && globalPairs.length) exports.listGlobalProfiles(globalPairs)

  utils.log.i(`To configure and manage profiles for usage with ${chk.cyan('cfdn')}:`, 0)
  utils.log.m(`Run ${chk.cyan('cfdn import-profiles')} to import AWS profiles for usage with ${chk.cyan('cfdn')} or...`)
  return utils.log.m(`Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`)
}
