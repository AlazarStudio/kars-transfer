import { mergeTypeDefs } from "@graphql-tools/merge"

import airlineTypeDef from "./airline/airline.typeDef.js"
import airportTypeDef from "./airport/airport.typeDef.js"
import chatTypeDef from "./chat/chat.typeDef.js"
import cityTypeDef from "./city/city.typeDef.js"
import dispatcherTypeDef from "./dispatcher/dispatcher.typeDef.js"
import driverTypeDef from "./driver/driver.typeDef.js"
import globalTypeDef from "./global/global.typeDef.js"
import requestTypeDef from "./request/request.typeDef.js"
import userTypeDef from "./user/user.typeDef.js"
import organizationTypeDef from "./organization/organization.typeDef.js"
import transferTypeDef from "./transfer/transfer.typeDef.js"

const mergedTypeDefs = mergeTypeDefs([
  airlineTypeDef,
  airportTypeDef,
  chatTypeDef,
  cityTypeDef,
  dispatcherTypeDef,
  driverTypeDef,
  globalTypeDef,
  requestTypeDef,
  userTypeDef,
  organizationTypeDef,
  transferTypeDef
])

export default mergedTypeDefs
