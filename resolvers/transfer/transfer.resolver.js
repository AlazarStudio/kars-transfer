import { PrismaClient } from "@prisma/client"
import {
  pubsub,
  TRANSFER_CREATED,
  TRANSFER_UPDATED
} from "../../exports/pubsub.js"
import { printIntrospectionSchema } from "graphql"
import { dateFormatter } from "../../exports/dateTimeFormatterVersion2.js"

const prisma = new PrismaClient()

const transferResolver = {
  Query: {
    transfers: async (_, { pagination }) => {
      const { skip, take, all } = pagination || {}
      const totalCount = await prisma.transfer.count() // добавить позже фильтрацию
      const transfers = all
        ? await prisma.transfer.findMany({}) // добавить позже фильтрацию
        : await prisma.transfer.findMany({
            skip: skip,
            take: take
          })

      const moscowDates = []

      // for (let transfer of transfers) {
      //   moscowDates.push({
      //     scheduledPickupAt: dateFormatter(transfer["scheduledPickupAt"]),
      //     driverAssignmentAt: dateFormatter(transfer["driverAssignmentAt"]),
      //     orderAcceptanceAt: dateFormatter(transfer["orderAcceptanceAt"]),
      //     arrivedToPassengerAt: dateFormatter(transfer["arrivedToPassengerAt"]),
      //     departedAt: dateFormatter(transfer["departedAt"]),
      //     arrivedAt: dateFormatter(transfer["arrivedAt"]),
      //     finishedAt: dateFormatter(transfer["finishedAt"]),
      //     createdAt: dateFormatter(transfer["createdAt"]),
      //     updatedAt: dateFormatter(transfer["updatedAt"])
      //   })
      // }

      // for (let i in transfers) {
      //   Object.assign(transfers[i], moscowDates[i])
      // }

      const dateKeys = ["scheduledPickupAt", "driverAssignmentAt", "orderAcceptanceAt", 
                        "arrivedToPassengerAt", "departedAt", "arrivedAt", 
                        "finishedAt", "createdAt", "updatedAt"]


      for (let transfer of transfers){
        const moscowDate = {}
        for (let key in transfer) {
          if (dateKeys.includes(key)){
            moscowDate[key] = dateFormatter(transfer[key])
          }
        }
        // moscowDates.push(moscowDate)
        Object.assign(transfer, moscowDate)

      }
  
      return { transfers, totalCount }
    },
    transfer: async (_, { id }) => {
      const transfer = await prisma.transfer.findUnique({
        // Находим transfer по id
        where: { id: id },
        include: { driver: true, persons: true }
      })

      const moscowDate = {} 
      // moscowDate["scheduledPickupAt"] = dateFormatter(
      //   transfer["scheduledPickupAt"]
      // )
      // moscowDate["driverAssignmentAt"] = dateFormatter(
      //   transfer["driverAssignmentAt"]
      // )
      // moscowDate["orderAcceptanceAt"] = dateFormatter(
      //   transfer["orderAcceptanceAt"]
      // )
      // moscowDate["arrivedToPassengerAt"] = dateFormatter(
      //   transfer["arrivedToPassengerAt"]
      // )
      // moscowDate["departedAt"] = dateFormatter(transfer["departedAt"])
      // moscowDate["arrivedAt"] = dateFormatter(transfer["arrivedAt"])
      // moscowDate["finishedAt"] = dateFormatter(transfer["finishedAt"])
      // moscowDate["createdAt"] = dateFormatter(transfer["createdAt"])
      // moscowDate["updatedAt"] = dateFormatter(transfer["updatedAt"])

      const dateKeys = ["scheduledPickupAt", "driverAssignmentAt", "orderAcceptanceAt", 
                        "arrivedToPassengerAt", "departedAt", "arrivedAt", 
                        "finishedAt", "createdAt", "updatedAt"]

      for (let key in transfer) {
        if (dateKeys.includes(key)){
          moscowDate[key] = dateFormatter(transfer[key])
        }
      }

      Object.assign(transfer, moscowDate)
      return transfer
    }
  },
  Mutation: {
    createTransfer: async (_, { input }) => {
      const {
        dispatcherId,
        driverId,
        personsId,
        ...restInput
      } = input

      const dateFields = [
        "scheduledPickupAt",
        "driverAssignmentAt",
        "orderAcceptanceAt",
        "arrivedToPassengerAt",
        "departedAt",
        "arrivedAt",
        "finishedAt",
        "createdAt",
        "updatedAt"
      ]

      const data = {}

      for (let key in restInput) {
        if (restInput[key] === undefined || restInput[key] === null) continue

        if (dateFields.includes(key)) {
          data[key] = new Date(restInput[key])
        } else {
          data[key] = restInput[key]
        }
      }

      // связи dispatcher/driver
      if (dispatcherId) {
        data.dispatcher = { connect: { id: dispatcherId } }
      }
      if (driverId) {
        data.driver = { connect: { id: driverId } }
      }

      // ПАССАЖИРЫ: personsId -> persons.create(...)
      if (Array.isArray(personsId) && personsId.length) {
        data.persons = {
          create: personsId.map((personalId) => ({
            personal: { connect: { id: personalId } } // TransferPassenger.personalId
          }))
        }
      }

      const newTransfer = await prisma.transfer.create({
        data
        // если нужно сразу вернуть связанные сущности:
        // include: { driver: true, dispatcher: true, persons: { include: { personal: true } } }
      })

      // const moscowDate = {}
      // moscowDate["scheduledPickupAt"] = dateFormatter(
      //   newTransfer["scheduledPickupAt"]
      // )
      // moscowDate["driverAssignmentAt"] = dateFormatter(
      //   newTransfer["driverAssignmentAt"]
      // )
      // moscowDate["orderAcceptanceAt"] = dateFormatter(
      //   newTransfer["orderAcceptanceAt"]
      // )
      // moscowDate["arrivedToPassengerAt"] = dateFormatter(
      //   newTransfer["arrivedToPassengerAt"]
      // )
      // moscowDate["departedAt"] = dateFormatter(newTransfer["departedAt"])
      // moscowDate["arrivedAt"] = dateFormatter(newTransfer["arrivedAt"])
      // moscowDate["finishedAt"] = dateFormatter(newTransfer["finishedAt"])
      // moscowDate["createdAt"] = dateFormatter(newTransfer["createdAt"])
      // moscowDate["updatedAt"] = dateFormatter(newTransfer["updatedAt"])

      // Object.assign(newTransfer, moscowDate)

      pubsub.publish(TRANSFER_CREATED, { transferCreated: newTransfer })

      return newTransfer
    },
    updateTransfer: async (_, { id, input }) => {
      const updatedData = {}

      for (let key in input) {
        if (input[key] !== undefined) {
          if (
            [
              "scheduledPickupAt",
              "driverAssignmentAt",
              "orderAcceptanceAt",
              "arrivedToPassengerAt",
              "departedAt",
              "arrivedAt",
              "finishedAt",
              "createdAt",
              "updatedAt"
            ].includes(key)
          ) {
            updatedData[key] = new Date(input[key])
          } else {
            updatedData[key] = input[key]
          }
        }
      }

      const updatedTransfer = await prisma.transfer.update({
        where: { id: id },
        data: updatedData
      })

      pubsub.publish(TRANSFER_UPDATED, { transferUpdated: updatedTransfer })

      // const moscowDate = {}

      // moscowDate["scheduledPickupAt"] = dateFormatter(
      //   updatedTransfer["scheduledPickupAt"]
      // )
      // moscowDate["driverAssignmentAt"] = dateFormatter(
      //   updatedTransfer["driverAssignmentAt"]
      // )
      // moscowDate["orderAcceptanceAt"] = dateFormatter(
      //   updatedTransfer["orderAcceptanceAt"]
      // )
      // moscowDate["arrivedToPassengerAt"] = dateFormatter(
      //   updatedTransfer["arrivedToPassengerAt"]
      // )
      // moscowDate["departedAt"] = dateFormatter(updatedTransfer["departedAt"])
      // moscowDate["arrivedAt"] = dateFormatter(updatedTransfer["arrivedAt"])
      // moscowDate["finishedAt"] = dateFormatter(updatedTransfer["finishedAt"])
      // moscowDate["createdAt"] = dateFormatter(updatedTransfer["createdAt"])
      // moscowDate["updatedAt"] = dateFormatter(updatedTransfer["updatedAt"])

      // Object.assign(updatedTransfer, moscowDate)

      return updatedTransfer
    }
  },
  Transfer: {
    dispatcher: async (parent, _) => {
      if (parent.dispatcherId){
        return await prisma.user.findUnique({
          where: { id: parent.dispatcherId, dispatcher: true }
        })
      }
      return null
    },
    driver: async (parent, _) => {
      if (parent.driverId){
        const driver = await prisma.driver.findUnique({
          where: { id: parent.driverId }
        })
  
        // const moscowDate = {}
  
        // moscowDate["createdAt"] = dateFormatter(driver["createdAt"])
        // moscowDate["updatedAt"] = dateFormatter(driver["updatedAt"])
  
        // Object.assign(driver, moscowDate)
  
        return driver
      }
      return null
    },
    persons: async (parent, _) => {
      if (parent.id){
        return await prisma.transferPassenger.findMany({
          where: { transferId: parent.id }
        })
      }
      return null
    },
    chats: async (parent, _) => {
      if (parent.id){
        return await prisma.transferChat.findMany({
          where: { transferId: parent.id }
        })
      }
        return null
    },
    reviews: async (parent, _) => {
      if (parent.id){
        return await prisma.transferReview.findMany({
          where: { transferId: parent.id }
        })
      }
      return null
    },
    airline: async(parent, _) => {
      if (parent.airlineId) {
        return await prisma.airline.findUnique({
          where: { id: parent.airlineId }
        })
      }
    }
  }
}
export default transferResolver
