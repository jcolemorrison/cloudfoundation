const cmd = require('commander')
const init = require('./init')

cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(init)

cmd
  .command('build')
  .description('build down all CloudFormation templates')
  .action(() => {
    console.log('building')
  })

cmd
  .command('deploy <stackname>')
  .description('deploy <stackname> template')
  .action((env, options) => {
    console.log(env)
  })

cmd
  .command('update <stackname>')
  .description('update <stackname> template')
  .action(() => {
    console.log('building')
  })

cmd
  .command('create <stackname>')
  .description('create a new stack named <stackname>')
  .action(() => {
    console.log('creating')
  })

cmd
  .command('add <filepath>')
  .description('add an AWS resource to the specified file')
  .option("-r, --resource [resource]", "exact name of the CFN resource to add to the file i.e. AWS::EC2::Instance")
  .action((env, options) => {
    console.log(env, options)
  })

cmd.parse(process.argv)

const validArgs = ['init', 'build', 'add']
// console.log(cmd.args,  cmd._execs)

if (cmd.args.length < 1 || validArgs.indexOf(cmd.args[cmd.args.length - 1]._name) === -1) {
  cmd.help()
}
