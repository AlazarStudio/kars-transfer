import fs from "fs"
import jwt from "jsonwebtoken"
import cors from "cors"
import http from "http"
import https from "https"
import dotenv from "dotenv"
import express from "express"
// import { prisma } from "./prisma.js"
import { ApolloServer } from "@apollo/server"
import { expressMiddleware } from "@apollo/server/express4"
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer"
import { WebSocketServer } from "ws"
import { useServer } from "graphql-ws/lib/use/ws"
import { makeExecutableSchema } from "@graphql-tools/schema"
import mergedTypeDefs from "./typeDefs/typedefs.js"
import mergedResolvers from "./resolvers/resolvers.js"
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs"
// import { startArchivingJob } from "./utils/request/cronTasks.js"
// import { ApolloServerPluginLandingPageDisabled } from "@apollo/server/plugin/disabled"
import {
  ApolloServerPluginLandingPageLocalDefault
  // ApolloServerPluginLandingPageProductionDefault
} from "@apollo/server/plugin/landingPage/default"
// import { logger } from "./utils/logger.js"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

dotenv.config()
const app = express()

const SERVER_KEY = process.env.SERVER_KEY
const SERVER_CERT = process.env.SERVER_CERT
const SERVER_CA = process.env.SERVER_CA

// Загрузка SSL сертификатов
const sslOptions = {
  key: fs.readFileSync(SERVER_KEY),
  cert: fs.readFileSync(SERVER_CERT),
  ca: fs.readFileSync(SERVER_CA)
}

const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` })
  res.end()
})
const httpsServer = https.createServer(sslOptions, app)
const schema = makeExecutableSchema({
  typeDefs: mergedTypeDefs,
  resolvers: mergedResolvers
})
const wsServer = new WebSocketServer({ server: httpsServer, path: "/graphql" })

const getDynamicContext = async (ctx, msg, args) => {
  // ctx is the graphql-ws Context where connectionParams live
  // console.log("\n ctx" + ctx, "\n ctx" + JSON.stringify(ctx))
  if (ctx.connectionParams.Authorization) {
    const authHeader = ctx.connectionParams.Authorization
    if (!authHeader) {
      return { user: null, authHeader: null }
    }
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7, authHeader.length)
      : authHeader
    let user = null
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            number: true,
            role: true,
            position: true,
            airlineId: true,
            airlineDepartmentId: true,
            hotelId: true,
            dispatcher: true,
            support: true
          }
        })
        // --------------------------------------------------------------------------------------------------------------------------------
        // await prisma.user.update({
        //   where: { id: decoded.userId },
        //   data: { lastSeen: new Date() }
        // })
        // --------------------------------------------------------------------------------------------------------------------------------
      } catch (e) {
        if (e.name === "TokenExpiredError") {
          // logger.warn("Просроченный токен")
          throw new Error("Token expired")
        }
        // logger.error("Ошибка токена", e)
        throw new Error("Invalid token")
      }
    }
    return { user, authHeader }
  }
  // Otherwise let our resolvers know we don't have a current user
  // return { user: null }
}

const serverCleanup = useServer(
  {
    schema,
    context: async (ctx, msg, args) => {
      return getDynamicContext(ctx, msg, args)
    }
  },
  wsServer
)
const server = new ApolloServer({
  schema: schema,
  csrfPrevention: true,
  cache: "bounded",
  introspection: process.env.NODE_ENV !== "production",
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpsServer }),
    ApolloServerPluginLandingPageLocalDefault(),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose()
          }
        }
      }
    }
  ]
})
// --------------------------------
// startArchivingJob()

// --------------------------------
await server.start()
app.use(graphqlUploadExpress())
app.use("/uploads", express.static("uploads"))
app.use("/reports", express.static("reports"))
app.use("/reserve_files", express.static("reserve_files"))

app.use(
  "/",
  cors(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      const authHeader = req.headers.authorization || null

      if (!authHeader) {
        return {
          authHeader: null,
          token: null,
          subject: null,
          subjectType: null,
          user: null,
          driver: null,
          personal: null
        }
      }

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader

      let decoded
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
      } catch (e) {
        if (e.name === "TokenExpiredError") {
          throw new Error("Token expired")
        }
        throw new Error("Invalid token")
      }

      const { subjectType, userId, driverId, airlinePersonalId } = decoded

      let user = null
      let driver = null
      let personal = null
      let subject = null

      if (subjectType === "USER" && userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            number: true,
            role: true,
            position: true,
            airlineId: true,
            airlineDepartmentId: true,
            dispatcher: true,
            support: true
          }
        })
        subject = user
      }

      if (subjectType === "DRIVER" && driverId) {
        driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: {
            id: true,
            name: true,
            number: true,
            email: true,
            organizationId: true,
            active: true,
            rating: true
          }
        })
        subject = driver
      }

      if (subjectType === "AIRLINE_PERSONAL" && airlinePersonalId) {
        personal = await prisma.airlinePersonal.findUnique({
          where: { id: airlinePersonalId },
          select: {
            id: true,
            name: true,
            number: true,
            airlineId: true,
            departmentId: true,
            active: true,
            positionId: true
          }
        })
        subject = personal
      }

      // если после всех попыток никого не нашли — токен считаем невалидным
      if (!subject) {
        throw new Error("Invalid token")
      }

      // lastSeen только для User
      // if (subjectType === "USER") {
      //   await prisma.user.update({
      //     where: { id: userId },
      //     data: { lastSeen: new Date() },
      //   });
      // }

      return {
        authHeader,
        token,
        decoded,
        subjectType, // "USER" | "DRIVER" | "AIRLINE_PERSONAL"
        subject, // текущий субъект (user/driver/personal)
        user,
        driver,
        personal
      }
    }
  })
)

// Now that our HTTP server is fully set up, we can listen to it.
// const PORT = 4000
const PORT = 443 // HTTPS порт
const HOST = "0.0.0.0"
const HTTP_PORT = 80 // HTTP порт

// Запуск HTTPS сервера
httpsServer.listen(PORT, () => {
  console.log(`Server is now running on https://localhost:${PORT}/graphql`)
})

// Запуск HTTP сервера для редиректа
httpServer.listen(HTTP_PORT, () => {
  console.log(`Redirecting HTTP to HTTPS on port ${HTTP_PORT}`)
})
