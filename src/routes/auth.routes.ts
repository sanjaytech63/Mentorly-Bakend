import { Router } from 'express';
import {
  changeCurrentPassword,
  createUser,
  deleteUserById,
  getAllUsers,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserById,
} from '../controllers/auth.controller';
import { verifyJWT } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/multer.middleware';

const router = Router();

router.post('/register', upload.single('avatar'), registerUser);
router.post('/login', loginUser);

//secured routes
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/get-current-user').get(verifyJWT, getCurrentUser);
router.route('/get-all-users').get(verifyJWT, getAllUsers);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/update-accound-details').patch(verifyJWT, updateAccountDetails);
router.route('/update-avatar').patch(verifyJWT, upload.single('avatar'), updateUserAvatar);
router.route('/create-user').post(verifyJWT, createUser);
router.route('/users/:userId')
  .patch(verifyJWT, updateUserById)
  .delete(verifyJWT, deleteUserById);

export default router;
