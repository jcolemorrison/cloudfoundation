const fs = require('fs-extra')
const chk = require('chalk')
const awsSdk = require('aws-sdk')

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
  // try for the region and the AWS vars
}
