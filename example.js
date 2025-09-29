const { remote } = require("webdriverio")
const _ = require("lodash")
const express = require("express")
const chalk = require("chalk")
const { createClient } = require("redis")
const moment = require("moment")
const fs = require("fs")

const ENV = {
  PORT: 5555,
  ULID: '736c7c4aded6659f',
  DEVICE: '2ca3777601017ece'
}

const delay = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration))

const accountRaw = fs.readFileSync(`./list_${ENV.DEVICE}.txt`, "utf-8")

const accounts = _.map(_.compact(_.split(accountRaw, "\n")), (o) => ({
  phoneNumber: _.trim(_.split(o, " ")[0]),
  pin: _.trim(_.split(o, " ")[1] || "888888"),
}))

const app = express()

const client = createClient({
  password: "PH76BbmFTphkp0u9jE8uK25C3PDIdJ5H",
  socket: {
    host: "redis-16623.c252.ap-southeast-1-1.ec2.cloud.redislabs.com",
    port: 16623,
  },
})

const capabilities = {
  platformName: "Android",
  "appium:automationName": "UiAutomator2",
  "appium:newCommandTimeout": "0",
  'appium:udid': ENV.DEVICE
}

const wdOpts = {
  host: process.env.APPIUM_HOST || "localhost",
  port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
  logLevel: "error",
  capabilities,
}

let driver

const selectOrSkip = (selector, timeout = 5000) =>
  Promise.race([
    new Promise(async(resolve) => {
      try {
        const el = await driver.$(selector)

        if (_.get(el, 'error.error')) {
          return resolve(null);
        }

        return resolve(el);
      } catch (error) {
        resolve(null);
      }
    }),
    new Promise((resolve) => setTimeout(() => resolve(null), timeout)),
  ])

const waitForSelector = async (selector) => {
  let el

  try {
    el = await driver.$(selector)

    if (_.get(el, 'error.error')) return waitForSelector(selector)
  } catch (error) {
    return waitForSelector(selector);
  }

  return el
}

const STEPS = {
  ENTER_PHONE: "enter_phone",
  CONTINUE_BUTTON: "continue_button",
  ENTER_PIN: "enter_pin",
  LINK_BANK_BANNER: "link_bank_banner",
  HOME_SEARCH_BAR: "home_search_bar",
  SEARCH: "search",
  UNDERSTAND_BANNER: "understand_banner",
  GET_RESULT: "get_result",
  FINISH: "finish",
  CANCEL_SEARCH: "cancel_search",
  GO_TO_PROFILE_TAB: "go_to_profile_tab",
  SCROLL_DOWN: "scroll_down",
  CHANGE_ACCOUNT: "change_account",
  CONFIRM_CHANGE_ACCOUNT: "confirm_change_account",
  AFTER_HOME_SEARCH_BAR: "after_home_search_bar",
}

let currentStep = ""

async function checkMomo(phoneNumber) {
  try {
    currentStep = STEPS.SEARCH

    const searchInput = await waitForSelector(
      '//android.widget.EditText[@content-desc="input_search"]'
    )

    await searchInput?.click()

    await searchInput?.clearValue()

    await driver.executeScript("mobile: type", [
      {
        text: phoneNumber,
      },
    ])

    // try {
    //   const xButton = await Promise.race([
    //     driver.$('//android.widget.TextView[@content-desc="Đã hiểu/Text"]'),
    //     new Promise((resolve, reject) => setTimeout(reject, 1000))
    //   ])

    //   await xButton?.click()

    //   const searchInput = await waitForSelector(
    //     '//android.widget.EditText[@content-desc="input_search"]'
    //   )

    //   await searchInput?.click()

    //   await searchInput?.clearValue()

    //   await driver.executeScript("mobile: type", [
    //     {
    //       text: phoneNumber,
    //     },
    //   ])
    // } catch (error) {}

    currentStep = STEPS.GET_RESULT

    const [nameEl, phoneEl] = await Promise.all([
      waitForSelector(
        "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.ViewGroup/android.widget.TextView[1]"
      ),
      waitForSelector(
        "//android.widget.ScrollView/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[2]/android.view.ViewGroup/android.widget.TextView[2]"
      ),
    ])

    const [name, phone] = await Promise.all([
      nameEl?.getText(),
      phoneEl?.getText(),
    ])

    currentStep = STEPS.FINISH

    return phoneNumber === phone ? name : null
  } catch (error) {
    console.error(error)
    return checkMomo(phoneNumber)
  }
}

