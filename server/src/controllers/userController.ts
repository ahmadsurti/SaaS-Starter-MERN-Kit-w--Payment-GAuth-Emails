import type { NextFunction, Request, Response } from 'express';
import stripe from '../config/stripeConfig';
import Subscription from '../models/SubscriptionModel';
import User from '../models/UserModel';
import { deleteImage, uploadImage } from '../services/mediaService';

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { firstName, lastName } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, message: 'User not sent' });
    return;
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(400).json({ success: false, message: 'User does not exist' });
      return;
    }
    user.name = `${firstName} ${lastName}`;
    await user.save();
    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateProfilePhoto = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const file = req.file;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  if (!file) {
    res.status(400).json({ success: false, message: 'Please send an image file' });
    return;
  }

  // Upload new image to Cloudinary first — do not touch the DB until this succeeds
  let uploadResult: { url: string; publicId: string };
  try {
    uploadResult = await uploadImage(file.path);
  } catch (error) {
    // Temp file is already cleaned up inside uploadImage's finally block
    res.status(500).json({ success: false, errors: 'Image upload failed, please try again' });
    return;
  }

  // Fetch user and update DB — if this fails, roll back by deleting the newly uploaded asset
  try {
    const user = await User.findById(userId);
    if (!user) {
      // User not found — delete the just-uploaded asset so it doesn't become orphaned
      await deleteImage(uploadResult.publicId);
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const previousPublicId = user.profilePhotoPublicId;

    user.profilePhoto = uploadResult.url;
    user.profilePhotoPublicId = uploadResult.publicId;
    await user.save();

    // DB save succeeded — now it is safe to delete the previous Cloudinary asset
    if (previousPublicId) {
      await deleteImage(previousPublicId);
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto,
      },
    });
  } catch (error) {
    // DB update failed — delete the newly uploaded asset to avoid orphaned files
    await deleteImage(uploadResult.publicId);
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Clean up profile photo from Cloudinary on account deletion
    if (user.profilePhotoPublicId) {
      await deleteImage(user.profilePhotoPublicId);
    }

    // Cancel active Stripe subscriptions to prevent continued billing post-deletion
    try {
      const activeSubscriptions = await Subscription.find({
        userId,
        status: 'active',
        stripeSubscriptionId: { $ne: null },
      });
      for (const sub of activeSubscriptions) {
        if (sub.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
          } catch (stripeErr) {
            console.error(`[deleteUser] Failed to cancel Stripe subscription ${sub.stripeSubscriptionId}:`, stripeErr);
          }
        }
      }
      await Subscription.deleteMany({ userId });
    } catch (subErr) {
      console.error('[deleteUser] Error cleaning up user subscriptions:', subErr);
    }

    // Terminate session and remove authentication cookie
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error('[deleteUser] Logout error:', logoutErr);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('[deleteUser] Session destruction error:', destroyErr);
        }
        req.user = undefined;
        res.status(200).json({ success: true, message: 'User deleted successfully' });
      });
    });
  } catch (error) {
    next(error);
  }
};
