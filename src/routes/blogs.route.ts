import { Router } from 'express';
import { createBlog, deleteBlog, getAllBlogs, getBlogById } from '../controllers/blogs.controller';
import { upload } from '../middlewares/multer.middleware';
import { verifyJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyJWT, getAllBlogs);
router.get('/:id', verifyJWT, getBlogById);
router.delete('/:id', verifyJWT, deleteBlog);
router.post(
  '/create',
  upload.fields([
    {
      name: 'image',
      maxCount: 1,
    },
  ]),
  createBlog
);

export default router;
