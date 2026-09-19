import User from '../models/UserModel';
import type { UserDocument } from '../types/interfaces';

interface AddGoogleUserParams {
  id: string;
  email: string;
  name: string;
  source: string;
}

export async function getUserByEmail(email: string): Promise<UserDocument | null> {
  return User.findOne({ email });
}

export async function addGoogleUser(params: AddGoogleUserParams): Promise<UserDocument> {
  const user = new User(params);
  return user.save();
}
