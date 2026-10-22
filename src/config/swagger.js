import swaggerJsdoc from "swagger-jsdoc"

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BizFlow API",
      version: "1.0.0",
      description: "Multi-tenant service management API"
    },
    servers: [
      {
        url: "http://localhost:3000"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)

export { swaggerSpec }