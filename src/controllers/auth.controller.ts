import { Request, Response } from 'express';
import User from '../models/user.models';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { loginUserSchema, registerUserSchema } from '../validations/userValidation';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { uploadOnCloudinary } from '../utils/Cloudinary';
import { ApiError } from '../utils/ApiError';

interface AuthenticatedRequest extends Request {
  user?: any;
  file?: Express.Multer.File;
  files?: { [fieldname: string]: Express.Multer.File[] };
}

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

    const avatarLocalPath = req.file?.path;

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
      role: 'user',
      status: 'active',
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
              role: user.role,
              status: user.status,
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

const logoutUser = asyncHandler(async (req: AuthenticatedRequest, res) => {
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

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as JwtPayload;

    const user = await User.findById(decodedToken._id);

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

const changeCurrentPassword = asyncHandler(async (req: AuthenticatedRequest, res) => {
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

const getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, 'User fetched successfully'));
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  interface UserQuery {
    $or?: Array<{
      name?: { $regex: string; $options: string };
      email?: { $regex: string; $options: string };
    }>;
  }

  const query: UserQuery = {};

  if (search) {
    const searchString = String(search);
    query.$or = [
      { name: { $regex: searchString, $options: 'i' } },
      { email: { $regex: searchString, $options: 'i' } },
    ];
  }

  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const skip = (pageNum - 1) * limitNum;

  const users = await User.find(query)
    .select('-password')
    .limit(limitNum)
    .skip(skip)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalUsers: total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1,
        },
      },
      'Users retrieved successfully'
    )
  );
});

const updateAccountDetails = asyncHandler(async function (req: AuthenticatedRequest, res) {
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

const updateUserAvatar = asyncHandler(async (req: AuthenticatedRequest, res) => {
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

const createUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      throw new ApiError(400, 'All fields are required');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const newUser = await User.create({
      fullName,
      email,
      password,
      role: 'user',
      status: 'active',
      avatar: 'https://via.placeholder.com/150',
    });

    const userWithoutPassword = await User.findById(newUser._id).select('-password');

    return res
      .status(201)
      .json(new ApiResponse(201, userWithoutPassword, 'User created successfully'));
  } catch (error: any) {
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

const updateUserById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      throw new ApiError(400, 'All fields are required');
    }

    const existingUser = await User.findOne({
      email,
      _id: { $ne: userId },
    });

    if (existingUser) {
      throw new ApiError(400, 'Email is already taken by another user');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { fullName, email } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return res.status(200).json(new ApiResponse(200, user, 'User updated successfully'));
  } catch (error: any) {
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

const deleteUserById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.user?._id.toString() === userId) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
  } catch (error: any) {
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

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getAllUsers,
  createUser,
  deleteUserById,
  updateUserById,
};
