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

      for (let transfer of transfers) {
        moscowDates.push({
          "scheduledPickupAt": dateFormatter(transfer["scheduledPickupAt"]),
          "driverAssignmentAt": dateFormatter(transfer["driverAssignmentAt"]),
          "orderAcceptanceAt": dateFormatter(transfer["orderAcceptanceAt"]),
          "arrivedToPassengerAt": dateFormatter(transfer["arrivedToPassengerAt"]),
          "departedAt": dateFormatter(transfer["departedAt"]),
          "arrivedAt": dateFormatter(transfer["arrivedAt"]),
          "finishedAt": dateFormatter(transfer["finishedAt"]),
          "createdAt": dateFormatter(transfer["createdAt"]),
          "updatedAt": dateFormatter(transfer["updatedAt"]),
        })
      }

      for (let i in transfers) {
        Object.assign(transfers[i], moscowDates[i])
      }
      return { transfers, totalCount }
    },
    transfer: async (_, { id }) => {
      const transfer = await prisma.transfer.findUnique({
        // Находим transfer по id
        where: { id: id },
        include: { driver: true, persons: true }
      })

      const moscowDate = {} // Создаем объект для записи времени в московском часовом поясе
      moscowDate["scheduledPickupAt"] = dateFormatter(transfer["scheduledPickupAt"])
      moscowDate["driverAssignmentAt"] = dateFormatter(transfer["driverAssignmentAt"])
      moscowDate["orderAcceptanceAt"] = dateFormatter(transfer["orderAcceptanceAt"])
      moscowDate["arrivedToPassengerAt"] = dateFormatter(transfer["arrivedToPassengerAt"])
      moscowDate["departedAt"] = dateFormatter(transfer["departedAt"])
      moscowDate["arrivedAt"] = dateFormatter(transfer["arrivedAt"])
      moscowDate["finishedAt"] = dateFormatter(transfer["finishedAt"])
      moscowDate["createdAt"] = dateFormatter(transfer["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(transfer["updatedAt"])

      Object.assign(transfer, moscowDate)
      return transfer
    }
  },
  Mutation: {
    createTransfer: async (_, { input }) => {
      const Data = {}
      

      for (let key in input) {
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
          Data[key] = new Date(input[key])
        } else {
          Data[key] = input[key]
        }
      }

      const newTransfer = await prisma.transfer.create({
        data: Data
      })

      pubsub.publish(TRANSFER_CREATED, { transferCreated: newTransfer })

      const moscowDate = {}

      moscowDate["scheduledPickupAt"] = dateFormatter(newTransfer["scheduledPickupAt"])
      moscowDate["driverAssignmentAt"] = dateFormatter(newTransfer["driverAssignmentAt"])
      moscowDate["orderAcceptanceAt"] = dateFormatter(newTransfer["orderAcceptanceAt"])
      moscowDate["arrivedToPassengerAt"] = dateFormatter(newTransfer["arrivedToPassengerAt"])
      moscowDate["departedAt"] = dateFormatter(newTransfer["departedAt"])
      moscowDate["arrivedAt"] = dateFormatter(newTransfer["arrivedAt"])
      moscowDate["finishedAt"] = dateFormatter(newTransfer["finishedAt"])
      moscowDate["createdAt"] = dateFormatter(newTransfer["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(newTransfer["updatedAt"])

      Object.assign(newTransfer, moscowDate)

      return newTransfer
    },
    updateTransfer: async (_, { id, input }) => {
      const updatedData = {}

      for (let key in input) {
        if ( input[key] !== undefined ){
          if ( [
            "scheduledPickupAt",
            "driverAssignmentAt",
            "orderAcceptanceAt",
            "arrivedToPassengerAt",
            "departedAt",
            "arrivedAt",
            "finishedAt",
            "createdAt",
            "updatedAt"
          ].includes(key) ){
            updatedData[key] = new Date(input[key])
          }
          else {
            updatedData[key] = input[key]
          }
        }
      }

      const updatedTransfer = await prisma.transfer.update({
        where: { id: id },
        data: updatedData
      })

      pubsub.publish(TRANSFER_UPDATED, { transferUpdated: updatedTransfer })

      const moscowDate = {}

      moscowDate["scheduledPickupAt"] = dateFormatter(updatedTransfer["scheduledPickupAt"])
      moscowDate["driverAssignmentAt"] = dateFormatter(updatedTransfer["driverAssignmentAt"])
      moscowDate["orderAcceptanceAt"] = dateFormatter(updatedTransfer["orderAcceptanceAt"])
      moscowDate["arrivedToPassengerAt"] = dateFormatter(updatedTransfer["arrivedToPassengerAt"])
      moscowDate["departedAt"] = dateFormatter(updatedTransfer["departedAt"])
      moscowDate["arrivedAt"] = dateFormatter(updatedTransfer["arrivedAt"])
      moscowDate["finishedAt"] = dateFormatter(updatedTransfer["finishedAt"])
      moscowDate["createdAt"] = dateFormatter(updatedTransfer["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(updatedTransfer["updatedAt"])

      Object.assign(updatedTransfer, moscowDate)

      return updatedTransfer
    }},
  Transfer: {
    dispatcher: async (parent, _) => {
      return await prisma.dispatcher.findUnique({
        where: { id: parent.dispatcherId }
      })
    },
    driver: async (parent, _) => {
      const driver = await prisma.driver.findUnique({
        where: { id: parent.driverId }
      })

      const moscowDate = {}

      moscowDate["createdAt"] = dateFormatter(driver["createdAt"])
      moscowDate["updatedAt"] = dateFormatter(driver["updatedAt"])

      Object.assign(driver, moscowDate)

      return driver
    },
    persons: async (parent, _) => {
      return await prisma.transferPassenger.findMany({
        where: { transferId: parent.id }
      })
    },
    chats: async (parent, _) => {
      return await prisma.transferChat.findMany({
        where: { transferId: parent.id }
      })
    },
    reviews: async (parent, _) => {
      return await prisma.reviews.findMany({
        where: { transferId: parent.id }
      })
    }
  }
}
export default transferResolver
