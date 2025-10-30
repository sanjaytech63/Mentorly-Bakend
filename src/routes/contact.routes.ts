import express from 'express';
import { createContact, getContactList } from '../controllers/contact.controller';

const router = express.Router();

router.get("/", getContactList);
router.post("/", createContact);


export default router;