import admin from 'firebase-admin';
import { config } from './env.js';

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.firebase.projectId,
    privateKey: config.firebase.privateKey,
    clientEmail: config.firebase.clientEmail,
  }),
  databaseURL: config.firebase.databaseURL,
  storageBucket: config.firebase.storageBucket,
});

export const auth = admin.auth(firebaseApp);
export const storage = admin.storage(firebaseApp);
export default admin;
