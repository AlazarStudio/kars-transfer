const airportTypeDef = `#graphql
type Airport {
  id: ID
  name: String
  city: String
  code: String
}

type Query {
  airports: [Airport!]!
  airport(airportId:ID): Airport
  airportCity(city: String): [Airport!]!
}

`

export default airportTypeDef
