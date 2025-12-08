import { mergeResolvers } from "@graphql-tools/merge"

import airlineResolver from "./airline/airline.resolver.js"
import airportResolver from "./airport/airport.resolver.js"
import chatResolver from "./chat/chat.resolver.js"
import cityResolver from "./city/city.resolver.js"
import dispatcherResolver from "./dispatcher/dispatcher.resolver.js"
import driverResolver from "./driver/driver.resolver.js"
import globalResolver from "./global/global.resolver.js"
import requestResolver from "./request/request.resolver.js"
import userResolver from "./user/user.resolver.js"
import organizationResolver from "./organization/organization.resolver.js"
import transferResolver from "./transfer/transfer.resolver.js"

const mergedResolvers = mergeResolvers([
  airlineResolver,
  airportResolver,
  chatResolver,
  cityResolver,
  dispatcherResolver,
  driverResolver,
  globalResolver,
  requestResolver,
  userResolver,
  organizationResolver,
  transferResolver
])

export default mergedResolvers
