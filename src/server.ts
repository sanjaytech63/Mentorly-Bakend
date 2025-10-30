import dotenv from 'dotenv';
import connectDB from './config/db';
import app from './app';

dotenv.config({ path: './.env' });

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.log('ERROR in db conctions FAILD :', err);
  });
