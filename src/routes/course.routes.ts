// routes/course.routes.ts
import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCategories,
  getFeaturedCourses,
  getDiscountedCourses,
  getCourseStats,
  listCourses, // ✅ New listing endpoint
  quickSearchCourses, // ✅ New quick search
  getSimilarCourses, // ✅ New similar courses
} from '../controllers/course.controller';
import { upload } from '../middlewares/multer.middleware';

const router = Router();

// ✅ FIXED: Specific routes should come before parameterized routes
router
  .route('/listing') // This should come before /:id
  .get(listCourses);

router.route('/search/quick').get(quickSearchCourses);

router.route('/similar').get(getSimilarCourses);

router.route('/categories').get(getCategories);

router.route('/featured').get(getFeaturedCourses);

router.route('/discounted').get(getDiscountedCourses);

router.route('/stats').get(getCourseStats);

// ✅ FIXED: General courses route
router
  .route('/')
  .get(getCourses)
  .post(upload.fields([{ name: 'image', maxCount: 1 }]), createCourse);

// ✅ FIXED: Parameterized routes should come last
router
  .route('/:id')
  .get(getCourseById)
  .put(upload.fields([{ name: 'image', maxCount: 1 }]), updateCourse)
  .delete(deleteCourse);

export default router;
