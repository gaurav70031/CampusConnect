import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Filter } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import nodemailer from 'nodemailer';

console.log('Server script starting...');

const app = express();
const PORT = 3000;

console.log('Loading Firebase config...');
let firebaseConfig: any;
try {
  firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
} catch (err) {
  console.log('firebase-applet-config.json not found, trying environment variable...');
  if (process.env.FIREBASE_APPLET_CONFIG) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_APPLET_CONFIG);
  } else {
    console.error('Firebase config not found in file or environment variable!');
    process.exit(1);
  }
}

import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, setDoc as clientSetDoc, getDoc as clientGetDoc, collection as clientCollection, query as clientQuery, where as clientWhere, orderBy as clientOrderBy, getDocs as clientGetDocs, deleteDoc as clientDeleteDoc, updateDoc as clientUpdateDoc, addDoc as clientAddDoc, or as clientOr } from 'firebase/firestore';
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth';

import { writeFileSync } from 'fs';

console.log('Initializing Firebase Admin...');
const adminApp = initializeApp({
  projectId: firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT,
});

// Initialize Client SDK on the server
const clientApp = initializeClientApp({
  ...firebaseConfig,
  projectId: firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT,
});
const clientFirestore = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
const clientAuth = getClientAuth(clientApp);

const auth = getAuth(adminApp);
let db: any;
let useClientSdk = false;
let lastInitError: any = null;

async function initializeDb() {
  console.log('Starting Firestore initialization...');
  const configDbId = firebaseConfig.firestoreDatabaseId;
  const projectId = firebaseConfig.projectId;
  
  console.log(`[Init] Project ID: ${projectId}`);
  console.log(`[Init] Config Database ID: ${configDbId || '(default)'}`);
  console.log(`[Init] NODE_ENV: ${process.env.NODE_ENV}`);

  try {
    console.log(`[Admin] Attempting connection to database: ${configDbId || '(default)'}`);
    const adminDb = getFirestore(adminApp, configDbId || '(default)');
    
    // Test connection with a small write
    console.log('[Admin] Testing write to health/check...');
    await adminDb.collection('health').doc('check').set({ 
      lastCheck: new Date().toISOString(),
      source: 'Admin SDK',
      databaseId: configDbId || '(default)',
      projectId: projectId
    });
    
    db = adminDb;
    useClientSdk = false;
    console.log('[Admin] Successfully connected and wrote to Firestore');
  } catch (err: any) {
    console.error('[Admin] Firestore connection failed:', err.message);
    lastInitError = {
      stage: 'Admin Connect',
      message: err.message,
      code: err.code,
      details: err.details
    };
    if (err.stack) console.error(err.stack);
    
    // Try default database as fallback for Admin SDK
    try {
      console.log('[Admin] Falling back to (default) database...');
      const defaultDb = getFirestore(adminApp);
      await defaultDb.collection('health').doc('check').set({
        lastCheck: new Date().toISOString(),
        source: 'Admin SDK Fallback',
        databaseId: '(default)',
        projectId: projectId
      });
      db = defaultDb;
      useClientSdk = false;
      console.log('[Admin] Successfully connected to (default) database');
    } catch (fallbackErr: any) {
      console.error('[Admin] Fallback failed:', fallbackErr.message);
      lastInitError = {
        ...lastInitError,
        fallbackMessage: fallbackErr.message,
        fallbackCode: fallbackErr.code
      };
      console.log('[Fallback] Switching to Client SDK for Firestore operations');
      useClientSdk = true;
      db = clientFirestore;
      
      // Test Client SDK connection
      try {
        console.log(`[Client] Testing connection to database: ${configDbId || '(default)'}`);
        // Note: Client SDK write will fail here without auth if rules are strict
        // We'll just log that we're switching.
        console.log('[Client] Client SDK will be used for subsequent requests');
      } catch (clientErr: any) {
        console.error('[Client] Client SDK test failed:', clientErr.message);
      }
    }
  }
}

// Run initialization

