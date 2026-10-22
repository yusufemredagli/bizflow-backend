import bcrypt from "bcrypt"
import prisma from "../config/prisma.js"
import jwt from "jsonwebtoken"


const registerUser = async (data) => {
  const { email, name, password, companyName } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error("Bu email zaten kayıtlı.")
    error.statusCode = 409
    throw error
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    const company = await tx.company.create({
      data: {
        name: companyName,
        slug,
      },
    });

    const membership = await tx.companyMember.create({
      data: {
        userId: user.id,
        companyId: company.id,
        role: "OWNER",
      },
    });

    return {
      user,
      company,
      membership,
    };
  });

    const { passwordHash: _, ...safeUser } = result.user;

    return {
        user: safeUser,
        company: result.company,
        membership: result.membership,
    };
};


const loginUser = async (data) => {
    const { email , password } = data
    
    const user = await prisma.user.findUnique({
        where: {email},

        include: {
            memberships: {
                select: {
                    companyId: true,
                    role: true,
                }
            }
        }
    })

    if(!user){
        const error = new Error("Email veya şifre hatalı.")
        error.statusCode = 401
        throw(error)
    }

    const passwordControl = await bcrypt.compare(password , user.passwordHash)

    if(!passwordControl){
        const error = new Error("Email veya şifre hatalı.")
        error.statusCode = 401
        throw(error)
    }

    const membership = user.memberships[0]

    if(!membership){
        const error = new Error("Şirket bulunamadı")
        error.statusCode = 401
        throw(error)
    }   

    const token = jwt.sign(
        {
            userId: user.id,
            companyId: membership.companyId,
            role: membership.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1h",
        }
        
    )
   
    const { passwordHash: _ , ...safeUser} = user


    return{
        user: safeUser,
        token
    }


}


export { registerUser , loginUser};