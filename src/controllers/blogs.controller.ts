import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/Cloudinary';
import { blogService } from '../services/blog.service';
import { createBlogSchema, blogQuerySchema, BlogQueryInput } from '../validations/news.validator';
import blogSchema from '../models/blogs.model';

/**
 * @desc    Get all blogs with advanced filtering, search, and pagination
 * @route   GET /api/blogs
 * @access  Public
 */
const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  // Validate and parse query parameters
  const validatedQuery = blogQuerySchema.parse(req.query);

  // Get blogs with pagination
  const result = await blogService.findBlogs(validatedQuery);

  return res.status(200).json(
    new ApiResponse(200, result, 'Blogs fetched successfully')
  );
});

/**
 * @desc    Get single blog by ID or slug
 * @route   GET /api/blogs/:id
 * @access  Public
 */
const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Blog ID or slug is required');
  }

  const blog = await blogService.findBlogById(id);

  // Increment views (optional)
  await blogSchema.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

  return res.status(200).json(
    new ApiResponse(200, blog, 'Blog fetched successfully')
  );
});

/**
 * @desc    Create new blog
 * @route   POST /api/blogs
 * @access  Private/Admin
 */

const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files?.image || files.image.length === 0) {
    throw new ApiError(400, 'Blog image file is required');
  }

  // This will now validate against the correct enum values
  const validatedData = createBlogSchema.parse(req.body);

  const imageLocalPath = files.image[0].path;
  const imageUrl = await uploadOnCloudinary(imageLocalPath);

  if (!imageUrl) {
    throw new ApiError(400, 'Blog image upload failed');
  }

  const data = await blogSchema.create({
    ...validatedData,
    image: imageUrl,
  });

  return res.status(201).json(new ApiResponse(201, data, 'Blog created successfully'));
});

/**
 * @desc    Delete blog
 * @route   DELETE /api/blogs/:id
 * @access  Private/Admin
 */
const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Blog ID is required');
  }

  // Get blog first to access Cloudinary public_id
  const blog = await blogSchema.findById(id);
  if (!blog) {
    throw new ApiError(404, 'Blog not found');
  }

  // Delete image from Cloudinary
  // if (blog.image?.public_id) {
  //   try {
  //     await deleteFromCloudinary(blog.image.public_id);
  //   } catch (error) {
  //     console.error('Failed to delete image from Cloudinary:', error);
  //   }
  // }

  // Delete blog from database
  await blogService.deleteBlogById(id);

  return res.status(200).json(
    new ApiResponse(200, null, 'Blog deleted successfully')
  );
});

/**
 * @desc    Update blog
 * @route   PUT /api/blogs/:id
 * @access  Private/Admin
 */
const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (files?.image && files.image.length > 0) {
    const imageLocalPath = files.image[0].path;
    const cloudinaryResult = await uploadOnCloudinary(imageLocalPath);

    if (!cloudinaryResult) {
      throw new ApiError(500, 'Failed to upload blog image');
    }

    updateData.image = cloudinaryResult;
  }

  const updatedBlog = await blogService.updateBlog(id, updateData);

  return res.status(200).json(
    new ApiResponse(200, updatedBlog, 'Blog updated successfully')
  );
});

/**
 * @desc    Get blogs by category
 * @route   GET /api/blogs/categories/:category
 * @access  Public
 */
const getBlogsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const query = { ...req.query, category } as BlogQueryInput;

  const result = await blogService.findBlogs(query);

  return res.status(200).json(
    new ApiResponse(200, result, `Blogs in ${category} category fetched successfully`)
  );
});

/**
 * @desc    Get blog statistics
 * @route   GET /api/blogs/stats/overview
 * @access  Private/Admin
 */
const getBlogStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await blogService.getBlogStats();

  return res.status(200).json(
    new ApiResponse(200, stats, 'Blog statistics fetched successfully')
  );
});

export {
  getAllBlogs,
  getBlogById,
  createBlog,
  deleteBlog,
  getBlogStats,
  updateBlog,
  getBlogsByCategory
};