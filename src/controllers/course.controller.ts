import { Request, Response } from 'express';
import { CourseModel } from '../models/course.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadOnCloudinary } from '../utils/Cloudinary';

/**
 * Get all courses with advanced filtering, pagination, and sorting
 */
export const getCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            hasDiscount,
            minDiscount,
            minRating,
            maxRating,
            level,
            isFeatured,
            isActive,
            minDuration,
            maxDuration,
            minStudents,
            page = 1,
            limit = 9,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // ✅ FIXED: Proper number validation and conversion
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 10));
        const skip = (pageNum - 1) * limitNum;

        const filter: any = {};

        // ✅ FIXED: Proper boolean handling
        filter.isActive = isActive !== undefined ? (isActive === 'true') : true;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { instructor: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'All Courses') {
            filter.category = category;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.originalPrice = {};
            if (minPrice !== undefined) filter.originalPrice.$gte = parseFloat(minPrice as string);
            if (maxPrice !== undefined) filter.originalPrice.$lte = parseFloat(maxPrice as string);
        }

        if (hasDiscount !== undefined) {
            if (hasDiscount === 'true') {
                filter.discountedPrice = { $exists: true, $ne: null, $gt: 0 };
            } else {
                filter.$or = [
                    { discountedPrice: { $exists: false } },
                    { discountedPrice: null },
                    { discountedPrice: 0 }
                ];
            }
        }

        if (minDiscount !== undefined) {
            filter.discountPercentage = { $gte: parseFloat(minDiscount as string) };
        }

        if (minRating !== undefined || maxRating !== undefined) {
            filter.rating = {};
            if (minRating !== undefined) filter.rating.$gte = parseFloat(minRating as string);
            if (maxRating !== undefined) filter.rating.$lte = parseFloat(maxRating as string);
        }

        if (level) {
            filter.level = level;
        }

        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }

        if (minDuration !== undefined || maxDuration !== undefined) {
            filter.totalHours = {};
            if (minDuration !== undefined) filter.totalHours.$gte = parseFloat(minDuration as string);
            if (maxDuration !== undefined) filter.totalHours.$lte = parseFloat(maxDuration as string);
        }

        if (minStudents !== undefined) {
            filter.students = { $gte: parseInt(minStudents as string) };
        }

        // Build sort object
        const sort: any = {};

        switch (sortBy) {
            case 'discountedPrice':
                sort.discountedPrice = sortOrder === 'desc' ? -1 : 1;
                sort.originalPrice = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'duration':
                sort.totalHours = sortOrder === 'desc' ? -1 : 1;
                break;
            default:
                sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
        }

        sort.createdAt = -1;

        // ✅ FIXED: Simplified aggregation pipeline without complex $addFields
        const aggregationPipeline: any[] = [
            { $match: filter },
            { $sort: sort },
            { $skip: skip },
            { $limit: limitNum }
        ];

        const [courses, total] = await Promise.all([
            CourseModel.aggregate(aggregationPipeline),
            CourseModel.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        // ✅ FIXED: Correct pagination field names
        const responseData = {
            courses,
            pagination: {
                currentPage: pageNum, // ✅ FIXED: Use pageNum instead of page
                totalPages: totalPages, // ✅ FIXED: Use totalPages instead of totalPages
                totalItems: total,
                itemsPerPage: limitNum, // ✅ FIXED: Use limitNum instead of limit
                hasNext,
                hasPrev,
                nextPage: hasNext ? pageNum + 1 : null,
                prevPage: hasPrev ? pageNum - 1 : null,
            },
            filters: {
                applied: Object.keys(filter).length > 0 ? filter : undefined
            }
        };

        return res.status(200).json(
            new ApiResponse(200, responseData, 'Courses fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching courses:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch courses', error.message)
        );
    }
});

/**
 * Get single course by ID
 */