const changeAccount = async (phoneNumber, pin) => {
  try {
    currentStep = STEPS.CANCEL_SEARCH

    const cancelButton = await waitForSelector(
      '//android.widget.TextView[@content-desc="Hủy/Text"]'
    )
    await cancelButton?.click()

    currentStep = STEPS.GO_TO_PROFILE_TAB

    const profileTab = await waitForSelector(
      '//android.view.View[@content-desc="btn_tabbar_tabbar_mywallet"]'
    )
    await profileTab?.click()

    currentStep = STEPS.SCROLL_DOWN

    await waitForSelector('//android.view.ViewGroup[@content-desc="screen_me"]')

    await driver.executeScript("mobile: scrollGesture", [
      {
        left: 500,
        top: 500,
        width: 5,
        height: 2000,
        direction: "down",
        percent: 5,
        speed: 20000,
      },
    ])
    // const startPercentage = 10;
    // const endPercentage = 90;
    // const anchorPercentage = 50;

    // const { width, height } = driver.getWindowSize();
    // const anchor = height * anchorPercentage / 100;
    // const startPoint = width * startPercentage / 100;
    // const endPoint = width * endPercentage / 100;
    // await driver.touchPerform([
    //   {
    //     action: 'press',
    //     options: {
    //       x: startPoint,
    //       y: anchor,
    //     },
    //   },
    //   {
    //     action: 'wait',
    //     options: {
    //       ms: 100,
    //     },
    //   },
    //   {
    //     action: 'moveTo',
    //     options: {
    //       x: endPoint,
    //       y: anchor,
    //     },
    //   },
    //   {
    //     action: 'release',
    //     options: {},
    //   },
    // ]);

    currentStep = STEPS.CHANGE_ACCOUNT

    const changeAccountButton = await waitForSelector(
      '//android.widget.TextView[@content-desc="Đổi tài khoản/Text"]'
    )
    await changeAccountButton?.click()

    currentStep = STEPS.CONFIRM_CHANGE_ACCOUNT

    const confirmChangeAccountButton = await waitForSelector(
      '//android.view.View[@resource-id="ĐỒNG Ý/Button"]'
    )
    await confirmChangeAccountButton?.click()

    const enterPhoneInput = await waitForSelector(
      '//android.widget.EditText[@resource-id="PhoneInput"]'
    )

    currentStep = STEPS.ENTER_PHONE

    await enterPhoneInput?.click()
    await enterPhoneInput?.clearValue()
    await driver.executeScript("mobile: type", [
      {
        text: phoneNumber,
      },
    ])

    currentStep = STEPS.CONTINUE_BUTTON

    const continueButton = await waitForSelector(
      '//android.view.View[@resource-id="Tiếp tục/Button"]'
    )
    await continueButton?.click()

    await delay(1000);

    const enterPasswordInput = await waitForSelector(
      '//android.widget.EditText[@resource-id="PasswordInput"]'
    )

    currentStep = STEPS.ENTER_PIN

    await enterPasswordInput?.click()
    await enterPasswordInput?.clearValue()
    await driver.executeScript("mobile: type", [
      {
        text: pin,
      },
    ])

    const linkBankBanner = await selectOrSkip(
      '//android.widget.TextView[@content-desc="Chọn ngân hàng liên kết/Text"]',
      1500
    )
    if (!_.isEmpty(linkBankBanner)) {
      const xButton = await selectOrSkip(
        '//android.widget.ImageView[@content-desc="Image|https://img.mservice.com.vn/app/img/kits/navigation_close.png"]',
        1000
      )
      if (!_.isEmpty(xButton)) {
        await xButton?.click()
      }
    }

    // try {
    //   await Promise.race([
    //     driver.$('//android.widget.TextView[@content-desc="Chọn ngân hàng liên kết/Text"]'),
    //     new Promise((resolve, reject) => setTimeout(reject, 4000))
    //   ])

    //   const xButton = await waitForSelector('//android.widget.ImageView[@content-desc="Image|https://img.mservice.com.vn/app/img/kits/navigation_close.png"]')
    //   await xButton?.click()
    // } catch (error) {}

    currentStep = STEPS.HOME_SEARCH_BAR

    const searchStartUpButton = await waitForSelector(
      '//android.view.View[@resource-id="SearchBar"]'
    )
    await searchStartUpButton?.click()

    currentStep = STEPS.AFTER_HOME_SEARCH_BAR
  } catch (error) {
    console.error(error)
    return changeAccount(phoneNumber, pin)
  }
}

