import {
  createMemberService,
  getMembersService,
  getMemberService
} from "../services/member.service.js"


const parseMemberId = (
  value
) => {
  const id =
    Number(value)

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    const error =
      new Error(
        "Geçersiz çalışan ID"
      )

    error.statusCode = 400

    throw error
  }

  return id
}


const createMember = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await createMemberService(
        req.body,
        req.user.companyId
      )

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Çalışan başarıyla eklendi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const getMembers = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getMembersService(
        req.user.companyId
      )

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Çalışanlar başarıyla getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


const getMember = async (
  req,
  res,
  next
) => {
  try {
    const id =
      parseMemberId(
        req.params.id
      )

    const result =
      await getMemberService(
        id,
        req.user.companyId
      )

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Çalışan detayı başarıyla getirildi",

        data:
          result
      })

  } catch (error) {
    next(error)
  }
}


export {
  createMember,
  getMembers,
  getMember
}
