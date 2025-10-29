import { Request, Response } from 'express';
import Subscriber from '../models/subscriber.model';
import { exportToCSV } from '../utils/exportUtils';

export const subscribeUser = async (req: Request, res: Response) => {
  try {
    const { email, source = 'website' } = req.body;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'This email is already subscribed to our newsletter',
        });
      } else {
        existingSubscriber.status = 'active';
        existingSubscriber.unsubscribedAt = undefined;
        existingSubscriber.source = source;
        await existingSubscriber.save();

        return res.status(200).json({
          success: true,
          message: 'Successfully resubscribed to our newsletter',
        });
      }
    }

    const newSubscriber = new Subscriber({
      email: email.toLowerCase(),
      source,
      status: 'active',
      subscribedAt: new Date(),
    });

    await newSubscriber.save();

    // Here you can integrate with email service like SendGrid, Mailchimp, etc.
    // await sendWelcomeEmail(email);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to our newsletter!',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
    });
  }
};

export const getSubscribers = async (req: Request, res: Response) => {
  try {
    const { search, status, page = 1, limit = 20, startDate, endDate } = req.query;

    // Build filter query
    const filter: any = {};

    if (search) {
      filter.email = { $regex: search, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.subscribedAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get subscribers with filters
    const subscribers = await Subscriber.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v');

    // Get counts for statistics
    const total = await Subscriber.countDocuments(filter);
    const active = await Subscriber.countDocuments({ ...filter, status: 'active' });
    const inactive = await Subscriber.countDocuments({ ...filter, status: 'inactive' });

    res.json({
      success: true,
      subscribers,
      total,
      active,
      inactive,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscribers',
    });
  }
};

export const unsubscribeUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found',
      });
    }

    if (subscriber.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'Subscriber is already unsubscribed',
      });
    }

    subscriber.status = 'inactive';
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe user',
    });
  }
};

export const exportSubscribers = async (req: Request, res: Response) => {
  try {
    const subscribers = await Subscriber.find()
      .sort({ subscribedAt: -1 })
      .select('email status subscribedAt source');

    const csvData = exportToCSV(subscribers, [
      { key: 'email', header: 'Email' },
      { key: 'status', header: 'Status' },
      { key: 'subscribedAt', header: 'Subscribed Date' },
      { key: 'source', header: 'Source' },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=subscribers-${new Date().toISOString().split('T')[0]}.csv`
    );
    res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subscribers',
    });
  }
};

export const getSubscriptionStats = async (req: Request, res: Response) => {
  try {
    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ status: 'active' });
    const inactive = await Subscriber.countDocuments({ status: 'inactive' });

    // Get subscription growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newSubscribers = await Subscriber.countDocuments({
      subscribedAt: { $gte: thirtyDaysAgo },
    });

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        newSubscribers,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription statistics',
    });
  }
};
