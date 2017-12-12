const cmd = require('commander')
const init = require('./init')
const { build, buildAll } = require('./build')
const create = require('./create')
const validate = require('./validate')
const { checkValidProject } = require('./utils')


cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(init)

// TODO: import and use checkValidProject here so that I don't have to sprinkle that everywhere

cmd
  .command('build [templatename]')
  .description('build down [templatename] CloudFormation template')
  .action((e, o) => checkValidProject('build [templatename]', build, e, o))

cmd
  .command('build-all')
  .description('build down all CloudFormation templates')
  .action((e, o) => checkValidProject('build-all', buildAll, e, o))

cmd
  .command('create [templatename]')
  .description('create a new template named <templatename>')
  .action((e, o) => checkValidProject('create [templatename]', create, e, o))

cmd
  .command('validate [templatename]')
  .description('validate [templatename] for both valid JSON and CloudFormation syntax')
  .action((e, o) => checkValidProject('validate [templatename]', validate, e, o))

cmd
  .command('deploy [templatename]')
  .description('deploy [templatename] template')
  .action((e, o) => checkValidProject('deploy [templatename]', () =>  console.log('temp'), e, o))

cmd
  .command('update <templatename>')
  .description('update <templatename> template')
  .action(() => {
    console.log('building')
  })

cmd
  .command('add <filepath>')
  .description('add an AWS resource to the specified file')
  .option('-r, --resource [resource]', 'exact name of the CFN resource to add to the file i.e. AWS::EC2::Instance')
  .action((env, options) => {
    console.log(env, options)
  })

cmd.parse(process.argv)

const validArgs = ['init', 'build', 'build-all', 'add', 'create', 'validate', 'deploy']
// console.log(cmd.args,  cmd._execs)

if (cmd.args.length < 1 || validArgs.indexOf(cmd.args[cmd.args.length - 1]._name) === -1) {
  cmd.help()
}
