import admin from 'firebase-admin';
import { config } from './env.js';

// Check if we have valid Firebase credentials
const hasValidCredentials =
  config.firebase.projectId &&
  config.firebase.privateKey &&
  config.firebase.privateKey !== 'demo-key' &&
  config.firebase.clientEmail &&
  !config.firebase.privateKey.includes('demo');

let firebaseApp;
let auth;
let storage;

if (hasValidCredentials) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        privateKey: config.firebase.privateKey,
        clientEmail: config.firebase.clientEmail,
      }),
      databaseURL: config.firebase.databaseURL,
      storageBucket: config.firebase.storageBucket,
    });

    auth = admin.auth(firebaseApp);
    storage = admin.storage(firebaseApp);
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
    console.warn('Running without Firebase services. Authentication features will be disabled.');
    firebaseApp = null;
    auth = null;
    storage = null;
  }
} else {
  console.warn('Firebase credentials not configured or using demo values.');
  console.warn('Running without Firebase services. Authentication features will be disabled.');
  firebaseApp = null;
  auth = null;
  storage = null;
}

export { auth, storage };
export default admin;
