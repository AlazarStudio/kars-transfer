import { allMiddleware } from "../../middlewares/authMiddleware.js"
// import { prisma } from "../../prisma.js"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const cityResolver = {
  Query: {
    citys: async (_, __, context) => {
      await allMiddleware(context)
      return prisma.city.findMany({ orderBy: { city: "asc" } })
    },
    city: async (_, { city }, context) => {
      await allMiddleware(context)
      return prisma.city.findMany({
        where: { city: { contains: city, mode: "insensitive" } }
      })
    }
  }
  // Mutation: {
  // }
}

export default cityResolver
