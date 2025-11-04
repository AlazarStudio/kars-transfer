const driverTypeDef = `#graphql
    scalar Date
    scalar Upload

    enum DriverRegistrationStatus {
        PENDING
        APPROVED
        REJECTED
    }

    #Пользовательский тип
    type DriverDocuments{
        driverPhoto: String
        carPhotos: [String]
        stsPhoto: String
        ptsPhoto: String
        osagoPhoto: String
        licensePhoto: String
    }

    #Пользовательский тип
    type GeoPoint {
        lat: Float
        lng: Float
        updatedAt: Date
    }
    input GeoPointInput {
        lat: Float
        lng: Float
        updatedAt: Date
    }

    type Driver{
        id: ID!                   
        createdAt: Date!                 
        updatedAt: Date!                 
        name: String!
        phone: String
        email: String                  
        password: String!
        car: String
        vehicleNumber: String
        driverLicenseNumber: String
        driverLicenseIssueYear: Int
        extraEquipment: [String]
        organization: Organization            
        organizationId: String                  
        organizationConfirmed: Boolean
        documents: DriverDocuments
        registrationStatus: DriverRegistrationStatus 
        location: GeoPoint
        rating: Float
        # transfers: [Transfer]
        # transferMessages: [TransferMessage]        
        active: Boolean                  
        # TransferReview: [TransferReview]
        # TransferChat: [TransferChat]
        # TransferMessageRead: [TransferMessageRead]
    }

    input DriverCreateInput{               
        name: String!
        phone: String
        email: String                  
        password: String
        car: String
        vehicleNumber: String
        driverLicenseNumber: String
        driverLicenseIssueYear: Int
        extraEquipment: [String]
        organizationId: String                  
        documents: DriverDocumentsUpdateInput
        registrationStatus: DriverRegistrationStatus 
    }

    input DriverUpdateInput{             
        name: String
        phone: String
        email: String                  
        newPassword: String
        oldPassword: String
        car: String
        vehicleNumber: String
        driverLicenseNumber: String
        driverLicenseIssueYear: Int
        location: GeoPointInput
        extraEquipment: [String]            
        organizationId: String                  
        organizationConfirmed: Boolean
        documents: DriverDocumentsUpdateInput
        registrationStatus: DriverRegistrationStatus        
        active: Boolean                  
    }

    input DriverDocumentsUpdateInput{
        driverPhoto: Upload
        carPhotos: [Upload]
        stsPhoto: Upload
        ptsPhoto: Upload
        osagoPhoto: Upload
        licensePhoto: Upload
    }

    type DriverConnection{
        # totalPages: Int!
        totalCount: Int
        drivers: [Driver]
    }

    input DriverPaginationInput{
        skip: Int
        take: Int
        all: Boolean
    }

    type Query{
        drivers(pagination: DriverPaginationInput!): DriverConnection!
        driverById(id: ID!): Driver!
        driverByEmail(email: String!): Driver!
    }

    type Mutation{
        createDriver(input: DriverCreateInput!): Driver!
        updateDriver(id: ID!, input: DriverUpdateInput): Driver!
        updateDriverDocuments(id: ID!, documents: Upload): Driver!
        deleteDriver(id: ID!): Driver!
    }

    type Subscription {
        driverCreated: Driver!
        driverOnline: Boolean  
    }

    
`

export default driverTypeDef
