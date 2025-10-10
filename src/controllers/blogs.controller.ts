import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import blogSchema from '../models/blogs.model';
import { createNewsSchema } from '../validations/news.validator';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/Cloudinary';

const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const query: any = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Number(page);
    const pageSize = Number(limit);

    const [data, total] = await Promise.all([
      blogSchema
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      blogSchema.countDocuments(query),
    ]);

    const response = {
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
      data,
    };

    return res.status(200).json(new ApiResponse(200, response, 'Get blog successfully'));
  } catch (error: any) {
    console.error('Get blogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      data: null,
    });
  }
});

const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = await blogSchema.findById(req.params.id);

    if (!data) {
      throw new ApiError(404, 'Blog not found');
    }

    return res.status(200).json(new ApiResponse(200, data, 'Blog fetched successfully'));
  } catch (error: any) {
    console.error('Get blog error:', error);

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

const createBlog = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded files:', req.files);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files?.image || files.image.length === 0) {
      throw new ApiError(400, 'Blog image file is required');
    }

    const validatedData = createNewsSchema.parse(req.body);
    const { title, description, author, category, readTime, badge } = validatedData;

    const imageLocalPath = files.image[0].path;
    console.log('Image local path:', imageLocalPath);

    const imageUrl = await uploadOnCloudinary(imageLocalPath);

    if (!imageUrl) {
      throw new ApiError(400, 'Blog image upload failed');
    }

    const data = await blogSchema.create({
      title,
      description,
      category,
      badge,
      readTime,
      author,
      image: imageUrl,
    });

    return res.status(201).json(new ApiResponse(201, data, 'Blog created successfully'));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
        data: null,
      });
    }

    console.error('Blog create error:', error);

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

const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const blog = await blogSchema.findById(id);

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    // Delete from Cloudinary if public_id exists
    // if (blog.image?.public_id) {
    //     await deleteFromCloudinary(blog.image.public_id);
    // }

    await blogSchema.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, null, 'Blog deleted successfully'));
  } catch (error: any) {
    console.error('Blog delete error:', error);

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

export { createBlog, getAllBlogs, getBlogById, deleteBlog };
