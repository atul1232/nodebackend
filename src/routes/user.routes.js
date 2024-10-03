import { Router } from "express";
import { logoutUser, registerUser, userLogin } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(userLogin);

/*{Secure Routes}*/
 router.route("/logout").post(verifyJwt,logoutUser)

export default router;