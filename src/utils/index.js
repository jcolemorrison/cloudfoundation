const fs = require('fs-extra')
const chk = require('chalk')
const AWS = require('aws-sdk')

const createRcFile = (input) => {

}

exports.checkValidProject = (cmd) => {
  if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) {
    throw new Error(`${chk.red('error')} ${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  }
}

exports.AWS = () => {
  let rc

  try {
    rc = fs.readFileSync(`${process.cwd()}/.cfdnrc`, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('.cfdnrc file not found!')
    throw error
  }

  rc = JSON.parse(rc)

  if (rc.AWS_ACCESS_KEY_ID && rc.AWS_SECRET_ACCESS_KEY && rc.AWS_DEFAULT_REGION) {
    AWS.config.update({
      accessKeyId: rc.AWS_ACCESS_KEY_ID,
      secretAccessKey: rc.AWS_SECRET_ACCESS_KEY,
      region: rc.AWS_DEFAULT_REGION,
    })
  }

  return AWS
}