const queue = require("fastq").promise(worker, 1)

async function worker(arg) {
  const phoneNumber = arg

  const getNextAccount = async () => {
    let currentPhoneNumber = await client.get(`current_accounts:${ENV.DEVICE}`)

    if (_.isNil(currentPhoneNumber)) {
      await client.set(`current_accounts:${ENV.DEVICE}`, accounts[0].phoneNumber)
      await client.hSetNX(`devices:${ENV.DEVICE}`, accounts[0].phoneNumber, _.toString(0))
      await client.expireAt(`devices:${ENV.DEVICE}`, moment().endOf('day').unix())
      return accounts[0]
    }

    let accountIndex = _.findIndex(
      accounts,
      (account) => account.phoneNumber === currentPhoneNumber
    )

    if (accountIndex !== -1) {
      const account = accounts[accountIndex]

      const countRaw = await client.hGet(`devices:${ENV.DEVICE}`, account.phoneNumber)
      
      let count = _.isNil(countRaw) ? 0 : _.toNumber(countRaw)

      if (count < 100) return account
    }

    accountIndex = accountIndex < 0 ? 0 : accountIndex + 1

    while (true) {
      accountIndex = accountIndex > accounts.length - 1 ? 0 : accountIndex

      const account = accounts[accountIndex]

      const countRaw = await client.hGet(`devices:${ENV.DEVICE}`, account.phoneNumber)
      let count = _.isNil(countRaw) ? 0 : _.toNumber(countRaw)

      if (count < 100) {
        await changeAccount(account.phoneNumber, "888888")
        await client.set(`current_accounts:${ENV.DEVICE}`, account.phoneNumber)
        return account
      }

      accountIndex = accountIndex + 1
    }
  }

  const account = await getNextAccount()
  const countRaw = await client.hGet(`devices:${ENV.DEVICE}`, account.phoneNumber)
  let count = _.isNil(countRaw) ? 0 : _.toNumber(countRaw)

  const name = await checkMomo(phoneNumber)
  await client.hSet(`devices:${ENV.DEVICE}`, account.phoneNumber, _.toString(count + 1))
  await fs.appendFile(
    `./kq_${ENV.DEVICE}.txt`,
    `${moment().format("HH:mm:ss DD/MM/YYYY")}: ${
      account.phoneNumber
    } | ${phoneNumber} > ${name}\n`,
    _.identity
  )

  return name
}

let markTimestamp

let lastStep

// const recover = async () => {
//   const done = async () => {
//     await delay(3000)

//     return recover()
//   }

//   if (currentStep !== lastStep) {
//     markTimestamp = moment();
//   }

//   if (
//     !queue.idle() &&
//     currentStep === lastStep &&
//     moment().diff(markTimestamp, "seconds") > 30
//   ) {
//     //   const xButton = await Promise.race([
//     //     driver.$('//android.widget.TextView[@content-desc="Đã hiểu/Text"]'),
//     //     new Promise((resolve, reject) => setTimeout(reject, 1000))
//     //   ])

//     //   await xButton?.click()

//     //   const searchInput = await waitForSelector(
//     //     '//android.widget.EditText[@content-desc="input_search"]'
//     //   )

//     const xButton = await selectOrSkip(
//       'android.widget.TextView[@content-desc="Đã hiểu/Text"]',
//       1000
//     )

//     if (!_.isEmpty(xButton)) {
//       await xButton.click()

//       if (currentStep === STEPS.GET_RESULT) {
//         const searchInput = await selectOrSkip(
//           '//android.widget.EditText[@content-desc="input_search"]',
//           1000
//         )

//         if (!_.isEmpty(searchInput)) {
//           await searchInput?.click()

//           await searchInput?.clearValue()

//           await driver.executeScript("mobile: type", [
//             {
//               text: phoneNumber,
//             },
//           ])
//         }
//       }

//       return done()
//     }

//     const linkBankBanner = await selectOrSkip(
//       '//android.widget.TextView[@content-desc="Chọn ngân hàng liên kết/Text"]',
//       1000
//     )
//     if (!_.isEmpty(linkBankBanner)) {
//       const xButton = await selectOrSkip(
//         '//android.widget.ImageView[@content-desc="Image|https://img.mservice.com.vn/app/img/kits/navigation_close.png"]',
//         1000
//       )
//       await xButton?.click()

