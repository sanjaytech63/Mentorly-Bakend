import { Request, Response } from 'express';
import User from '../models/user.model';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { loginUserSchema, registerUserSchema } from '../validations/userValidation';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { uploadOnCloudinary } from '../utils/Cloudinary';

const generateAccessAndRefereshTokens = async (userId: string) => {
  try {
    const user: any = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Something went wrong while generating referesh and access token');
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = registerUserSchema.parse(req.body);
    const { fullName, email, password } = validatedData;

    // Correct way to access single file uploaded via multer
    const avatarLocalPath = req.file?.path;
    console.log(req.file);

    console.log(avatarLocalPath, 'avatar in register');

    if (!avatarLocalPath) {
      throw new ApiError(400, 'Avatar file is required');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const avatarUrl = avatar || null;

    if (!avatarUrl) {
      throw new ApiError(400, 'Avatar upload failed');
    }

    const userExists = await User.findOne({ email });
    if (userExists) throw new ApiError(400, 'User already exists');

    const newUser = await User.create({
      fullName,
      email,
      password,
      avatar: avatarUrl,
    });

    const { password: _, ...userWithoutPassword } = newUser.toObject();

    return res
      .status(201)
      .json(new ApiResponse(201, userWithoutPassword, 'User registered successfully'));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ errors: error.errors });
    }

    console.error('Register error:', error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
        data: null,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null,
    });
  }
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const validatedData = loginUserSchema.parse(req.body);
    const { email, password } = validatedData;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password');
    }

    const user = await User.findOne({ email });

    if (!user) throw new ApiError(404, 'User does not exist');

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) throw new ApiError(400, 'Invalid credentials');

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id as string);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: {
              _id: user._id,
              fullName: user.fullName,
              email: user.email,
              avatar: user.avatar,
            },
            accessToken,
            refreshToken,
          },
          'User logged In Successfully'
        )
      );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ errors: error.errors });
    }

    console.error('Login error:', error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || [],
        data: null,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null,
    });
  }
});

const logoutUser = asyncHandler(async (req: any, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, 'User logged Out'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET!);

    const user = await User.findById((decodedToken as JwtPayload)._id as string);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired or used');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id as string);

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(
        new ApiResponse(200, { accessToken, refreshToken: refreshToken }, 'Access token refreshed')
      );
  } catch (error: any) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user: any = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Invalid old password');
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, 'User fetched successfully'));
});

const updateAccountDetails = asyncHandler(async function (req, res) {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, 'All fields are required');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(201).json(new ApiResponse(200, user, 'Account details updated successfully'));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is missing');
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, 'Error while uploading on avatar');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar,
      },
    },
    { new: true }
  ).select('-password');

  return res.status(200).json(new ApiResponse(200, user, 'Avatar image updated successfully'));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
};
