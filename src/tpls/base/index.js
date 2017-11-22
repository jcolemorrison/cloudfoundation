'use strict'

const path = require('path')
const fs = require('fs')
const glob = require('glob')

function pathName(p) {
  if (!p) throw new Error('Valid path required')
  return p.substr(p.lastIndexOf('/') + 1).split('.')[0].toLowerCase()
}

function reduceDir(dir) {
  return glob.sync(`${dir}/**/*.+(js|json)`).reduce((files, file) => (
    Object.assign(files, require(path.resolve(file)))
  ), {})
}

function basePropType(prop) {
  const validProps = [
    'conditions',
    'description',
    'mappings',
    'metadata',
    'outputs',
    'parameters',
    'resources',
  ]

  const name = pathName(prop)

  if (validProps.lastIndexOf(name) === -1) {
    throw new Error(`\"${name}\" is not a valid CFN top level template property.\n
      Template top level directory must be one of:\n
      conditions/ or conditions.json\n
      description/ or description.json\n
      mappings/ or mappings.json\n
      metadata/ or metadata.json\n
      outputs/ or outputs.json\n
      parameters/ or parameters.json\n
      resources/ or resources.json
    `)
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

const Templates = glob.sync(`${__dirname}/src/*`)

const builds = Templates.map((t) => {
  const base = {
    "AWSTemplateFormatVersion": "2010-09-09"
  }
  const baseProps = glob.sync(`${t}/*`)

  baseProps.forEach((p) => {
    const isDir = fs.lstatSync(p).isDirectory()
    const bpt = basePropType(p)

    if (!isDir && bpt !== 'Description') {
      base[bpt] = require(path.resolve(p))
    } else if (!isDir && bpt === 'Description') {
      base[bpt] = require(path.resolve(p)).Description
    } else if (isDir && bpt === 'Description') {
      throw new Error('Description should be contained in \"description.json\" with one property \"Description\" and with a string value.')
    } else {
      base[bpt] = reduceDir(p)
    }
  })

  return {
    name: pathName(t),
    template: base
  }
})

const dist = `${__dirname}/dist`

console.log('')
builds.forEach((b) => {
  const name = b.name
  const template = JSON.stringify(b.template, null, "  ")
  const minTemplate = JSON.stringify(b.template)

  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist)
  }

  fs.writeFileSync(`${dist}/${b.name}.json`, template, 'utf8')
  fs.writeFileSync(`${dist}/${b.name}.min.json`, minTemplate, 'utf8')

  console.log(`Template \"${b.name}.json\" and \"${b.name}.min.json\" successfully built!`)
})
console.log('')
