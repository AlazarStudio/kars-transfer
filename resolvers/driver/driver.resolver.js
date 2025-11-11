import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs"
// import { uploadFiles } from "../../exports/uploadFiles.js"
import { uploadImage } from "../../exports/uploadImage.js"
import { DRIVER_CREATED, pubsub } from "../../exports/pubsub.js"
import { dateFormatter } from "../../exports/dateTimeFormatterVersion2.js"
import { uploadFiles } from "../../exports/uploadFiles.js"
// import { errorMonitor } from "ws"

const prisma = new PrismaClient()

const driverResolver = {
  Upload: GraphQLUpload,

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
    createDriver: async (
      _,
      {
        input,
        driverPhoto,
        carPhotos,
        stsPhoto,
        ptsPhoto,
        osagoPhoto,
        licensePhoto
      }
    ) => {
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
        registrationStatus
      } = input

      if (email || phone) {
        const existing = await prisma.driver.findFirst({
          where: {
            OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])]
          }
        })
        if (existing) {
          if (existing.email === email && existing.phone === phone)
            throw new Error("Водитель с таким email и телефоном уже существует")
          if (existing.email === email)
            throw new Error("Водитель с таким email уже существует")
          if (existing.phone === phone)
            throw new Error("Водитель с таким телефоном уже существует")
        }
      }

      const hashedPassword = password ? await argon2.hash(password) : undefined

      let driverPhotoPaths = []
      if (driverPhoto != undefined) {
        if (driverPhoto.length > 0) {
          for (const image of driverPhoto) {
            driverPhotoPaths.push(await uploadFiles(image))
          }
        }
      }
      let carPhotosPaths = []
      if (carPhotos != undefined) {
        if (carPhotos.length > 0) {
          for (const image of carPhotos) {
            carPhotosPaths.push(await uploadFiles(image))
          }
        }
      }
      let stsPhotoPaths = []
      if (stsPhoto != undefined) {
        if (stsPhoto.length > 0) {
          for (const image of stsPhoto) {
            stsPhotoPaths.push(await uploadFiles(image))
          }
        }
      }
      let ptsPhotoPaths = []
      if (ptsPhoto != undefined) {
        if (ptsPhoto.length > 0) {
          for (const image of ptsPhoto) {
            ptsPhotoPaths.push(await uploadFiles(image))
          }
        }
      }
      let osagoPhotoPaths = []
      if (osagoPhoto != undefined) {
        if (osagoPhoto.length > 0) {
          for (const image of osagoPhoto) {
            osagoPhotoPaths.push(await uploadFiles(image))
          }
        }
      }
      let licensePhotoPaths = []
      if (licensePhoto != undefined) {
        if (licensePhoto.length > 0) {
          for (const image of licensePhoto) {
            licensePhotoPaths.push(await uploadFiles(image))
          }
        }
      }

      const documents = {
        driverPhoto: driverPhotoPaths,
        carPhotos: carPhotosPaths,
        stsPhoto: stsPhotoPaths,
        ptsPhoto: ptsPhotoPaths,
        osagoPhoto: osagoPhotoPaths,
        licensePhoto: licensePhotoPaths
      }
      const data = {
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
        documents
      }

      console.log("data " + JSON.stringify(data))

      const newDriver = await prisma.driver.create({ data })

      pubsub.publish(DRIVER_CREATED, { driverCreated: newDriver })

      newDriver.createdAt = dateFormatter(newDriver.createdAt)
      newDriver.updatedAt = dateFormatter(newDriver.updatedAt)
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

      moscowDate["createdAt"] = dateFormatter(
        driverWithUpdatedDocs["createdAt"]
      )
      moscowDate["updatedAt"] = dateFormatter(
        driverWithUpdatedDocs["updatedAt"]
      )

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

export default driverResolver
