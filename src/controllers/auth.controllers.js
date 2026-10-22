import { registerUser , loginUser} from "../services/auth.services.js"

const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body)

    return res.status(201).json({
      success: true,
      message: "Kayıt başarılı",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req , res , next) => {
  try{
    const result = await loginUser(req.body)

    return res.status(200).json({
      success: true,
      message: "Giriş Başarılı",
      data: result,
    })

  }catch(error){
    next(error)
  }
}

export { register , login};
