const { exec } = require("child_process")
const path = require("path")
const { init } = require("./init")

function getAdbDevices() {
  return new Promise((resolve, reject) => {
    const adbPath = path.resolve(__dirname, "adb", "adb.exe")
    exec(`${adbPath} devices -l`, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(new Error(stderr))

      const lines = stdout.split("\n").map((l) => l.trim())
      const devices = []
      for (const line of lines) {
        // skip header and empty lines
        if (!line || line.startsWith("List of devices")) continue
        const parts = line.split(/\s+/)
        const serial = parts[0]
        const state = parts[1]
        if (!serial || !state) continue
        if (state !== "device") continue // ignore offline/unauthorized/etc
        devices.push(serial)
      }
      resolve(devices)
    })
  })
}

async function initRemoteForDevices(udids) {
  const drivers = {}
  await Promise.all(
    udids.map(async (udid) => {
      const driver = await init(udid)
      drivers[udid] = driver
      return driver
    })
  )
  return drivers
}

;(async () => {
  try {
    const udids = await getAdbDevices()
    if (udids.length === 0) {
      console.log("No connected Android devices found.")
      return
    }
    console.log(`Found ${udids.length} device(s):`, udids.join(", "))
    const drivers = await initRemoteForDevices(udids)
    console.log("Initialized remote sessions for:", Object.keys(drivers).join(", "))
  } catch (err) {
    console.error("Failed to initialize devices:", err)
    process.exitCode = 1
  }
})()
