import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // apply validation 
    // check if user already exists
    // check for uploded images like : avatar , coverImage
    // upload them to cloudinary 
    // create user object - create new entry in db
    // remove password and refresh token field from response,
    // check for user creation 
    // return response

    const { username, email, fullName, password } = req.body;

    if ([username, email, fullName, password].some((filed) => filed.trim() === "")) {
        throw new ApiError(400, 'All fileds are required');
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, 'user already exist.');
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPaht = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is required');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const coverImage = await uploadOnCloudinary(coverImageLocalPaht);

    if (!avatar) {
        throw new ApiError(400, 'Avatar file is required');
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar?.url,
        coverImage: coverImage?.url || ""
    });

    const createdUser = await User.findById(user?._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while registering the user');
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
});

export { registerUser }