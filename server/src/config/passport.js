import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5000/api/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

                if (!email) {
                    return done(new Error("No email found in Google profile"), null);
                }

                let user = await User.findOne({ email });

                if (!user) {
                    user = await User.create({
                        name: profile.displayName,
                        email: email,
                        password: "oauth-user-" + Math.random().toString(36).slice(-8) // Dummy password
                    });
                }
                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: "http://localhost:5000/api/auth/github/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log("GitHub Profile:", profile);
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : (profile.username ? `${profile.username}@github.com` : null);

                if (!email) {
                    console.error("GitHub Error: No email found");
                    return done(new Error("No email found in GitHub profile"), null);
                }

                let user = await User.findOne({ email });

                if (!user) {
                    user = await User.create({
                        name: profile.displayName || profile.username,
                        email: email,
                        password: "oauth-user-" + Math.random().toString(36).slice(-8)
                    });
                }
                return done(null, user);
            } catch (error) {
                console.error("GitHub Auth Error:", error);
                return done(error, null);
            }
        }
    )
);

export default passport;
