import { FilterQuery, QueryOptions } from 'mongoose';
import blogSchema, { IBlog } from '../models/blogs.model';
import { BlogQueryInput } from '../validations/news.validator';
import { ApiError } from '../utils/ApiError';
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

export class BlogService {
  /**
   * Find blogs with pagination, filtering, and search
   */
  async findBlogs(query: BlogQueryInput): Promise<PaginatedResult<IBlog>> {
    const { page, limit, category, search, sort } = query;

    // Build filter query
    const filter: FilterQuery<IBlog> = { isPublished: true };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Build sort options
    const sortOptions: QueryOptions['sort'] = {};
    switch (sort) {
      case 'oldest':
        sortOptions.createdAt = 1;
        break;
      case 'popular':
        // Assuming you have a views field
        sortOptions.views = -1;
        break;
      case 'newest':
      default:
        sortOptions.createdAt = -1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [blogs, total] = await Promise.all([
      blogSchema
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean()
        .then((res) => res as []),
      blogSchema.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev,
        nextPage: hasNext ? page + 1 : null,
        prevPage: hasPrev ? page - 1 : null,
      },
    };
  }

  /**
   * Find blog by ID or slug
   */
  async findBlogById(id: string): Promise<IBlog> {
    // Check if ID is valid MongoDB ID or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    const blog = await blogSchema.findOne({ ...query, isPublished: true });

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    return blog;
  }

  /**
   * Create new blog
   */
  async createBlog(
    blogData: Partial<IBlog> & { image: { url: string; public_id: string } }
  ): Promise<IBlog> {
    // Check for duplicate title
    const existingBlog = await blogSchema.findOne({
      title: { $regex: new RegExp(`^${blogData.title}$`, 'i') },
    });

    if (existingBlog) {
      throw new ApiError(409, 'Blog with this title already exists');
    }

    const blog = await blogSchema.create(blogData);
    return blog;
  }

  /**
   * Delete blog by ID
   */
  async deleteBlogById(id: string): Promise<void> {
    const blog = await blogSchema.findById(id);

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    await blogSchema.findByIdAndDelete(id);
  }

  /**
   * Get blog statistics
   */
  async getBlogStats() {
    const stats = await blogSchema.aggregate([
      {
        $match: { isPublished: true },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalStats = await blogSchema.aggregate([
      {
        $match: { isPublished: true },
      },
      {
        $group: {
          _id: null,
          totalBlogs: { $sum: 1 },
          featuredBlogs: {
            $sum: {
              $cond: [{ $in: ['$badge', ['Featured', 'Popular', 'Trending']] }, 1, 0],
            },
          },
        },
      },
    ]);

    return {
      categories: stats,
      overview: totalStats[0] || { totalBlogs: 0, featuredBlogs: 0 },
    };
  }

  /**
   * Update blog by ID
   */
  async updateBlog(id: string, updateData: Partial<IBlog>): Promise<IBlog> {
    const blog = await blogSchema.findById(id);

    if (!blog) {
      throw new ApiError(404, 'Blog not found');
    }

    // Check for duplicate title if title is being updated
    if (updateData.title && updateData.title !== blog.title) {
      const existingBlog = await blogSchema.findOne({
        title: { $regex: new RegExp(`^${updateData.title}$`, 'i') },
        _id: { $ne: id },
      });

      if (existingBlog) {
        throw new ApiError(409, 'Blog with this title already exists');
      }
    }

    const updatedBlog = await blogSchema
      .findByIdAndUpdate(id, { ...updateData }, { new: true, runValidators: true })
      .select('-__v');

    if (!updatedBlog) {
      throw new ApiError(404, 'Blog not found after update');
    }

    return updatedBlog;
  }
}

export const blogService = new BlogService();
