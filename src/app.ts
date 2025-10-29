import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app: Application = express();

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Routes import
import authRoutes from './routes/auth.routes';
import blogRoutes from './routes/blogs.route';
import subscribeRoutes from './routes/subscribe.routes';
import videoRoutes from './routes/course.routes';

// Route declarations
app.use('/api/v1/subscribe', subscribeRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/courses', videoRoutes);

app.get('/', (req, res) => {
  res.send('Server is running... on localhost:8080');
});

export default app;
