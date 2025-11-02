import { PrismaClient } from "@prisma/client"
import { ORGANIZATION_CREATED, pubsub } from "../../exports/pubsub.js"

const prisma = new PrismaClient()


const organizationResolver = {
    Query: {
        organizations: async()  => {
            return await prisma.organization.findMany()
        },
        organization: async(_, { id }) => {
            return await prisma.organization.findUnique({ where: { id: id } })
        }
    },
    Mutation: {
        createOrganization: async(_, { input }) => {
            const { name, information } = input

            const existingOrganization = await prisma.organization.findFirst({
                where: { name: name }
            }) 

            if (existingOrganization) {
                if (existingOrganization.name == name) {
                    throw new Error(
                    "Организация с таким name уже существует",
                    "ORGANIZATION_EXISTS")
                }
            }

            const newOrganization = await prisma.organization.create({
                data: {
                    name: name,
                    information: information
                }
            })

            pubsub.publish(ORGANIZATION_CREATED, { organizationCreated: newOrganization })

            
            return newOrganization
        },
        updateOrganization: async(_, { id, input }) => {
            const updatedOrganization = await prisma.organization.update({
                where: { id: id },
                data: input
            })

            return updatedOrganization
        },
        deleteOrganization: async(_, { id }) => {
             const deletedOrganization = await prisma.organization.update({
                where: {id: id},
                data: {
                    active: false
                }
             })

             return deletedOrganization
        }
    },
    Organization: {
        drivers: async(parent, _) => {
            return await prisma.driver.findMany({ 
                where: { organizationId: parent.id }
             })
        }
    }
}

export default organizationResolver