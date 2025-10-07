import mongoose, { Schema, Document } from 'mongoose';
import jwt, { SignOptions } from "jsonwebtoken"
import bcrypt from "bcrypt"

export interface IUser extends Document {
  fullName: string;
  email: string;
  avatar: string;
  password: string;
  refreshToken: string;
  generateAccessToken: () => string;
  generateRefreshToken: () => string;
  isPasswordCorrect(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      lowercase: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String
    },
    avatar: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10)
  next()

});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {

  const payload = {
    _id: this._id,
    fullName: this.fullName,
    email: this.email
  }

  const options: SignOptions = {
    expiresIn: "15m"
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, options);
}

userSchema.methods.generateRefreshToken = function () {

  const payload = {
    _id: this._id,
  }

  const options: SignOptions = {
    expiresIn: "10d"
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, options);
}

export default mongoose.model<IUser>('User', userSchema);
