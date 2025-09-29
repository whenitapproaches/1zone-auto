const { remote } = require("webdriverio")

const capabilities = {
  platformName: "Android",
  "appium:automationName": "UiAutomator2",
  "appium:newCommandTimeout": "0",
}

const wdOpts = {
  host: "localhost",
  port: 4723,
  logLevel: "error",
  capabilities,
}

const buildOptions = (device) => {
  return {
    ...wdOpts,
    capabilities: {
      ...capabilities,
      'appium:udid': device
    },
  }
}

const init = async (deviceId) => {
  const driver = await remote(buildOptions(deviceId))

  return driver
}

module.exports = { init }

