import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signInWithCustomToken,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  MultiFactorResolver,
  getMultiFactorResolver
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export interface FreeLecture {
  day: string;
  timings: string;
}

export interface UserData {
  uid: string;
  name: string;
  universityId: string;
  email?: string;
  phoneNumber?: string;
  role: 'faculty' | 'student';
  department?: string;
  specialization?: string;
  section?: string;
  group?: string;
  bio?: string;
  techSkills?: string[];
  block?: string;
  roomNo?: string;
  freeLectures?: FreeLecture[];
  createdAt: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  hasDismissedProfilePrompt: boolean;
  setHasDismissedProfilePrompt: (val: boolean) => void;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<User>;
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (email: string, otp: string, isSignUp?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  completeProfile: (data: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasDismissedProfilePrompt, setHasDismissedProfilePrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[Auth] State changed:', currentUser?.uid);
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          console.log('[Auth] Fetching user data for:', currentUser.uid);
          const res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            console.log('[Auth] User data fetched successfully:', data.uid);
            setUserData(data);
          } else {
            console.log(`[Auth] User data fetch failed with status: ${res.status}`);
            setUserData(null);
          }
        } catch (error) {
          console.error('[Auth] Failed to fetch user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      return userCredential.user;
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const sendEmailOTP = async (email: string) => {
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.details ? `${data.error}: ${data.details}` : data.error || 'Failed to send OTP';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  const verifyEmailOTP = async (email: string, otp: string, isSignUp: boolean = false) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, isSignUp })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to verify OTP');
      }
      const data = await res.json();
      
      // If verification returns a custom token, sign in with it
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUserData = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh user data:', error);
    }
  };

  const completeProfile = async (profileData: Partial<UserData>) => {
    if (!user) throw new Error('No authenticated user');
    
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...profileData,
          name: profileData.name || user.displayName || 'Anonymous',
          email: user.email || profileData.email || '',
          phoneNumber: user.phoneNumber || profileData.phoneNumber || '',
          createdAt: new Date().toISOString()
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to complete profile';
        const errorDetails = errorData.details ? ` (${errorData.details})` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }
    } catch (error) {
      console.error('Profile completion error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      hasDismissedProfilePrompt,
      setHasDismissedProfilePrompt,
      login, 
      loginWithEmail,
      signUpWithEmail,
      sendEmailOTP,
      verifyEmailOTP,
      logout, 
      completeProfile,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
