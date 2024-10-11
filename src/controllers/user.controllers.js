import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshAccessToken();

        user.refreshToken = refreshToken;
        await user.save({ ValidateBeforeSave: false });

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, 'something went wrong, while generating refresh and access token');
    }
}

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

const userLogin = asyncHandler(async (req, res) => {
    // req body data
    // username || email 
    // find the user 
    // If user finds then check password
    // generate access and refresh token
    // send cookie 

    const { username, email, password } = req.body;

    if (!(username || email)) {
        throw new ApiError(400, 'username or email is required');
    }

    const user = await User.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    if (!user) {
        throw new ApiError(404, 'user does not exist');
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "user logged in successfully")
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(
            200,
            {},
            "user logged out"
        ))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRrefreshToken = req.cookie.refreshToken || req.body.refreshToken;

    if (!incomingRrefreshToken) {
        throw new ApiError(401, 'unauthorized request');
    }

    try {
        const decodedToken = jwt.verify(
            incomingRrefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, 'Invalid refresh token');
        }

        if (incomingRrefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired or used');
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, newRefreshToken }, "Access Token refresh")
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})

export {
    registerUser,
    userLogin,
    logoutUser,
    refreshAccessToken
}