export const getCourseById = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const course = await CourseModel.findOne({ _id: id, isActive: true });

        if (!course) {
            return res.status(404).json(
                new ApiError(404, 'Course not found')
            );
        }

        // Get related courses
        const relatedCourses = await CourseModel.find({
            category: course.category,
            _id: { $ne: course._id },
            isActive: true
        })
            .limit(4)
            .sort({ rating: -1, students: -1 })
            .lean();

        const responseData = {
            course,
            relatedCourses
        };

        return res.status(200).json( // ✅ FIXED: Changed from 201 to 200 for GET
            new ApiResponse(200, responseData, 'Course fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching course:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch course', error.message)
        );
    }
});

/**
 * Create new course
 */
export const createCourse = asyncHandler(async (req: Request, res: Response) => {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files?.image || files.image.length === 0) {
            throw new ApiError(400, 'Course image file is required');
        }

        const imageLocalPath = files.image[0].path;
        const imageUrl = await uploadOnCloudinary(imageLocalPath);

        if (!imageUrl) {
            throw new ApiError(400, 'Course image upload failed');
        }

        // ✅ FIXED: Handle iconType field
        const courseData = {
            title: req.body.title,
            description: req.body.description,
            image: imageUrl,
            category: req.body.category,
            instructor: req.body.instructor,
            originalPrice: parseFloat(req.body.originalPrice),
            discountedPrice: req.body.discountedPrice ? parseFloat(req.body.discountedPrice) : undefined,
            rating: req.body.rating ? parseFloat(req.body.rating) : 0,
            reviewCount: req.body.reviewCount ? parseInt(req.body.reviewCount) : 0,
            duration: req.body.duration,
            students: req.body.students ? parseInt(req.body.students) : 0,
            badge: req.body.badge,
            icon: req.body.icon,
            iconType: req.body.iconType || 'default', // ✅ FIXED: Added iconType
            level: req.body.level || 'beginner',
            tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
            isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
            isActive: req.body.isActive !== 'false',
            discountPercentage: req.body.discountPercentage ? parseFloat(req.body.discountPercentage) : undefined,
            totalHours: req.body.totalHours ? parseFloat(req.body.totalHours) : 0,
            lectures: req.body.lectures ? parseInt(req.body.lectures) : 0,
        };

        const requiredFields = ['title', 'category', 'instructor', 'originalPrice', 'duration'];
        const missingFields = requiredFields.filter(field => !courseData[field as keyof typeof courseData]);

        if (missingFields.length > 0) {
            throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        if (courseData.discountedPrice && courseData.discountedPrice > courseData.originalPrice) {
            throw new ApiError(400, 'Discounted price cannot be higher than original price');
        }

        const course = new CourseModel(courseData);
        await course.save();

        return res.status(201).json(
            new ApiResponse(201, course, 'Course created successfully')
        );

    } catch (error: any) {
        console.error('Error creating course:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json(
                new ApiError(400, 'Validation failed', errors)
            );
        }

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        }

        return res.status(500).json(
            new ApiError(500, 'Failed to create course', error.message)
        );
    }
});

/**
 * Update course
 */
