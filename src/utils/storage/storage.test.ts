import { load, loadString, save, saveString, clear, remove, getStorage } from "."

const VALUE_OBJECT = { x: 1 }
const VALUE_STRING = JSON.stringify(VALUE_OBJECT)

describe("MMKV Storage", () => {
  beforeEach(() => {
    getStorage().clearAll()
    getStorage().set("string", "string")
    getStorage().set("object", JSON.stringify(VALUE_OBJECT))
  })

  it("should be defined", () => {
    expect(getStorage()).toBeDefined()
  })

  it("should have default keys", () => {
    expect(getStorage().getAllKeys()).toEqual(["string", "object"])
  })

  it("should load data", () => {
    expect(load<object>("object")).toEqual(VALUE_OBJECT)
    expect(loadString("object")).toEqual(VALUE_STRING)

    expect(load<string>("string")).toEqual("string")
    expect(loadString("string")).toEqual("string")
  })

  it("should save strings", () => {
    saveString("string", "new string")
    expect(loadString("string")).toEqual("new string")
  })

  it("should save objects", () => {
    save("object", { y: 2 })
    expect(load<object>("object")).toEqual({ y: 2 })
    save("object", { z: 3, also: true })
    expect(load<object>("object")).toEqual({ z: 3, also: true })
  })

  it("should save strings and objects", () => {
    saveString("object", "new string")
    expect(loadString("object")).toEqual("new string")
  })

  it("should remove data", () => {
    remove("object")
    expect(load<object>("object")).toBeNull()
    expect(getStorage().getAllKeys()).toEqual(["string"])

    remove("string")
    expect(load<string>("string")).toBeNull()
    expect(getStorage().getAllKeys()).toEqual([])
  })

  it("should clear all data", () => {
    expect(getStorage().getAllKeys()).toEqual(["string", "object"])
    clear()
    expect(getStorage().getAllKeys()).toEqual([])
  })
})
