import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"
// import { uploadFiles } from "../../exports/uploadFiles.js"
import { uploadImage } from "../../exports/uploadImage.js"
import { DRIVER_CREATED, pubsub } from "../../exports/pubsub.js"
// import { errorMonitor } from "ws"

const prisma = new PrismaClient()

const driverResolver = {
  Query: {
    drivers: async (_, { pagination }) => {
      const { skip, take, all } = pagination || {}
      const totalCount = await prisma.driver.count({ where: { active: true } })
      const drivers = all
        ? await prisma.driver.findMany({
            where: { active: true },
            include: { organization: true }
          })
        : await prisma.driver.findMany({
            where: { active: true },
            skip: skip ? skip * take : undefined,
            take: take || undefined,
            include: { organization: true }
          })

      const moscowDates = []

      for (let driver of drivers) {
        moscowDates.push({
          createdAt:
            new Date(driver["createdAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[2] +
            "-" +
            new Date(driver["createdAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[1] +
            "-" +
            new Date(driver["createdAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[0] +
            "T" +
            new Date(driver["createdAt"]).toLocaleString().split(", ")[1],
          updatedAt:
            new Date(driver["updatedAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[2] +
            "-" +
            new Date(driver["updatedAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[1] +
            "-" +
            new Date(driver["updatedAt"])
              .toLocaleString()
              .split(", ")[0]
              .split(".")[0] +
            "T" +
            new Date(driver["updatedAt"]).toLocaleString().split(", ")[1]
        })
      }

      for (let i in moscowDates) {
        Object.assign(drivers[i], moscowDates[i])
      }

      return { drivers, totalCount }
    },
    driverById: async (_, { id }) => {
      const driver = await prisma.driver.findUnique({
        where: { id: id },
        include: { organization: true }
      })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driver["createdAt"]).toLocaleString().split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driver["updatedAt"]).toLocaleString().split(", ")[1]

      Object.assign(driver, moscowDate)

      return driver
    },
    driverByEmail: async (_, { email }) => {
      const driver = await prisma.driver.findUnique({
        where: { email: email },
        include: { organization: true }
      })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driver["createdAt"]).toLocaleString().split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driver["updatedAt"]).toLocaleString().split(", ")[1]

      Object.assign(driver, moscowDate)

      return driver
    }
  },
  Mutation: {
    createDriver: async (_, { input }) => {
      const {
        name,
        phone,
        email,
        password,
        car,
        vehicleNumber,
        driverLicenseNumber,
        driverLicenseIssueYear,
        extraEquipment,
        organizationId,
        registrationStatus,
        documents
      } = input

      let documentsPath = []
      if (documents && documents.length > 0) {
        for (const document of documents) {
          documentsPath.push(await uploadFiles(document))
        }
      }

      const hashedPassword = await argon2.hash(password)

      const existingDriver = await prisma.driver.findFirst({
        where: { OR: [{ email }, { phone }] }
      })

      if (existingDriver) {
        if (existingDriver.email === email && existingDriver.phone === phone) {
          throw new Error(
            "Водитель с таким email и телефоном уже существует",
            "DRIVER_EXISTS"
          )
        } else if (existingDriver.email === email) {
          throw new Error(
            "Водитель с таким email уже существует",
            "EMAIL_EXISTS"
          )
        } else if (existingDriver.phone === phone) {
          throw new Error(
            "Водитель с таким телефоном уже существует",
            "PHONE_EXISTS"
          )
        }
      }

      const createdData = clean({
        name,
        phone,
        email,
        password: hashedPassword,
        car,
        vehicleNumber,
        driverLicenseNumber,
        driverLicenseIssueYear,
        extraEquipment,
        organizationId,
        registrationStatus: registrationStatus ?? "PENDING",
        documents: await buildDocuments(documents)
      })

      // добавить логирование?

      const newDriver = await prisma.driver.create({ data: createdData })
      pubsub.publish(DRIVER_CREATED, { driverCreated: newDriver })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(newDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(newDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(newDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(newDriver["createdAt"]).toLocaleString().split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(newDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(newDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(newDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(newDriver["updatedAt"]).toLocaleString().split(", ")[1]

      Object.assign(newDriver, moscowDate)

      return newDriver
    },
    updateDriver: async (_, { id, input }) => {
      const updatedData = {}

      const currentDriver = await prisma.driver.findUnique({
        where: { id: id }
      })

      for (let key in input) {
        if (
          key !== "newPassword" &&
          key !== "oldPassword" &&
          input[key] !== undefined
        ) {
          updatedData[key] = input[key]
        }
      }

      if (input.newPassword) {
        if (!input.oldPassword)
          throw new Error("Для обновления пароля укажи старый.")
        const valid = await argon2.verify(
          currentDriver.password,
          input.oldPassword
        )
        if (!valid) throw new Error("Указан неверный пароль.")
        updatedData.password = await argon2.hash(input.newPassword)
      }

      const updatedDriver = await prisma.driver.update({
        where: { id: id },
        data: updatedData
      })

      pubsub.publish(DRIVER_CREATED, { driverCreated: updatedDriver })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(updatedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(updatedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(updatedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(updatedDriver["createdAt"]).toLocaleString().split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(updatedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(updatedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(updatedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(updatedDriver["updatedAt"]).toLocaleString().split(", ")[1]

      Object.assign(updatedDriver, moscowDate)

      return updatedDriver
    },
    updateDriverDocuments: async (_, { id, documents }) => {
      const setDocs = await uploadFiles(documents)
      await prisma.driver.update({
        where: { id },
        data: { documents: { set: setDocs } } // если это одна картинка
      })

      const driverWithUpdatedDocs = await prisma.driver.findUnique({
        where: { id }
      })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(driverWithUpdatedDocs["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driverWithUpdatedDocs["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driverWithUpdatedDocs["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driverWithUpdatedDocs["createdAt"])
          .toLocaleString()
          .split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(driverWithUpdatedDocs["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(driverWithUpdatedDocs["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(driverWithUpdatedDocs["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(driverWithUpdatedDocs["updatedAt"])
          .toLocaleString()
          .split(", ")[1]

      Object.assign(driverWithUpdatedDocs, moscowDate)

      return driverWithUpdatedDocs
    },
    deleteDriver: async (_, { id }) => {
      const deletedDriver = await prisma.driver.update({
        where: { id: id },
        include: { organization: true },
        data: {
          active: false
        }
      })

      const moscowDate = {}

      moscowDate["createdAt"] =
        new Date(deletedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(deletedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(deletedDriver["createdAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(deletedDriver["createdAt"]).toLocaleString().split(", ")[1]
      moscowDate["updatedAt"] =
        new Date(deletedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[2] +
        "-" +
        new Date(deletedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[1] +
        "-" +
        new Date(deletedDriver["updatedAt"])
          .toLocaleString()
          .split(", ")[0]
          .split(".")[0] +
        "T" +
        new Date(deletedDriver["updatedAt"]).toLocaleString().split(", ")[1]

      Object.assign(deletedDriver, moscowDate)

      return deletedDriver
    }
  },
  Driver: {
    organization: async (parent, _) => {
      return await prisma.organization.findUnique({
        where: { id: parent.organizationId }
      })
    }
  }
}

const clean = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

const buildDocuments = async (docsInput) => {
  if (!docsInput) return undefined
  const {
    driverPhoto,
    carPhotos,
    stsPhoto,
    ptsPhoto,
    osagoPhoto,
    licensePhoto
  } = docsInput

  const out = {}
  if (driverPhoto) out.driverPhoto = await uploadImage(driverPhoto)
  if (Array.isArray(carPhotos) && carPhotos.length)
    out.carPhotos = await Promise.all(carPhotos.map(uploadImage))
  if (stsPhoto) out.stsPhoto = await uploadImage(stsPhoto)
  if (ptsPhoto) out.ptsPhoto = await uploadImage(ptsPhoto)
  if (osagoPhoto) out.osagoPhoto = await uploadImage(osagoPhoto)
  if (licensePhoto) out.licensePhoto = await uploadImage(licensePhoto)

  return Object.keys(out).length ? { set: out } : undefined // <-- envelope!
}

export default driverResolver
