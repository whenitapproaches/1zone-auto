const fs = require("fs")
const path = require("path")
const _ = require("lodash")

const ACC_FILE_PATH = path.resolve(__dirname, "acc.txt")

const readLines = () => {
  const content = fs.readFileSync(ACC_FILE_PATH, "utf-8")
  const rawLines = content.split("\n").map((l) => _.trim(l))
  return _.compact(rawLines)
}

let allItems = []
let reservedItems = new Set()
let finalizedItems = new Set()

try {
  allItems = readLines()
} catch (e) {
  allItems = []
}

const take = () => {
  const next = _.find(allItems, (line) => !finalizedItems.has(line) && !reservedItems.has(line))
  if (!next) return null
  reservedItems.add(next)
  return next
}

const final = (value) => {
  if (!reservedItems.has(value)) return false
  reservedItems.delete(value)
  finalizedItems.add(value)
  return true
}

const getQueueSnapshot = () => {
  return allItems.filter((line) => !finalizedItems.has(line))
}

const rewriteFile = () => {
  const remaining = getQueueSnapshot()
  const content = remaining.join("\n") + (remaining.length ? "\n" : "")
  fs.writeFileSync(ACC_FILE_PATH, content, "utf-8")
}

setInterval(rewriteFile, 5000)

module.exports = {
  take,
  final,
  getQueueSnapshot,
}


