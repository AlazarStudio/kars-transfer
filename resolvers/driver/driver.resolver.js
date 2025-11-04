import { PrismaClient } from "@prisma/client"
import argon2 from "argon2"
import { uploadFiles } from "../../exports/uploadFiles.js"
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
      return { drivers, totalCount }
    },
    driverById: async (_, { id }) => {
      return await prisma.driver.findUnique({
        where: { id: id },
        include: { organization: true }
      })
    },
    driverByEmail: async (_, { email }) => {
      return await prisma.driver.findUnique({
        where: { email: email },
        include: { organization: true }
      })
    }
  },
  Mutation: {
    createDriver: async (_, { input, documents }) => {
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

      let documents = []
      if (documents && documents.length > 0) {
        for (const document of documents) {
          documents.push(await uploadFiles(document))
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

      const createdData = {
        name,
        phone,
        email,
        password: hashedPassword,
        car,
        vehicleNumber,
        driverLicenseNumber,
        driverLicenseIssueYear,
        extraEquipment,
        organizationId: organizationId || undefined,
        documents,
        registrationStatus
      }

      // добавить логирование?

      const newdDriver = await prisma.driver.create({
        data: createdData
      })

      pubsub.publish(DRIVER_CREATED, { driverCreated: newdDriver })

      return newdDriver
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

      if (input["newPassword"]) {
        // if (input.newPassword) {
        if (!input["oldPassword"]) {
          throw new Error(
            "Для обновления пароля необходимо указать предыдущий пароль."
          )
        }
      }

      const valid = await argon2.verify(
        currentDriver.password,
        input["oldPassword"]
      )
      // const valid = await argon2.verify(currentDriver.password, input.oldPassword)

      if (!valid) {
        throw new Error("Указан неверный пароль.")
      }

      const hashedPassword = await argon2.hash(input["newPassword"])
      updatedData["password"] = hashedPassword

      const updatedDriver = await prisma.driver.update({
        where: { id: id },
        data: updatedData
      })

      pubsub.publish(DRIVER_CREATED, { driverCreated: updatedDriver })

      return updatedDriver
    },
    updateDriverDocuments: async (_, { id, documents }) => {
      const updatedDocumentsData = []

      updatedDocumentsData.push(await uploadFiles(documents))

      await prisma.driver.update({
        where: { id: id },
        data: {
          documents: updatedDocumentsData
        }
      })
    },
    deleteDriver: async (_, { id }) => {
      const deletedDriver = await prisma.driver.update({
        where: { id: id },
        include: { organization: true },
        data: {
          active: false
        }
      })
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
