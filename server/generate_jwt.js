import jwt from 'jsonwebtoken';

const secret = 'Fsc67tFP5IgVs3Fs3iuU0CmEMV610lT9RtRdfoCBNsmhwhnyXP4e8cEScuQNtRErsEZvxbQJDA6R/Smdplh9Ig==';
const payload = {
    "iss": "supabase",
    "ref": "rozwhqxbpsxlxbkfzvce",
    "role": "service_role",
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 years
};

const token = jwt.sign(payload, secret);
console.log('Generated Token:', token);