export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existingCourse = await CourseModel.findById(id);
        if (!existingCourse) {
            throw new ApiError(404, 'Course not found');
        }

        const updateData: any = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            instructor: req.body.instructor,
            originalPrice: parseFloat(req.body.originalPrice),
            duration: req.body.duration,
            level: req.body.level,
            tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : existingCourse.tags,
            isFeatured: req.body.isFeatured === 'true' || req.body.isFeatured === true,
            isActive: req.body.isActive !== 'false',
        };

        if (req.body.discountedPrice !== undefined) {
            updateData.discountedPrice = req.body.discountedPrice ? parseFloat(req.body.discountedPrice) : undefined;
        }
        if (req.body.rating !== undefined) updateData.rating = parseFloat(req.body.rating);
        if (req.body.reviewCount !== undefined) updateData.reviewCount = parseInt(req.body.reviewCount);
        if (req.body.students !== undefined) updateData.students = parseInt(req.body.students);
        if (req.body.badge !== undefined) updateData.badge = req.body.badge;
        if (req.body.icon !== undefined) updateData.icon = req.body.icon;
        if (req.body.iconType !== undefined) updateData.iconType = req.body.iconType;
        if (req.body.discountPercentage !== undefined) {
            updateData.discountPercentage = parseFloat(req.body.discountPercentage);
        }
        if (req.body.totalHours !== undefined) updateData.totalHours = parseFloat(req.body.totalHours);
        if (req.body.lectures !== undefined) updateData.lectures = parseInt(req.body.lectures);

        // ✅ FIXED: Handle image upload only if a new file is provided
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        if (files?.image && files.image.length > 0) {
            const imageLocalPath = files.image[0].path;
            const imageUrl = await uploadOnCloudinary(imageLocalPath);

            if (imageUrl) {
                updateData.image = imageUrl;
            } else {
                throw new ApiError(400, 'Course image upload failed');
            }
        }

        if (updateData.discountedPrice && updateData.discountedPrice > updateData.originalPrice) {
            throw new ApiError(400, 'Discounted price cannot be higher than original price');
        }

        const updatedCourse = await CourseModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json(
            new ApiResponse(200, updatedCourse, 'Course updated successfully')
        );

    } catch (error: any) {
        console.error('Error updating course:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((err: any) => err.message);
            return res.status(400).json(
                new ApiError(400, 'Validation failed', errors)
            );
        }

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        }

        return res.status(500).json(
            new ApiError(500, 'Failed to update course', error.message)
        );
    }
});
/**
 * Delete course (soft delete)
 */
export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const course = await CourseModel.findByIdAndUpdate(
            id,
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );

        if (!course) {
            return res.status(404).json(
                new ApiError(404, 'Course not found')
            );
        }

        return res.status(201).json(
            new ApiResponse(201, null, 'Course deleted successfully')
        );

    } catch (error: any) {
        console.error('Error deleting course:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to delete course')
        );
    }
})

/**
 * Get all categories with course counts
 */
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { includeCount } = req.query;

        let categories;

        if (includeCount) {
            categories = await CourseModel.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            categories = categories.map(cat => ({
                name: cat._id,
                count: cat.count
            }));
        } else {
            categories = await CourseModel.distinct('category', { isActive: true });
            categories = categories.map(name => ({ name, count: null }));
        }

        const allCoursesCount = includeCount ?
            await CourseModel.countDocuments({ isActive: true }) : null;

        const responseData = {
            categories: [
                { name: 'All Courses', count: allCoursesCount },
                ...categories
            ]
        };

        return res.status(201).json(
            new ApiResponse(201, responseData, 'Categories fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch categories')
        );
    }
})

/**
 * Get featured courses
 */
export const getFeaturedCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { limit = 8 } = req.query;

        const courses = await CourseModel.find({
            isFeatured: true,
            isActive: true
        })
            .sort({ rating: -1, students: -1 })
            .limit(Number(limit))
            .lean();

        return res.status(201).json(
            new ApiResponse(201, courses, 'Featured courses fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching featured courses:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch featured courses')
        );
    }
});

/**
 * Get courses with highest discounts
 */
export const getDiscountedCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { limit = 8 } = req.query;

        const courses = await CourseModel.aggregate([
            {
                $match: {
                    isActive: true,
                    discountedPrice: { $exists: true, $ne: null },
                    originalPrice: { $gt: 0 }
                }
            },
            {
                $addFields: {
                    discountPercentage: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$originalPrice', '$discountedPrice'] },
                                    '$originalPrice'
                                ]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { discountPercentage: -1, rating: -1 } },
            { $limit: Number(limit) }
        ]);

        return res.status(201).json(
            new ApiResponse(201, courses, 'Discounted courses fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching discounted courses:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch discounted courses')
        );
    }
});

/**
 * Get course statistics
 */
