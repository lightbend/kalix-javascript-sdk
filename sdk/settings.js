const settings = {
  frameworkVersion: "0.7.0-beta.6",
  protocolVersion: function() {
    const versions = this.frameworkVersion.split(/[.-]/)
    return { major: versions[0], minor: versions[1] }
  },
  baseVersion: function() {
    const version = this.protocolVersion()
    return `${version.major}.${version.minor}`
  }
}

module.exports = settings
