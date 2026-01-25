import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";

/* ================================
   GOOGLE OAUTH STRATEGY
   (Load only if env vars exist)
================================ */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (_, __, profile, done) => {
        try {
          const email = profile.emails[0].value;

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              email,
              password: "oauth-user",
            });
          }

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

/* ================================
   GITHUB OAUTH STRATEGY
   (Load only if env vars exist)
================================ */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/auth/github/callback",
      },
      async (_, __, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ||
            `${profile.username}@github.com`;

          let user = await User.findOne({ email });
          if (!user) {
            user = await User.create({
              email,
              password: "oauth-user",
            });
          }

          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
}

export default passport;