export const getCourseStats = asyncHandler(async (req: Request, res: Response) => {
    try {
        const stats = await CourseModel.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalCourses: { $sum: 1 },
                    totalStudents: { $sum: '$students' },
                    totalRevenue: { $sum: '$originalPrice' },
                    avgRating: { $avg: '$rating' },
                    avgPrice: { $avg: '$originalPrice' },
                    categoriesCount: { $addToSet: '$category' }
                }
            },
            {
                $project: {
                    totalCourses: 1,
                    totalStudents: 1,
                    totalRevenue: 1,
                    avgRating: { $round: ['$avgRating', 2] },
                    avgPrice: { $round: ['$avgPrice', 2] },
                    categoriesCount: { $size: '$categoriesCount' }
                }
            }
        ]);

        const categoryStats = await CourseModel.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    courseCount: { $sum: 1 },
                    avgRating: { $avg: '$rating' },
                    avgPrice: { $avg: '$originalPrice' },
                    totalStudents: { $sum: '$students' }
                }
            },
            { $sort: { courseCount: -1 } }
        ]);

        const responseData = {
            overview: stats[0] || {},
            byCategory: categoryStats
        };

        return res.status(201).json(
            new ApiResponse(201, responseData, 'Course statistics fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching course statistics:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch course statistics')
        );
    }
});


/**
 * Advanced Course Listing API with comprehensive filtering, sorting, and pagination
 */
