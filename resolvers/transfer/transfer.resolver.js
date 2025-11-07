import { PrismaClient } from "@prisma/client"
import {
  pubsub,
  TRANSFER_CREATED,
  TRANSFER_UPDATED
} from "../../exports/pubsub.js"
import { printIntrospectionSchema } from "graphql"

const prisma = new PrismaClient()

const transferResolver = {
  Query: {
    transfers: async (_, { pagination }) => {
    const { skip, take, all } = pagination || {}
    const totalCount = await prisma.transfer.count() // добавить позже фильтрацию
    const transfers = all
      ? await prisma.transfer.findMany({})           // добавить позже фильтрацию
      : await prisma.transfer.findMany({
          skip: skip ? skip * take : undefined,
          take: take || undefined,
        })
      
    const moscowDates = []

    for (let transfer of transfers) {
      moscowDates.push({
        "scheduledPickupAt":  new Date(transfer["scheduledPickupAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["scheduledPickupAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["scheduledPickupAt"]).toLocaleString().split(', ')[0].split('.')[0] //Приводит дату к YYYY-MM-DD
                             + 'T' + new Date(transfer["scheduledPickupAt"]).toLocaleString().split(', ')[1],

        "driverAssignmentAt":  new Date(transfer["driverAssignmentAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["driverAssignmentAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["driverAssignmentAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["driverAssignmentAt"]).toLocaleString().split(', ')[1],

        "orderAcceptanceAt":  new Date(transfer["orderAcceptanceAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["orderAcceptanceAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["orderAcceptanceAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["orderAcceptanceAt"]).toLocaleString().split(', ')[1],

        "arrivedToPassengerAt":  new Date(transfer["arrivedToPassengerAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["arrivedToPassengerAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["arrivedToPassengerAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["arrivedToPassengerAt"]).toLocaleString().split(', ')[1],

        "departedAt":  new Date(transfer["departedAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["departedAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["departedAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["departedAt"]).toLocaleString().split(', ')[1],

        "arrivedAt":  new Date(transfer["arrivedAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["arrivedAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["arrivedAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["arrivedAt"]).toLocaleString().split(', ')[1],

        "finishedAt":  new Date(transfer["finishedAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["finishedAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["finishedAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["finishedAt"]).toLocaleString().split(', ')[1],

        "createdAt":  new Date(transfer["createdAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["createdAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["createdAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["createdAt"]).toLocaleString().split(', ')[1],

        "updatedAt":  new Date(transfer["updatedAt"]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer["updatedAt"]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer["updatedAt"]).toLocaleString().split(', ')[0].split('.')[0] 
                             + 'T' + new Date(transfer["updatedAt"]).toLocaleString().split(', ')[1]
      })
    }

    for ( let i in transfers ) {
      Object.assign(transfers[i], moscowDates[i])
    }
    return { transfers, totalCount }
    },
    transfer: async (_, { id }) => {
      const transfer =  await prisma.transfer.findUnique({         // Находим transfer по id
        where: { id: id },
        include: { driver: true, persons: true }
      })
      
      const moscowDate = {}                                       // Создаем объект для записи времени в московском часовом поясе
      for (let key in transfer){
        if ( ["scheduledPickupAt", "driverAssignmentAt", 
              "orderAcceptanceAt", "arrivedToPassengerAt",
              "departedAt", "arrivedAt" ,"finishedAt", "createdAt", "updatedAt"].includes(key) 
            ){
                moscowDate[key] = new Date(transfer[key]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(transfer[key]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(transfer[key]).toLocaleString().split(', ')[0].split('.')[0] 
                + 'T' + new Date(transfer[key]).toLocaleString().split(', ')[1]
              }
      }
      
      Object.assign(transfer, moscowDate)
      return transfer
    }
  },
  Mutation: {
    createTransfer: async (_, { input }) => {
      const Data = {}
      const moscowDate = {}

      for (let key in input) {
        if ( ["scheduledPickupAt", "driverAssignmentAt", 
              "orderAcceptanceAt", "arrivedToPassengerAt",
              "departedAt", "arrivedAt" ,"finishedAt", "createdAt", "updatedAt"].includes(key) 
            ){
                Data[key] = new Date(input[key])
                moscowDate[key] = new Date(input[key]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(input[key]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(input[key]).toLocaleString().split(', ')[0].split('.')[0] //YYYY-MM-DD
                                  + 'T' + new Date(input[key]).toLocaleString().split(', ')[1]    //
              }
        else{
          Data[key] = input[key]
        }
        console.log(Data)
      }

      const newTransfer = await prisma.transfer.create({
        data: Data
      })

      pubsub.publish(TRANSFER_CREATED, { transferCreated: newTransfer })

      Object.assign(newTransfer, moscowDate)
      return newTransfer
    },
    updateTransfer: async (_, { id, input }) => {
      const updatedData = {}

      for (let key in input) {
        if (input[key] !== undefined) updatedData[key] = input[key]
      }

      const updatedTransfer = await prisma.transfer.update({
        where: { id: id },
        data: updatedData
      })

      pubsub.publish(TRANSFER_UPDATED, { transferUpdated: updatedTransfer })


      const moscowDate = {}
      for (let key in updatedTransfer) {
        if ( ["scheduledPickupAt", "driverAssignmentAt", 
              "orderAcceptanceAt", "arrivedToPassengerAt",
              "departedAt", "arrivedAt" ,"finishedAt", "createdAt", "updatedAt"].includes(key) 
            ){
                moscowDate[key] = new Date(updatedTransfer[key]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(updatedTransfer[key]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(updatedTransfer[key]).toLocaleString().split(', ')[0].split('.')[0]
                                 + 'T' + new Date(updatedTransfer[key]).toLocaleString().split(', ')[1]
              }
      }
      Object.assign(updatedTransfer, moscowDate)

      return updatedTransfer
    }
  },
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
      for ( let key in driver ){
        if ( ["createdAt", "updatedAt"].includes(key) 
            ){
                moscowDate[key] = new Date(driver[key]).toLocaleString().split(', ')[0].split('.')[2] + "-" + new Date(driver[key]).toLocaleString().split(', ')[0].split('.')[1] + "-" + new Date(driver[key]).toLocaleString().split(', ')[0].split('.')[0]
                + 'T' + new Date(driver[key]).toLocaleString().split(', ')[1]
              }
      }

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
