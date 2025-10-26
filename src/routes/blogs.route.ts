import { Router } from 'express';
import {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  getBlogStats,
  getBlogsByCategory
} from '../controllers/blogs.controller';
import { upload } from '../middlewares/multer.middleware';
// import { verifyJWT } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get(
  '/',
  getAllBlogs
);

router.get(
  '/categories/:category',
  getBlogsByCategory
);

// Protected routes (Authentication required)
// router.use(verifyJWT);

router.get(
  '/:id',
  getBlogById
);

// Admin only routes

router.post(
  '/',
  // verifyJWT,
  upload.fields([
    {
      name: 'image',
      maxCount: 1,
    },
  ]),
  createBlog
);

router.put(
  '/:id',
  // verifyJWT,
  upload.fields([
    {
      name: 'image',
      maxCount: 1,
    },
  ]),
  updateBlog
);

router.delete(
  '/:id',
  // verifyJWT,
  deleteBlog
);

router.get(
  '/stats/overview',
  // verifyJWT,
  getBlogStats
);

export default router;