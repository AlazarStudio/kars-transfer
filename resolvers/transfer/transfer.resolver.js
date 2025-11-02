import { PrismaClient } from "@prisma/client"
import { pubsub, TRANSFER_CREATED, TRANSFER_UPDATED } from "../../exports/pubsub.js"

const prisma = new PrismaClient()

const transferResolver = {
    Query: {
        transfers: async(_, { pagination }) => {
            const { skip, take } = pagination

            const result = await prisma.transfer.findMany({
                skip: skip,
                take: take
            })
            return result
        },
        transfer: async(_, { id }) => {
            return await prisma.transfer.findUnique({
                where: { id: id },
                include: { driver: true, persons: true }
            })
        }
    },
    Mutation: {
        createTransfer: async(_, { input }) => {
            const newTransfer = await prisma.transfer.create({
                data: input
            })

            pubsub.publish(TRANSFER_CREATED, { transferCreated: newTransfer })

            return newTransfer
        },
        updateTransfer: async(_, { id, input }) => {
            // const {
            //     fromAddress,
            //     toAddress,
            //     additionalPoints,
            //     passengersCount,
            //     dispatcherId,
            //     driverId,
            //     personsId,
            //     description,
            //     baggage,
            //     scheduledPickupAt,
            //     driverAssignmentAt,
            //     orderAcceptanceAt,
            //     arrivedToPassengerAt,
            //     departedAt,
            //     arrivedAt,
            //     finishedAt,
            //     travelDurationMinutes,
            //     status
            // } = input


            // const updatedData = {}

            // if ( fromAddress !== undefined ) updatedData.fromAddress = fromAddress
            // if ( toAddress !== undefined ) updatedData.toAddress = toAddress
            // if ( additionalPoints !== undefined ) updatedData.additionalPoints = additionalPoints
            // if ( passengersCount !== undefined ) updatedData.passengersCount = passengersCount
            // if ( dispatcherId !== undefined ) updatedData.dispatcherId = dispatcherId
            // if ( driverId !== undefined ) updatedData.driverId = driverId
            // if ( personsId !== undefined ) updatedData.personsId = personsId
            // if ( description !== undefined ) updatedData.description = description
            // if ( baggage !== undefined ) updatedData.baggage = baggage
            // if ( scheduledPickupAt !== undefined ) updatedData.scheduledPickupAt = scheduledPickupAt
            // if ( driverAssignmentAt !== undefined ) updatedData.driverAssignmentAt = driverAssignmentAt
            // if ( orderAcceptanceAt !== undefined ) updatedData.orderAcceptanceAt = orderAcceptanceAt
            // if ( arrivedToPassengerAt !== undefined ) updatedData.arrivedToPassengerAt = arrivedToPassengerAt
            // if ( departedAt !== undefined ) updatedData.departedAt = departedAt
            // if ( arrivedAt !== undefined ) updatedData.arrivedAt = arrivedAt
            // if ( finishedAt !== undefined ) updatedData.finishedAt = finishedAt
            // if ( travelDurationMinutes !== undefined ) updatedData.travelDurationMinutes = travelDurationMinutes
            // if ( status !== undefined ) updatedData.status = status
            
            const updatedData = {}

            for ( let key in input ) {
                if ( input[key] !== undefined ) updatedData[key] = input[key]
            }

            const updatedTransfer = await prisma.transfer.update({
                where: { id: id },
                data: updatedData
            })

            pubsub.publish(TRANSFER_UPDATED, { transferUpdated: updatedTransfer })

            return updatedTransfer
        }
    },
    Transfer: {
        dispatcher: async(parent, _) => {
            return await prisma.dispatcher.findUnique({
                where: { id: parent.dispatcherId }
            })
        },
        driver: async(parent, _) => {
            return await prisma.driver.findUnique({
                where: { id: parent.driverId }
            })
        },
        persons: async(parent, _) => {
            return await prisma.transferPassenger.findMany({
                where: { transferId: parent.id }
            })
        },
        chats: async(parent, _) => {
            return await prisma.transferChat.findMany({
                where: { transferId: parent.id }
            })
        },
        reviews: async(parent, _) => {
            return await prisma.reviews.findMany({
                where: { transferId: parent.id }
            })
        }
    }
}


export default transferResolver