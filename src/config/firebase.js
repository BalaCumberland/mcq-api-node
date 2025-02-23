const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Parse the service account JSON stored in the environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  // Initialize Firebase Admin with the credentials and any other config
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;

// Now you can use admin.auth(), admin.firestore(), etc.
