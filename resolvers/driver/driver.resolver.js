import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"
// import { uploadFiles } from "../../exports/uploadFiles.js"
import { uploadImage } from "../../exports/uploadImage.js"
import { DRIVER_CREATED, pubsub } from "../../exports/pubsub.js"
import { dateFormatter } from "../../exports/dateTimeFormatterVersion2.js"
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
            skip: skip,
            take: take,
            include: { organization: true }
          })

      const moscowDates = []

      for (let driver of drivers) {
        moscowDates.push({
          createdAt: dateFormatter(driver["createdAt"]),
          updatedAt: dateFormatter(driver["updatedAt"])
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

      moscowDate["createdAt"] = dateFormatter(driver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(driver["updatedAt"])

      Object.assign(driver, moscowDate)

      return driver
    },
    driverByEmail: async (_, { email }) => {
      const driver = await prisma.driver.findUnique({
        where: { email: email },
        include: { organization: true }
      })

      const moscowDate = {}

      moscowDate["createdAt"] = dateFormatter(driver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(driver["updatedAt"])

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
        documents: docsInput
      } = input

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

      const docs = await buildDocuments(docsInput, { envelopeForUpdate: false })

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
        ...(docs ? { documents: docs } : {})
      })

      // добавить логирование?

      const newDriver = await prisma.driver.create({ data: createdData })
      pubsub.publish(DRIVER_CREATED, { driverCreated: newDriver })

      const moscowDate = {}

      moscowDate["createdAt"] = dateFormatter(newDriver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(newDriver["updatedAt"])

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

      moscowDate["createdAt"] = dateFormatter(updatedDriver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(updatedDriver["updatedAt"])

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

      moscowDate["createdAt"] = dateFormatter(driverWithUpdatedDocs["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(driverWithUpdatedDocs["updatedAt"])

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

      moscowDate["createdAt"] = dateFormatter(deletedDriver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(deletedDriver["updatedAt"])
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

const buildDocuments = async (
  docsInput,
  { envelopeForUpdate = false } = {}
) => {
  if (!docsInput) return undefined

  const {
    driverPhoto,
    carPhotos,
    stsPhoto,
    ptsPhoto,
    osagoPhoto,
    licensePhoto
  } = docsInput

  const driverPhotoPath = driverPhoto
    ? await uploadImage(driverPhoto)
    : undefined
  const stsPhotoPath = stsPhoto ? await uploadImage(stsPhoto) : undefined
  const ptsPhotoPath = ptsPhoto ? await uploadImage(ptsPhoto) : undefined
  const osagoPhotoPath = osagoPhoto ? await uploadImage(osagoPhoto) : undefined
  const licensePhotoPath = licensePhoto
    ? await uploadImage(licensePhoto)
    : undefined

  const carPhotosArr =
    Array.isArray(carPhotos) && carPhotos.length
      ? await Promise.all(carPhotos.map(uploadImage))
      : []

  const out = {
    ...(driverPhotoPath ? { driverPhoto: driverPhotoPath } : {}),
    ...(stsPhotoPath ? { stsPhoto: stsPhotoPath } : {}),
    ...(ptsPhotoPath ? { ptsPhoto: ptsPhotoPath } : {}),
    ...(osagoPhotoPath ? { osagoPhoto: osagoPhotoPath } : {}),
    ...(licensePhotoPath ? { licensePhoto: licensePhotoPath } : {}),
    carPhotos: carPhotosArr
  }

  if (
    !out.driverPhoto &&
    !out.stsPhoto &&
    !out.ptsPhoto &&
    !out.osagoPhoto &&
    !out.licensePhoto &&
    out.carPhotos.length === 0
  )
    return undefined

  return envelopeForUpdate ? { set: out } : out
}

export default driverResolver
