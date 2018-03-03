const expect = require('chai').expect
const sinon = require('sinon')
const chk = require('chalk')
const AWS = require('aws-sdk')
const os = require('os')
const fs = require('fs-extra')
const { NO_AWS_CREDENTIALS } = require('../../src/utils/constants.js')
const awsUtils = require('../../src/utils/aws.js')

describe('Aws Utility Functions', () => {
  describe('#configAWS', () => {
    const msg = `${chk.cyan('cfdn validate | deploy | update')} all require AWS Credentials (Access Key Id, Secret Key, Region) to be set.

${chk.white(`Please use ${chk.cyan('cfdn profiles')} to set up credentials OR configure the AWS CLI credentials.`)}

Crednetials setup via the AWS CLI are used otherwise, however you must set a region via ${chk.cyan('export AWS_REGION=region')}
`
    const origConfig = AWS.config

    beforeEach(() => {
      AWS.config = {
        credentials: {
          accessKeyId: null,
          secretAccessKey: null,
        },
        update (profile) {
          this.credentials.accessKeyId = profile.accessKeyId
          this.credentials.secretAccessKey = profile.secretAccessKey
          this.region = profile.region
        },
      }
    })

    afterEach(() => {
      AWS.config = origConfig
    })

    it('should return the configured AWS instance with a valid profile', () => {
      const profile = {
        aws_access_key_id: 'abcd',
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
      }

      awsUtils.configAWS(profile)
      expect(AWS.config.credentials.accessKeyId).to.equal('abcd')
    })

    it('should throw an error if no access key is set up', () => {
      const profile = {
        aws_access_key_id: null,
        aws_secret_access_key: 'efgh',
        region: 'us-east-1',
      }

      const result = () => { awsUtils.configAWS(profile) }
      expect(result).to.throw().with.property('message', msg)
    })

    it('shoudl throw an error if no profile is passed', () => {
      const result = () => { awsUtils.configAWS() }
      expect(result).to.throw().with.property('message', msg)
    })
  })

  describe('#hasAWSCreds', () => {
    let homedir
    let existsSync

    beforeEach(() => {
      homedir = sinon.stub(os, 'homedir')
      existsSync = sinon.stub(fs, 'existsSync')
    })

    afterEach(() => {
      homedir.restore()
      existsSync.restore()
    })

    it('should return true if both the creds and config exist', () => {
      existsSync.returns(true)

      const result = awsUtils.hasAWSCreds()

      expect(result).to.be.true
    })

    it('should return false if both the creds and config exist', () => {
      existsSync.returns(false)

      const result = awsUtils.hasAWSCreds()

      expect(result).to.be.false
    })
  })

  describe('#getAWSCreds', () => {
    let hasAWSCreds
    let readFileSync
    beforeEach(() => {
      hasAWSCreds = sinon.stub(awsUtils, 'hasAWSCreds')
      readFileSync = sinon.stub(fs, 'readFileSync')
    })

    afterEach(() => {
      hasAWSCreds.restore()
      readFileSync.restore()
    })

    it('should return the creds and config if the creds and config files exist', () => {
      hasAWSCreds.returns(true)
      readFileSync.onFirstCall().returns('creds')
      readFileSync.onSecondCall().returns('config')

      const result = awsUtils.getAWSCreds()

      expect(result.creds).to.equal('creds')
      expect(result.config).to.equal('config')
    })

    it('should throw an error if reading either file fails', () => {
      hasAWSCreds.returns(true)
      readFileSync.throws(new Error('error'))

      const result = () => awsUtils.getAWSCreds()

      expect(result).to.throw().with.property('message', 'error')
    })

    it('should throw an error if no credentials found', () => {
      hasAWSCreds.returns(false)

      const result = () => awsUtils.getAWSCreds()

      expect(result).to.throw().with.property('message', NO_AWS_CREDENTIALS)
    })
  })


  describe('#parseAWSCreds', () => {
    const credsFile = `[default]
aws_access_key_id = abcd
aws_secret_access_key = efgh
[test]
aws_access_key_id = abcd
aws_secret_access_key = efgh
`
    const configFile = `[default]
region = us-east-1
[profile test]
region = us-west-2
`

    beforeEach(() => {
    })

    afterEach(() => {
    })

    it('should parse AWS Credential Files into an object', () => {
      const result = awsUtils.parseAWSCreds(credsFile)

      expect(result).to.deep.equal({
        default: { aws_access_key_id: 'abcd', aws_secret_access_key: 'efgh' },
        test: { aws_access_key_id: 'abcd', aws_secret_access_key: 'efgh' },
      })
    })

    it('should parse AWS Config Files into an object', () => {
      const result = awsUtils.parseAWSCreds(configFile, true)

      expect(result).to.deep.equal({
        default: { region: 'us-east-1' },
        test: { region: 'us-west-2' },
      })
    })
  })


  describe('#mergeAWSCreds', () => {
    it('should merge credential and config objects into one by joining via profile name', () => {
      const profiles = {
        default: { aws_access_key_id: 'abcd', aws_secret_access_key: 'efgh' },
        test: { aws_access_key_id: 'abcd', aws_secret_access_key: 'efgh' },
      }
      const regions = {
        default: { region: 'us-east-1' },
        test: { region: 'us-west-2' },
      }

      expect(awsUtils.mergeAWSCreds(profiles, regions)).to.deep.equal({
        default: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-east-1',
        },
        test: {
          aws_access_key_id: 'abcd',
          aws_secret_access_key: 'efgh',
          region: 'us-west-2',
        },
      })
    })
  })

  describe('#getAWSProfiles', () => {
    let getAWSCreds
    let parseAWSCreds
    let mergeAWSCreds

    beforeEach(() => {
      getAWSCreds = sinon.stub(awsUtils, 'getAWSCreds')
      parseAWSCreds = sinon.stub(awsUtils, 'parseAWSCreds')
      mergeAWSCreds = sinon.stub(awsUtils, 'mergeAWSCreds')
    })

    afterEach(() => {
      getAWSCreds.restore()
      parseAWSCreds.restore()
      mergeAWSCreds.restore()
    })

    it('should call to all of the AWS Helpers in the correct order', () => {
      getAWSCreds.returns({ creds: 'creds', config: 'config' })
      parseAWSCreds.onFirstCall().returns({ profiles: 'profiles' })
      parseAWSCreds.onSecondCall().returns({ regions: 'regions' })
      mergeAWSCreds.returns({ merged: 'creds' })
      expect(awsUtils.getAWSProfiles()).to.deep.equal({ merged: 'creds' })
    })
  })
})
