import { Request, Response } from 'express';
import User from '../models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginUserSchema, registerUserSchema } from '../validations/userValidation';

export const registerUser = async (req: Request, res: Response) => {
  try {

    const validatedData = registerUserSchema.parse(req.body);
    const { fullName, email, password } = validatedData;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.toString(), salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    const { password: _, ...userWithoutPassword } = newUser.toObject();

    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });

  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({
      message: error.message || "Server error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {

    const validatedData = loginUserSchema.parse(req.body);
    const { email, password } = validatedData;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password.toString(), user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        user_id: user?._id,
        email: user?.email,
      },
      `${process.env.JWT_SCECRET}`,
      {
        expiresIn: '1h',
      }
    );

    const userData = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    }

    res.status(201).json({
      message: "User login successfully",
      user: userData,
      token: token,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
