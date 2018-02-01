const os = require('os')
const chk = require('chalk')
const { log } = require('../utils')
const {
  hasGlobalProfiles,
  getLocalProfiles,
  getGlobalProfiles,
} = require('./utils')

module.exports = async function listProfiles (opts) {
  log.p()
  const home = os.homedir()
  const cwd = process.cwd()
  const { local, global } = opts
  const all = !local && !global
  let locals
  let globals

  if ((global || all) && !hasGlobalProfiles(home)) {
    log.e('You have no Profiles setup', 1)
    return log.i(`run ${chk.cyan('cfdn add-profile')} or ${chk.cyan('cfdn import-profiles')}.`, 3)
  }

  if (local || all) locals = getLocalProfiles(cwd) // handles existence of local profiles
  if (global || all) globals = getGlobalProfiles(home)

  const localPairs = locals && Object.entries(locals)
  const globalPairs = globals && Object.entries(globals)

  if (localPairs && localPairs.length) {
    log.p(chk.green('Local Profiles (This project only)'))
    log.p('------------------------')
    localPairs.forEach(([name, data]) => {
      const {
        aws_access_key_id,
        aws_secret_access_key,
        region,
      } = data

      log.p(`[${name}]`)
      log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
      log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
      log.p(`region: ${region}\n`)
    })
  }

  if (globalPairs && globalPairs.length) {
    log.p(chk.green('Global Profiles (Use in any project)'))
    log.p('------------------------')
    globalPairs.forEach(([name, data]) => {
      const {
        aws_access_key_id,
        aws_secret_access_key,
        region,
      } = data

      log.p(`[${name}]`)
      log.p(`aws_access_key_id: ****${aws_access_key_id.substr(aws_access_key_id.length - 4)}`)
      log.p(`aws_secret_access_key: ****${aws_secret_access_key.substr(aws_secret_access_key.length - 4)}`)
      log.p(`region: ${region}\n`)
    })
  }


  log.i(`To configure and manage profiles for usage with ${chk.cyan('cfdn')}:`, 0)
  log.m(`Run ${chk.cyan('cfdn import-profiles')} to import AWS profiles for usage with ${chk.cyan('cfdn')} or...`)
  return log.m(`Run ${chk.cyan('cfdn add-profile')}, ${chk.cyan('update-profile')}, or ${chk.cyan('remove-profile')} to manage ${chk.cyan('cfdn')} profiles.\n`)
}