// Helper to sign in the client SDK on the server
const ensureClientAuth = async (uid: string) => {
  if (!useClientSdk) return;
  if (clientAuth.currentUser?.uid === uid) {
    console.log(`[ClientAuth] Already signed in as ${uid}`);
    return;
  }
  
  console.log(`[ClientAuth] Attempting sign-in for ${uid}...`);
  try {
    const customToken = await auth.createCustomToken(uid);
    console.log('[ClientAuth] Custom token created successfully');
    await signInWithCustomToken(clientAuth, customToken);
    console.log(`[ClientAuth] Successfully signed in as ${uid}`);
  } catch (error: any) {
    console.error('[ClientAuth] Failed to sign in:', error.message);
    if (error.code) console.error('[ClientAuth] Error code:', error.code);
  }
};
console.log('Filter available:', typeof Filter !== 'undefined');

console.log('Firebase Admin initialized successfully.');

app.use(cors());
app.use(express.json());

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s/g, ''),
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[SMTP] Connection error:', error);
  } else {
    console.log('[SMTP] Server is ready to take our messages');
  }
});

// Auth Routes
app.post('/api/auth/otp/send', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore
    if (useClientSdk) {
      await clientSetDoc(clientDoc(clientFirestore, 'otps', email), {
        otp,
        expiresAt: expiresAt.toISOString(),
      });
    } else {
      await db.collection('otps').doc(email).set({
        otp,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Send email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log(`[Auth] Attempting to send OTP to ${email} using ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} from ${process.env.SMTP_FROM}`);
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"CampusConnect" <noreply@example.com>',
        to: email,
        subject: 'Your CampusConnect Verification Code',
        text: `Your verification code is: ${otp}. It expires in 10 minutes.`,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
      });
      console.log(`[Auth] OTP sent to ${email}`);
    } else {
      console.log(`[Auth] [MOCK] OTP for ${email}: ${otp} (SMTP not configured)`);
      console.log(`[Auth] SMTP_USER: ${process.env.SMTP_USER ? 'Set' : 'Not Set'}, SMTP_PASS: ${process.env.SMTP_PASS ? 'Set' : 'Not Set'}`);
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('[Auth] Failed to send OTP:', error);
    res.status(500).json({ 
      error: 'Failed to send OTP', 
      details: error.message,
      code: error.code,
      command: error.command
    });
  }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const { email, otp, isSignUp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    let otpData: any;
    if (useClientSdk) {
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'otps', email));
      otpData = docSnap.exists() ? docSnap.data() : null;
    } else {
      const docSnap = await db.collection('otps').doc(email).get();
      otpData = docSnap.exists ? docSnap.data() : null;
    }

    if (!otpData || otpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // OTP is valid, delete it
    if (useClientSdk) {
      await clientDeleteDoc(clientDoc(clientFirestore, 'otps', email));
    } else {
      await db.collection('otps').doc(email).delete();
    }

    if (isSignUp) {
      return res.json({ success: true });
    }

    // Get or create user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({ email });
      } else {
        throw error;
      }
    }

    // Create custom token
    const customToken = await auth.createCustomToken(userRecord.uid);
    res.json({ customToken });
  } catch (error: any) {
    console.error('[Auth] Failed to verify OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
});

app.post('/api/auth/lookup', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Identifier is required' });

  try {
    let userDoc: any;
    if (useClientSdk) {
      const q = clientQuery(clientCollection(clientFirestore, 'users'), clientWhere('universityId', '==', identifier));
      const querySnapshot = await clientGetDocs(q);
      userDoc = !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
    } else {
      const querySnapshot = await db.collection('users').where('universityId', '==', identifier).limit(1).get();
      userDoc = !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
    }

    if (!userDoc) {
      return res.status(404).json({ error: 'User not found with this ID' });
    }

    res.json({ email: userDoc.email });
  } catch (error: any) {
    console.error('[Auth] Failed to lookup user:', error);
    res.status(500).json({ error: 'Failed to lookup user', details: error.message });
  }
});

// Error handling helper for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null, res: any) {
  const message = error.message || String(error);
  const errInfo = {
    error: message,
    code: error.code,
    operationType,
    path,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  };
  console.error(`Firestore Error [${operationType}] on ${path}:`, JSON.stringify(errInfo));
  return res.status(error.code === 7 ? 403 : 500).json({ 
    error: `Firestore ${operationType} failed: ${message}`, 
    details: message // Just send the message as details for now to avoid [object Object]
  });
}

