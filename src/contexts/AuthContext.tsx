import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthUser, AuthState, LoginCredentials, RegisterData } from '../types/auth';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthUser }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: Partial<AuthUser> }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Helper function to convert database profile to AuthUser
const convertToAuthUser = (user: User, profile: any): AuthUser => {
  return {
    id: user.id,
    email: user.email!,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatar: profile.avatar_url,
    bio: profile.bio,
    dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
    phone: profile.phone,
    location: profile.location,
    joinDate: new Date(profile.created_at),
    lastLogin: new Date(),
    isEmailVerified: user.email_confirmed_at !== null,
    preferences: profile.preferences,
    academicInfo: profile.academic_info,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (user: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Failed to load user profile' });
        return;
      }

      // If no profile exists, create a default one
      if (!profile) {
        const defaultProfile = {
          id: user.id,
          username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          avatar_url: null,
          bio: null,
          date_of_birth: null,
          phone: null,
          location: null,
          academic_info: {
            gpa: null,
            year: null,
            major: null,
            student_id: null,
            enrolled_subjects: []
          },
          preferences: {
            theme: 'light',
            language: 'en',
            notifications: {
              push: true,
              email: true,
              grades: true,
              assignments: true,
              announcements: false
            }
          }
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Failed to create user profile' });
          return;
        }

        const authUser = convertToAuthUser(user, newProfile);
        dispatch({ type: 'LOGIN_SUCCESS', payload: authUser });
      } else {
        const authUser = convertToAuthUser(user, profile);
        dispatch({ type: 'LOGIN_SUCCESS', payload: authUser });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Failed to load user profile' });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user);
      }
    } catch (error: any) {
      let errorMessage = error.message || 'Login failed';
      
      // Provide more user-friendly error messages
      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Please check your email and password, or sign up if you don\'t have an account.';
      } else if (error.message === 'Email not confirmed') {
        errorMessage = 'EMAIL_NOT_CONFIRMED'; // Special flag for the UI to handle
      }
      
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            first_name: data.firstName,
            last_name: data.lastName,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (authData.user) {
        // Profile will be created automatically by the trigger
        // Wait a moment for the trigger to complete
        setTimeout(async () => {
          await loadUserProfile(authData.user!);
        }, 1000);
      }
    } catch (error: any) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message || 'Registration failed' });
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (updates: Partial<AuthUser>): Promise<void> => {
    if (!state.user) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const profileUpdates: any = {};
      
      if (updates.firstName) profileUpdates.first_name = updates.firstName;
      if (updates.lastName) profileUpdates.last_name = updates.lastName;
      if (updates.username) profileUpdates.username = updates.username;
      if (updates.bio !== undefined) profileUpdates.bio = updates.bio;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
      if (updates.location !== undefined) profileUpdates.location = updates.location;
      if (updates.dateOfBirth) profileUpdates.date_of_birth = updates.dateOfBirth.toISOString().split('T')[0];
      if (updates.academicInfo) profileUpdates.academic_info = updates.academicInfo;
      if (updates.preferences) profileUpdates.preferences = updates.preferences;

      const { error } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', state.user.id);

      if (error) {
        throw error;
      }

      dispatch({ type: 'UPDATE_PROFILE', payload: updates });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      throw new Error('Failed to update profile');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateProfile,
        resetPassword,
        resendConfirmationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};