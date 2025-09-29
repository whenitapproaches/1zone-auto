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
      const deviceSerials = []
      for (const line of lines) {
        // skip header and empty lines
        if (!line || line.startsWith("List of devices")) continue
        const parts = line.split(/\s+/)
        const serial = parts[0]
        const state = parts[1]
        if (!serial || !state) continue
        if (state !== "device") continue // ignore offline/unauthorized/etc
        deviceSerials.push(serial)
      }
      resolve(deviceSerials)
    })
  })
}

function getDeviceUdid(deviceSerial) {
  return new Promise((resolve, reject) => {
    const adbPath = path.resolve(__dirname, "adb", "adb.exe")
    exec(`${adbPath} -s ${deviceSerial} shell settings get secure android_id`, (error, stdout, stderr) => {
      if (error) return reject(error)
      if (stderr) return reject(new Error(stderr))
      
      const udid = stdout.trim()
      if (!udid) return reject(new Error(`No android_id found for device ${deviceSerial}`))
      resolve(udid)
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
    const deviceSerials = await getAdbDevices()
    if (deviceSerials.length === 0) {
      console.log("No connected Android devices found.")
      return
    }
    console.log(`Found ${deviceSerials.length} device(s):`, deviceSerials.join(", "))
    
    // Get UDIDs for each device
    const deviceUdidMap = {}
    for (const serial of deviceSerials) {
      try {
        const udid = await getDeviceUdid(serial)
        deviceUdidMap[serial] = udid
        console.log(`Device ${serial} -> UDID: ${udid}`)
      } catch (err) {
        console.error(`Failed to get UDID for device ${serial}:`, err.message)
      }
    }
    
    const udids = Object.values(deviceUdidMap)
    if (udids.length === 0) {
      console.log("No valid UDIDs found.")
      return
    }
    
    const drivers = await initRemoteForDevices(udids)
    console.log("Initialized remote sessions for UDIDs:", Object.keys(drivers).join(", "))
  } catch (err) {
    console.error("Failed to initialize devices:", err)
    process.exitCode = 1
  }
})()