app.get('/api/debug/firestore', async (req, res) => {
  try {
    const status = {
      useClientSdk,
      lastInitError,
      databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
      projectId: firebaseConfig.projectId,
      adminProjectId: adminApp.options.projectId,
      clientAuthUser: clientAuth.currentUser?.uid || 'none',
      authenticated: !!clientAuth.currentUser,
      env: {
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
        FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ? 'exists' : 'missing',
        PROJECT_ID: process.env.PROJECT_ID
      }
    };
    
    // Test a simple read
    let testResult = 'not-tested';
    try {
      if (useClientSdk) {
        const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'health', 'check'));
        testResult = docSnap.exists() ? 'success-read' : 'not-found';
      } else {
        const docSnap = await db.collection('health').doc('check').get();
        testResult = docSnap.exists ? 'success-read' : 'not-found';
      }
    } catch (e: any) {
      testResult = `error: ${e.message} (code: ${e.code})`;
    }
    
    res.json({ status, testResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Authentication middleware
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing or invalid auth header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    res.status(401).json({ error: 'Unauthorized', details: error instanceof Error ? error.message : String(error) });
  }
};

app.post('/api/auth/cuchd/otp/verify', authenticate, async (req: any, res) => {
  const { email, otp } = req.body;
  const { uid } = req.user;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  try {
    let otpData: any;
    if (useClientSdk) {
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'otps', email));
      otpData = docSnap.exists() ? docSnap.data() : null;
    } else {
      const docSnap = await db.collection('otps').doc(email).get();
      otpData = docSnap.exists ? docSnap.data() : null;
    }

    if (!otpData || otpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // OTP is valid, delete it
    if (useClientSdk) {
      await clientDeleteDoc(clientDoc(clientFirestore, 'otps', email));
      // Update user document
      await clientUpdateDoc(clientDoc(clientFirestore, 'users', uid), {
        cuchdEmail: email,
        cuchdEmailVerified: true
      });
    } else {
      await db.collection('otps').doc(email).delete();
      // Update user document
      await db.collection('users').doc(uid).update({
        cuchdEmail: email,
        cuchdEmailVerified: true
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Auth] Failed to verify CUCHD OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
  }
});

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/debug/firebase', async (req, res) => {
  try {
    const config = {
      projectId: firebaseConfig.projectId,
      databaseId: firebaseConfig.firestoreDatabaseId,
      adminProjectId: adminApp.options.projectId,
      useClientSdk,
    };
    
    let dbStatus = 'unknown';
    let dbError = null;
    let testResult = null;
    
    try {
      const testRef = db.collection('health').doc('check');
      await testRef.set({ debugCheck: new Date().toISOString() });
      const doc = await testRef.get();
      dbStatus = 'connected';
      testResult = doc.data();
    } catch (e: any) {
      dbStatus = 'failed';
      dbError = {
        code: e.code,
        message: e.message,
        details: e.details,
        stack: e.stack
      };
    }
    
    res.json({
      config,
      dbStatus,
      testResult,
      dbError,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.get('/api/users/me', authenticate, async (req: any, res) => {
  try {
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const userDoc = await clientGetDoc(clientDoc(clientFirestore, 'users', req.user.uid));
      if (!userDoc.exists()) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: userDoc.id, _id: userDoc.id, ...userDoc.data() });
    } else {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: userDoc.id, _id: userDoc.id, ...userDoc.data() });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.GET, `users/${req.user.uid}`, res);
  }
});

app.get('/api/users/:uid', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.params;
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const userDoc = await clientGetDoc(clientDoc(clientFirestore, 'users', uid));
      if (!userDoc.exists()) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: userDoc.id, _id: userDoc.id, ...userDoc.data() });
    } else {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
      return res.json({ id: userDoc.id, _id: userDoc.id, ...userDoc.data() });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.GET, `users/${req.params.uid}`, res);
  }
});

app.post('/api/users', authenticate, async (req: any, res) => {
  try {
    if (!req.body.universityId) {
      return res.status(400).json({ error: 'Missing universityId' });
    }

    const userData = {
      ...req.body,
      uid: req.user.uid,
      universityId: req.body.universityId,
      section: req.body.section || '',
      updatedAt: new Date().toISOString(),
    };

    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      await clientSetDoc(clientDoc(clientFirestore, 'users', req.user.uid), {
        ...userData,
        createdAt: req.body.createdAt || new Date().toISOString()
      }, { merge: true });
    } else {
      await db.collection('users').doc(req.user.uid).set(userData, { merge: true });
    }
    
    res.status(201).json(userData);
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.WRITE, `users/${req.user.uid}`, res);
  }
});

// Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const { department } = req.query;
    
    if (useClientSdk) {
      let q = clientCollection(clientFirestore, 'projects');
      let constraints: any[] = [clientOrderBy('createdAt', 'desc')];
      if (department) constraints.push(clientWhere('department', '==', department));
      const snapshot = await clientGetDocs(clientQuery(q, ...constraints));
      return res.json(snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    } else {
      let query: any = db.collection('projects');
      if (department) query = query.where('department', '==', department);
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.LIST, 'projects', res);
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (useClientSdk) {
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'projects', id));
      if (!docSnap.exists()) return res.status(404).json({ error: 'Project not found' });
      return res.json({ id: docSnap.id, _id: docSnap.id, ...docSnap.data() });
    } else {
      const docSnap = await db.collection('projects').doc(id).get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Project not found' });
      return res.json({ id: docSnap.id, _id: docSnap.id, ...docSnap.data() });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.GET, `projects/${req.params.id}`, res);
  }
});

app.patch('/api/projects/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      await clientUpdateDoc(clientDoc(clientFirestore, 'projects', id), updateData);
    } else {
      await db.collection('projects').doc(id).update(updateData);
    }
    res.json({ id, ...updateData });
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.UPDATE, `projects/${req.params.id}`, res);
  }
});

app.post('/api/projects', authenticate, async (req: any, res) => {
  try {
    const projectData = {
      ...req.body,
      facultyId: req.user.uid,
      createdAt: new Date().toISOString(),
    };
    
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const docRef = await clientAddDoc(clientCollection(clientFirestore, 'projects'), projectData);
      res.json({ id: docRef.id, _id: docRef.id, ...projectData });
    } else {
      const docRef = await db.collection('projects').add(projectData);
      res.json({ id: docRef.id, _id: docRef.id, ...projectData });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.CREATE, 'projects', res);
  }
});

// Inquiries API
app.get('/api/inquiries', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.user;
    
    if (useClientSdk) {
      await ensureClientAuth(uid);
      const q = clientQuery(
        clientCollection(clientFirestore, 'inquiries'),
        clientOr(
          clientWhere('studentId', '==', uid),
          clientWhere('facultyId', '==', uid)
        ),
        clientOrderBy('updatedAt', 'desc')
      );
      const snapshot = await clientGetDocs(q);
      return res.json(snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    } else {
      const snapshot = await db.collection('inquiries')
        .where(Filter.or(
          Filter.where('studentId', '==', uid),
          Filter.where('facultyId', '==', uid)
        ))
        .orderBy('updatedAt', 'desc')
        .get();
      return res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.LIST, 'inquiries', res);
  }
});
app.post('/api/inquiries', authenticate, async (req: any, res) => {
  try {
    const inquiryData = {
      ...req.body,
      studentId: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const docRef = await clientAddDoc(clientCollection(clientFirestore, 'inquiries'), inquiryData);
      
      // Create notification for faculty
      await clientAddDoc(clientCollection(clientFirestore, 'notifications'), {
        userId: inquiryData.facultyId,
        title: 'New Enrollment Request',
        message: `${inquiryData.studentName} has requested to enroll in your project: ${inquiryData.projectTitle}`,
        type: 'enrollment_request',
        link: `/inquiries/${docRef.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      res.json({ id: docRef.id, _id: docRef.id, ...inquiryData });
    } else {
      const docRef = await db.collection('inquiries').add(inquiryData);
      
      // Create notification for faculty
      await db.collection('notifications').add({
        userId: inquiryData.facultyId,
        title: 'New Enrollment Request',
        message: `${inquiryData.studentName} has requested to enroll in your project: ${inquiryData.projectTitle}`,
        type: 'enrollment_request',
        link: `/inquiries/${docRef.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      res.json({ id: docRef.id, _id: docRef.id, ...inquiryData });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.CREATE, 'inquiries', res);
  }
});

app.get('/api/inquiries/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    
    let inquiryData: any;
    if (useClientSdk) {
      await ensureClientAuth(uid);
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'inquiries', id));
      inquiryData = docSnap.exists() ? { id: docSnap.id, _id: docSnap.id, ...docSnap.data() } : null;
    } else {
      const docSnap = await db.collection('inquiries').doc(id).get();
      inquiryData = docSnap.exists ? { id: docSnap.id, _id: docSnap.id, ...docSnap.data() } : null;
    }

    if (!inquiryData) return res.status(404).json({ error: 'Inquiry not found' });
    
    // Check ownership
    if (inquiryData.studentId !== uid && inquiryData.facultyId !== uid) {
      return res.status(403).json({ error: 'Unauthorized to view this inquiry' });
    }
    
    return res.json(inquiryData);
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.GET, `inquiries/${req.params.id}`, res);
  }
});