export const listCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const {
            // Search and basic filters
            search,
            category,
            level,
            instructor,

            // Price filters
            minPrice,
            maxPrice,
            priceRange,
            hasDiscount,
            minDiscountPercentage,
            maxDiscountPercentage,

            // Rating filters
            minRating,
            maxRating,

            // Duration filters
            minDuration,
            maxDuration,
            durationRange,

            // Student count filters
            minStudents,
            maxStudents,

            // Status filters
            isFeatured,
            isActive = 'true',
            badge,

            // Pagination
            page = 1,
            limit = 12,

            // Sorting
            sortBy = 'createdAt',
            sortOrder = 'desc',

            // Advanced filters
            tags,
            createdAfter,
            createdBefore,
            updatedAfter,
            updatedBefore
        } = req.query;

        // ✅ Pagination setup
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit as string) || 12));
        const skip = (pageNum - 1) * limitNum;

        // ✅ Build filter object
        const filter: any = {};

        // Active courses filter
        filter.isActive = isActive === 'true';

        // ✅ Text search across multiple fields
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { instructor: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search as string, 'i')] } }
            ];
        }

        // ✅ Category filter
        if (category && category !== 'All Courses') {
            if (Array.isArray(category)) {
                filter.category = { $in: category };
            } else {
                filter.category = category;
            }
        }

        // ✅ Level filter
        if (level) {
            if (Array.isArray(level)) {
                filter.level = { $in: level };
            } else {
                filter.level = level;
            }
        }

        // ✅ Instructor filter
        if (instructor) {
            filter.instructor = { $regex: instructor, $options: 'i' };
        }

        // ✅ Price filters
        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.originalPrice = {};
            if (minPrice !== undefined) filter.originalPrice.$gte = parseFloat(minPrice as string);
            if (maxPrice !== undefined) filter.originalPrice.$lte = parseFloat(maxPrice as string);
        }

        // ✅ Price range (convenience filter)
        if (priceRange) {
            const ranges: { [key: string]: { min: number; max: number } } = {
                'free': { min: 0, max: 0 },
                'under-1000': { min: 0, max: 1000 },
                '1000-5000': { min: 1000, max: 5000 },
                '5000-10000': { min: 5000, max: 10000 },
                'above-10000': { min: 10000, max: Number.MAX_SAFE_INTEGER }
            };

            const range = ranges[priceRange as string];
            if (range) {
                filter.originalPrice = { $gte: range.min, $lte: range.max };
            }
        }

        // ✅ Discount filters
        if (hasDiscount === 'true') {
            filter.discountedPrice = { $exists: true, $ne: null, $gt: 0 };
            filter.discountPercentage = { $gt: 0 };
        } else if (hasDiscount === 'false') {
            filter.$or = [
                { discountedPrice: { $exists: false } },
                { discountedPrice: null },
                { discountedPrice: 0 }
            ];
        }

        if (minDiscountPercentage !== undefined || maxDiscountPercentage !== undefined) {
            filter.discountPercentage = {};
            if (minDiscountPercentage !== undefined) filter.discountPercentage.$gte = parseFloat(minDiscountPercentage as string);
            if (maxDiscountPercentage !== undefined) filter.discountPercentage.$lte = parseFloat(maxDiscountPercentage as string);
        }

        // ✅ Rating filters
        if (minRating !== undefined || maxRating !== undefined) {
            filter.rating = {};
            if (minRating !== undefined) filter.rating.$gte = parseFloat(minRating as string);
            if (maxRating !== undefined) filter.rating.$lte = parseFloat(maxRating as string);
        }

        // ✅ Duration filters
        if (minDuration !== undefined || maxDuration !== undefined) {
            filter.totalHours = {};
            if (minDuration !== undefined) filter.totalHours.$gte = parseFloat(minDuration as string);
            if (maxDuration !== undefined) filter.totalHours.$lte = parseFloat(maxDuration as string);
        }

        // ✅ Duration range (convenience filter)
        if (durationRange) {
            const ranges: { [key: string]: { min: number; max: number } } = {
                'short': { min: 0, max: 10 },
                'medium': { min: 10, max: 30 },
                'long': { min: 30, max: 100 },
                'extended': { min: 100, max: Number.MAX_SAFE_INTEGER }
            };

            const range = ranges[durationRange as string];
            if (range) {
                filter.totalHours = { $gte: range.min, $lte: range.max };
            }
        }

        // ✅ Student count filters
        if (minStudents !== undefined || maxStudents !== undefined) {
            filter.students = {};
            if (minStudents !== undefined) filter.students.$gte = parseInt(minStudents as string);
            if (maxStudents !== undefined) filter.students.$lte = parseInt(maxStudents as string);
        }

        // ✅ Featured filter
        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }

        // ✅ Badge filter
        if (badge) {
            if (Array.isArray(badge)) {
                filter.badge = { $in: badge };
            } else {
                filter.badge = badge;
            }
        }

        // ✅ Tags filter
        if (tags) {
            const tagsArray = Array.isArray(tags) ? tags : [tags];
            filter.tags = { $in: tagsArray.map(tag => new RegExp(tag as string, 'i')) };
        }

        // ✅ Date filters
        if (createdAfter) {
            filter.createdAt = { ...filter.createdAt, $gte: new Date(createdAfter as string) };
        }
        if (createdBefore) {
            filter.createdAt = { ...filter.createdAt, $lte: new Date(createdBefore as string) };
        }
        if (updatedAfter) {
            filter.updatedAt = { ...filter.updatedAt, $gte: new Date(updatedAfter as string) };
        }
        if (updatedBefore) {
            filter.updatedAt = { ...filter.updatedAt, $lte: new Date(updatedBefore as string) };
        }

        // ✅ Build sort object
        const sort: any = {};

        switch (sortBy) {
            case 'price':
                sort.originalPrice = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'discountedPrice':
                sort.discountedPrice = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'rating':
                sort.rating = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'students':
                sort.students = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'duration':
                sort.totalHours = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'discount':
                sort.discountPercentage = sortOrder === 'desc' ? -1 : 1;
                break;
            case 'popularity':
                sort.students = -1;
                sort.rating = -1;
                break;
            case 'trending':
                // Combine recent creation with high engagement
                sort.createdAt = -1;
                sort.students = -1;
                break;
            default:
                sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
        }

        // Always include createdAt for consistent ordering
        if (!sort.createdAt) {
            sort.createdAt = -1;
        }

        // ✅ Execute queries in parallel for better performance
        const [courses, total, aggregationStats] = await Promise.all([
            // Get paginated courses
            CourseModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),

            // Get total count
            CourseModel.countDocuments(filter),

            // Get aggregation stats for filters
            CourseModel.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: '$originalPrice' },
                        maxPrice: { $max: '$originalPrice' },
                        minRating: { $min: '$rating' },
                        maxRating: { $max: '$rating' },
                        minDuration: { $min: '$totalHours' },
                        maxDuration: { $max: '$totalHours' },
                        minStudents: { $min: '$students' },
                        maxStudents: { $max: '$students' },
                        totalStudents: { $sum: '$students' },
                        avgRating: { $avg: '$rating' },
                        avgPrice: { $avg: '$originalPrice' },
                        categories: { $addToSet: '$category' },
                        levels: { $addToSet: '$level' },
                        badges: { $addToSet: '$badge' }
                    }
                }
            ])
        ]);

        // ✅ Get category counts for filter options
        const categoryCounts = await CourseModel.aggregate([
            { $match: filter },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const levelCounts = await CourseModel.aggregate([
            { $match: filter },
            { $group: { _id: '$level', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // ✅ Calculate pagination info
        const totalPages = Math.ceil(total / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        // ✅ Prepare response data
        const stats = aggregationStats[0] || {};
        const responseData = {
            courses,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: total,
                itemsPerPage: limitNum,
                hasNext,
                hasPrev,
                nextPage: hasNext ? pageNum + 1 : null,
                prevPage: hasPrev ? pageNum - 1 : null,
            },
            filters: {
                available: {
                    categories: categoryCounts.map(cat => ({ name: cat._id, count: cat.count })),
                    levels: levelCounts.map(level => ({ name: level._id, count: level.count })),
                    priceRange: stats.minPrice !== undefined ? {
                        min: stats.minPrice,
                        max: stats.maxPrice
                    } : null,
                    ratingRange: stats.minRating !== undefined ? {
                        min: stats.minRating,
                        max: stats.maxRating
                    } : null,
                    durationRange: stats.minDuration !== undefined ? {
                        min: stats.minDuration,
                        max: stats.maxDuration
                    } : null
                },
                applied: Object.keys(req.query).length > 0 ? req.query : undefined,
                stats: {
                    totalStudents: stats.totalStudents || 0,
                    averageRating: stats.avgRating ? Math.round(stats.avgRating * 100) / 100 : 0,
                    averagePrice: stats.avgPrice ? Math.round(stats.avgPrice * 100) / 100 : 0
                }
            },
            meta: {
                searchQuery: search || null,
                sortBy,
                sortOrder,
                timestamp: new Date().toISOString()
            }
        };

        return res.status(200).json(
            new ApiResponse(200, responseData, 'Courses listed successfully')
        );

    } catch (error: any) {
        console.error('Error listing courses:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to list courses', error.message)
        );
    }
});

/**
 * Quick Search API for autocomplete and quick results
 */
export const quickSearchCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q) {
            return res.status(400).json(
                new ApiError(400, 'Search query is required')
            );
        }

        const courses = await CourseModel.find({
            isActive: true,
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { instructor: { $regex: q, $options: 'i' } },
                { category: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q as string, 'i')] } }
            ]
        })
            .select('title instructor category image rating students originalPrice discountedPrice')
            .sort({ rating: -1, students: -1 })
            .limit(Number(limit))
            .lean();

        return res.status(200).json(
            new ApiResponse(200, courses, 'Quick search completed successfully')
        );

    } catch (error: any) {
        console.error('Error in quick search:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to perform quick search')
        );
    }
});

/**
 * Get similar courses based on various criteria
 */
export const getSimilarCourses = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { courseId, limit = 4 } = req.query;

        if (!courseId) {
            return res.status(400).json(
                new ApiError(400, 'Course ID is required')
            );
        }

        const course = await CourseModel.findById(courseId);
        if (!course) {
            return res.status(404).json(
                new ApiError(404, 'Course not found')
            );
        }

        const similarCourses = await CourseModel.find({
            _id: { $ne: courseId },
            isActive: true,
            $or: [
                { category: course.category },
                { level: course.level },
                { instructor: course.instructor },
                { tags: { $in: course.tags } }
            ]
        })
            .sort({
                // Prioritize by multiple factors
                rating: -1,
                students: -1,
                createdAt: -1
            })
            .limit(Number(limit))
            .lean();

        return res.status(200).json(
            new ApiResponse(200, similarCourses, 'Similar courses fetched successfully')
        );

    } catch (error: any) {
        console.error('Error fetching similar courses:', error);
        return res.status(500).json(
            new ApiError(500, 'Failed to fetch similar courses')
        );
    }
});