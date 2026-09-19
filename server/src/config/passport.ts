import { Strategy as LocalStrategy, IStrategyOptions } from 'passport-local';
import User from '../models/UserModel';
import { PassportStatic } from 'passport';
import type { DoneFunction } from '../types/types';
import { UserDocument, GoogleProfile } from '../types/interfaces';
import GoogleStrategy from 'passport-google-oidc';
import { addGoogleUser, getUserByEmail } from '../user/user.service';

export default function (passport: PassportStatic) {
  const options: IStrategyOptions = {
    usernameField: 'email',
    passReqToCallback: false,
  };

  passport.use(
    new GoogleStrategy(
      {
        callbackURL: process.env.CALLBACK_URL as string,
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
      async (issuer: string, profile: GoogleProfile, done: DoneFunction) => {
        if (!profile.emails || profile.emails.length === 0) {
          return done(null, false, { message: 'Google profile missing email' });
        }
        if (!profile.name) {
          return done(null, false, { message: 'Google profile missing name' });
        }

        const email = profile.emails[0].value;
        const name = profile.displayName;
        const source = 'google';

        const currentUser = await getUserByEmail(email);
        if (!currentUser) {
          const newUser = await addGoogleUser({ id: profile.id, email, name, source });
          return done(null, newUser);
        }
        if (currentUser.source !== 'google') {
          return done(null, currentUser); // allow login with account created via local strategy
        }
        // BUG FIX: update lastLogin on every Google sign-in
        currentUser.lastLogin = new Date();
        await currentUser.save();
        return done(null, currentUser);
      },
    ),
  );

  passport.use(
    new LocalStrategy(options, async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password.' });
        }

        if (user.source !== 'local') {
          return done(null, false, { message: `Account was created with ${user.source} login method` });
        }

        const isMatch = await new Promise<boolean>((resolve, reject) => {
          user.comparePassword(password, (err, match) => {
            if (err) return reject(err);
            resolve(!!match);
          });
        });

        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err as any);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as UserDocument)._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = (await User.findById(id).exec()) as UserDocument | null;
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err as any);
    }
  });
}