app.patch('/api/inquiries/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    const updateData = { ...req.body, updatedAt: new Date().toISOString() };
    
    let inquiryData: any;
    if (useClientSdk) {
      await ensureClientAuth(uid);
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'inquiries', id));
      inquiryData = docSnap.exists() ? docSnap.data() : null;
    } else {
      const docSnap = await db.collection('inquiries').doc(id).get();
      inquiryData = docSnap.exists ? docSnap.data() : null;
    }

    if (!inquiryData) return res.status(404).json({ error: 'Inquiry not found' });
    
    // Check ownership
    if (inquiryData.studentId !== uid && inquiryData.facultyId !== uid) {
      return res.status(403).json({ error: 'Unauthorized to update this inquiry' });
    }
    
    if (useClientSdk) {
      await clientUpdateDoc(clientDoc(clientFirestore, 'inquiries', id), updateData);

      if (updateData.status) {
        const title = updateData.status === 'accepted' ? 'Enrollment Accepted!' : 'Enrollment Update';
        const message = updateData.status === 'accepted' 
          ? `Congratulations! You have been selected for the project: ${inquiryData.projectTitle}`
          : `Your enrollment request for "${inquiryData.projectTitle}" was not selected at this time.`;

        await clientAddDoc(clientCollection(clientFirestore, 'notifications'), {
          userId: inquiryData.studentId,
          title,
          message,
          type: updateData.status === 'accepted' ? 'enrollment_accepted' : 'enrollment_rejected',
          link: `/inquiries/${id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      await db.collection('inquiries').doc(id).update(updateData);

      if (updateData.status) {
        const title = updateData.status === 'accepted' ? 'Enrollment Accepted!' : 'Enrollment Update';
        const message = updateData.status === 'accepted' 
          ? `Congratulations! You have been selected for the project: ${inquiryData.projectTitle}`
          : `Your enrollment request for "${inquiryData.projectTitle}" was not selected at this time.`;

        await db.collection('notifications').add({
          userId: inquiryData.studentId,
          title,
          message,
          type: updateData.status === 'accepted' ? 'enrollment_accepted' : 'enrollment_rejected',
          link: `/inquiries/${id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json({ id, ...updateData });
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.UPDATE, `inquiries/${req.params.id}`, res);
  }
});

app.delete('/api/inquiries/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;
    console.log(`[Inquiry] Attempting to delete inquiry ${id} by user ${uid}`);

    // Verify ownership or student role
    let inquiryData: any;
    if (useClientSdk) {
      const docSnap = await clientGetDoc(clientDoc(clientFirestore, 'inquiries', id));
      inquiryData = docSnap.exists() ? docSnap.data() : null;
    } else {
      const docSnap = await db.collection('inquiries').doc(id).get();
      inquiryData = docSnap.exists ? docSnap.data() : null;
    }

    if (!inquiryData) {
      console.log(`[Inquiry] Inquiry ${id} not found`);
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    console.log(`[Inquiry] Inquiry data:`, JSON.stringify(inquiryData));
    
    if (inquiryData.studentId !== uid && inquiryData.facultyId !== uid) {
      console.log(`[Inquiry] Unauthorized delete attempt: studentId=${inquiryData.studentId}, facultyId=${inquiryData.facultyId}, uid=${uid}`);
      return res.status(403).json({ error: 'Unauthorized to delete this inquiry' });
    }

    if (useClientSdk) {
      await ensureClientAuth(uid);
      await clientDeleteDoc(clientDoc(clientFirestore, 'inquiries', id));
    } else {
      await db.collection('inquiries').doc(id).delete();
    }
    console.log(`[Inquiry] Inquiry ${id} deleted successfully`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[Inquiry] Failed to delete inquiry ${req.params.id}:`, error);
    return handleFirestoreError(error, OperationType.DELETE, `inquiries/${req.params.id}`, res);
  }
});

// Messages API
app.get('/api/inquiries/:id/messages', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const q = clientQuery(
        clientCollection(clientFirestore, `inquiries/${id}/messages`),
        clientOrderBy('createdAt', 'asc')
      );
      const snapshot = await clientGetDocs(q);
      return res.json(snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    } else {
      const snapshot = await db.collection('inquiries').doc(id).collection('messages')
        .orderBy('createdAt', 'asc')
        .get();
      return res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.LIST, `inquiries/${req.params.id}/messages`, res);
  }
});

app.post('/api/inquiries/:id/messages', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const messageData = {
      ...req.body,
      senderId: req.user.uid,
      senderName: req.user.name || 'Anonymous',
      createdAt: new Date().toISOString(),
    };
    
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      const docRef = await clientAddDoc(clientCollection(clientFirestore, `inquiries/${id}/messages`), messageData);
      // Also update inquiry updatedAt
      await clientUpdateDoc(clientDoc(clientFirestore, 'inquiries', id), { updatedAt: new Date().toISOString() });
      res.json({ id: docRef.id, ...messageData });
    } else {
      const docRef = await db.collection('inquiries').doc(id).collection('messages').add(messageData);
      await db.collection('inquiries').doc(id).update({ updatedAt: new Date().toISOString() });
      res.json({ id: docRef.id, ...messageData });
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.WRITE, `inquiries/${req.params.id}/messages`, res);
  }
});

// Notifications API
app.get('/api/notifications', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.user;
    if (useClientSdk) {
      await ensureClientAuth(uid);
      const q = clientQuery(
        clientCollection(clientFirestore, 'notifications'),
        clientWhere('userId', '==', uid),
        clientOrderBy('createdAt', 'desc')
      );
      const snapshot = await clientGetDocs(q);
      return res.json(snapshot.docs.map(doc => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    } else {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
      return res.json(snapshot.docs.map((doc: any) => ({ id: doc.id, _id: doc.id, ...doc.data() })));
    }
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.LIST, 'notifications', res);
  }
});

app.patch('/api/notifications/:id/read', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    if (useClientSdk) {
      await ensureClientAuth(req.user.uid);
      await clientUpdateDoc(clientDoc(clientFirestore, 'notifications', id), { read: true });
    } else {
      await db.collection('notifications').doc(id).update({ read: true });
    }
    res.json({ success: true });
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.UPDATE, `notifications/${req.params.id}`, res);
  }
});

app.post('/api/notifications/read-all', authenticate, async (req: any, res) => {
  try {
    const { uid } = req.user;
    if (useClientSdk) {
      await ensureClientAuth(uid);
      const q = clientQuery(
        clientCollection(clientFirestore, 'notifications'),
        clientWhere('userId', '==', uid),
        clientWhere('read', '==', false)
      );
      const snapshot = await clientGetDocs(q);
      const promises = snapshot.docs.map(doc => clientUpdateDoc(clientDoc(clientFirestore, 'notifications', doc.id), { read: true }));
      await Promise.all(promises);
    } else {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', uid)
        .where('read', '==', false)
        .get();
      const batch = db.batch();
      snapshot.docs.forEach((doc: any) => batch.update(doc.ref, { read: true }));
      await batch.commit();
    }
    res.json({ success: true });
  } catch (error: any) {
    return handleFirestoreError(error, OperationType.UPDATE, 'notifications/read-all', res);
  }
});

// Vite Middleware
async function setupVite() {
  console.log('Setting up Vite middleware...');
  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: creating Vite server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    console.log('Vite server created, adding middleware...');
    app.use(vite.middlewares);
  } else {
    console.log('Production mode: serving static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler - MUST be last
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

export default app;

// Initialize everything and start server
async function start() {
  try {
    await initializeDb();
    console.log('Firestore initialization completed.');
    await setupVite();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
