import "dotenv/config"
import { PrismaMariaDb} from "@prisma/adapter-mariadb"
import { PrismaClient } from "@prisma/client"

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
if (process.env.NODE_ENV === "production" && !databaseUrl) throw new Error("DATABASE_URL is required")

const adapter = new PrismaMariaDb({
    host: databaseUrl?.hostname || "localhost",
    port: Number(databaseUrl?.port || 3306),
    user: databaseUrl ? decodeURIComponent(databaseUrl.username) : "root",
    password: databaseUrl ? decodeURIComponent(databaseUrl.password) : "",
    database: databaseUrl ? decodeURIComponent(databaseUrl.pathname.slice(1)) : "bizflow",
    connectionLimit: 2,

})

const prisma = new PrismaClient({ adapter })

export default prisma;