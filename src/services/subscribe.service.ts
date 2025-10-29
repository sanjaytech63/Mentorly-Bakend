import subscriberModel from '../models/subscriber.model';
import { ApiError } from '../utils/ApiError';

export class SubscribeService {
  static async createSubscription(email: string) {
    const existing = await subscriberModel.findOne({ email });
    if (existing) throw new ApiError(409, 'Email already subscribed');

    const newSubscriber = await subscriberModel.create({ email });
    return newSubscriber;
  }

  static async getAllSubscribers() {
    return await subscriberModel.find().sort({ createdAt: -1 });
  }

  static async removeSubscriber(email: string) {
    const deleted = await subscriberModel.findOneAndDelete({ email });
    if (!deleted) throw new ApiError(404, 'Subscriber not found');
    return { message: 'Unsubscribed successfully' };
  }
}