//       if (!_.isEmpty(xButton) && (currentStep === STEPS.AFTER_HOME_SEARCH_BAR || currentStep === STEPS.SEARCH)) {
//         const searchStartUpButton = await selectOrSkip(
//           '//android.view.View[@resource-id="SearchBar"]',
//           1000
//         )
//         await searchStartUpButton?.click()
//       }

//       return done();
//     }

//     const enterPasswordInput = await selectOrSkip(
//       '//android.widget.EditText[@resource-id="PasswordInput"]',
//       1000
//     )

//     if (!_.isEmpty(enterPasswordInput)) {
//       await enterPasswordInput?.click()
//       await enterPasswordInput?.clearValue()
//       await driver.executeScript("mobile: type", [
//         {
//           text: pin,
//         },
//       ])

//       return done();
//     }
//   }

//   lastStep = currentStep

//   await delay(1000)

//   return recover()
// }

const tryRecoverUnderstand = async() => {
  const xButton = await selectOrSkip(
    'android.widget.TextView[@content-desc="Đã hiểu/Text"]',
    1000
  )

  if (!_.isEmpty(xButton)) {
    await xButton.click()

    if (currentStep === STEPS.GET_RESULT) {
      const searchInput = await selectOrSkip(
        '//android.widget.EditText[@content-desc="input_search"]',
        1000
      )

      if (!_.isEmpty(searchInput)) {
        await searchInput?.click()

        await searchInput?.clearValue()

        await driver.executeScript("mobile: type", [
          {
            text: phoneNumber,
          },
        ])
      }
    }

    await delay(60000)

    return tryRecoverUnderstand()
  }

  await delay(5000)

  return tryRecoverUnderstand();
}

const tryRecoverBankLink = async() => {
  const linkBankBanner = await selectOrSkip(
    '//android.widget.TextView[@content-desc="Chọn ngân hàng liên kết/Text"]',
    1000
  )
  if (!_.isEmpty(linkBankBanner)) {
    const xButton = await selectOrSkip(
      '//android.widget.ImageView[@content-desc="Image|https://img.mservice.com.vn/app/img/kits/navigation_close.png"]',
      1000
    )
    await xButton?.click()

    if (!_.isEmpty(xButton) && (currentStep === STEPS.AFTER_HOME_SEARCH_BAR || currentStep === STEPS.SEARCH)) {
      const searchStartUpButton = await selectOrSkip(
        '//android.view.View[@resource-id="SearchBar"]',
        1000
      )
      await searchStartUpButton?.click()
    }

    await delay(60000)

    return tryRecoverBankLink();
  }

  await delay(5000)

  return tryRecoverBankLink();
}

const tryRecoverPasswordInput = async() => {
  const enterPasswordInput = await selectOrSkip(
    '//android.widget.EditText[@resource-id="PasswordInput"]',
    1000
  )

  if (!_.isEmpty(enterPasswordInput)) {
    await enterPasswordInput?.click()
    await enterPasswordInput?.clearValue()
    await driver.executeScript("mobile: type", [
      {
        text: '888888',
      },
    ])

    await delay(60000)

    return tryRecoverPasswordInput();
  }

  await delay(5000)

  return tryRecoverPasswordInput();
}

const isDepleted = async() => {
  const devices = await client.hGetAll(`devices:${ENV.DEVICE}`)

  return _.every(devices, (quota) => _.toNumber(quota) >= 100)
}

const init = async () => {
  driver = await remote(wdOpts)
  await client.connect()

  markTimestamp = moment()
  // recover()

  tryRecoverUnderstand()
  tryRecoverBankLink()
  tryRecoverPasswordInput()

  await Promise.all(_.map(accounts, async(account) => {
    await client.hSetNX(`devices:${ENV.DEVICE}`, account.phoneNumber, _.toString(0))
    await client.expireAt(`devices:${ENV.DEVICE}`, moment().endOf('day').unix())
  }))

  app.get('/health', async (req, res) => {
    console.log('check server')
    return res.status(200).send('OK')
  })

  app.get("/check-momo/:phoneNumber", async (req, res) => {
    const phoneNumber = _.get(req, "params.phoneNumber")

    if (queue.length() > 3) return res.send({
      status: 'processing'
    })

    if (await isDepleted()) return res.send({
      status: 'processing'
    })

    const result = await queue.push(phoneNumber)

    console.log(phoneNumber)

    return res.send({
      status: 'success',
      result,
    })
  })

  console.log(chalk.green("=============================== READY"))
}

init()

app.listen(ENV.PORT, () => {
  console.log(`Server is running on port ${ENV.PORT}`)
})
