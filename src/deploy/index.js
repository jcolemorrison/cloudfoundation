const fs = require('fs-extra')
const { log, inquireTemplateName } = require('../utils')

module.exports = async function deploy (env, opts) {
  const cwd = process.cwd()
  let templateName = env
  let stackName = opts && opts.stackname
  log.p('the env', env)
  log.p('the opts', opts && opts.stackname)
  return log.e('test')

  if (!templateName) {
    try {
      let templateName = inquireTemplateName()
    } catch (error) {
      return log.e(chk.red(error.message))
    }
  }
  // first we need to handle if there's a template and stack name
}
