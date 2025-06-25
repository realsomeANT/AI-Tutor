import React, { useState, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Edit3, Save, X, 
  Camera, Upload, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthUser } from '../../types/auth';

interface ProfilePageProps {
  onBack: () => void;
  darkMode: boolean;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onBack, darkMode }) => {
  const { user, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<AuthUser>>(user || {});
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSave = async () => {
    await updateProfile(editedUser);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
    setImageUploadError(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      // Convert image to base64 for demo purposes
      // In a real app, you'd upload to a storage service like Supabase Storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        
        // Update the edited user state
        setEditedUser(prev => ({ ...prev, avatar: imageUrl }));
        
        // If not in editing mode, save immediately
        if (!isEditing) {
          try {
            await updateProfile({ avatar: imageUrl });
          } catch (error) {
            setImageUploadError('Failed to update profile image');
            console.error('Error updating profile image:', error);
          }
        }
        
        setIsUploadingImage(false);
      };
      
      reader.onerror = () => {
        setImageUploadError('Failed to read image file');
        setIsUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setImageUploadError('Failed to upload image');
      setIsUploadingImage(false);
      console.error('Error uploading image:', error);
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar - Profile Card */}
        <div className="lg:col-span-1">
          <div className={`rounded-3xl p-8 shadow-sm border-4 transition-colors duration-300 ${
            darkMode ? 'bg-gray-800 border-blue-600' : 'bg-white border-blue-600'
          }`} style={{ borderColor: '#1d4ed8' }}>
            {/* Profile Picture */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-32 h-32 mx-auto mb-6 relative">
                  {(editedUser.avatar || user.avatar) ? (
                    <img
                      src={editedUser.avatar || user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors duration-300 ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <User className={`w-16 h-16 transition-colors duration-300 ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                  )}
                  
                  {/* Camera Button - Always visible */}
                  <button 
                    onClick={triggerImageUpload}
                    disabled={isUploadingImage}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg border-4 border-white disabled:opacity-50"
                    title="Change profile picture"
                  >
                    {isUploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Image Upload Error */}
              {imageUploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{imageUploadError}</span>
                </div>
              )}

              {/* Name and Info */}
              <div className="space-y-2">
                <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user.firstName} {user.lastName}
                </h2>
                <p className={`text-lg transition-colors duration-300 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>@{user.username}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Profile Information */}
        <div className="lg:col-span-3">
          <div className={`rounded-3xl p-8 shadow-sm border-4 transition-colors duration-300 ${
            darkMode ? 'bg-gray-800 border-blue-600' : 'bg-white border-blue-600'
          }`} style={{ borderColor: '#1d4ed8' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-2xl font-bold transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>Personal Information</h3>
              {isEditing ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCancel}
                    className={`px-4 py-2 rounded-2xl transition-colors flex items-center ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`px-6 py-2 rounded-2xl transition-colors flex items-center ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.firstName || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, firstName: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                      darkMode 
                        ? 'bg-gray-700 border border-gray-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  />
                ) : (
                  <div className={`px-4 py-3 rounded-2xl transition-colors duration-300 ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                  }`}>
                    {user.firstName || ''}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUser.lastName || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, lastName: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                      darkMode 
                        ? 'bg-gray-700 border border-gray-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  />
                ) : (
                  <div className={`px-4 py-3 rounded-2xl transition-colors duration-300 ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                  }`}>
                    {user.lastName || ''}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedUser.email || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    />
                  ) : (
                    <div className={`pl-12 pr-4 py-3 rounded-2xl transition-colors duration-300 ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    }`}>
                      {user.email || ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Phone
                </label>
                <div className="relative">
                  <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedUser.phone || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className={`pl-12 pr-4 py-3 rounded-2xl transition-colors duration-300 ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    }`}>
                      {user.phone || ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Location
                </label>
                <div className="relative">
                  <MapPin className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.location || ''}
                      onChange={(e) => setEditedUser({ ...editedUser, location: e.target.value })}
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                      placeholder="Enter location"
                    />
                  ) : (
                    <div className={`pl-12 pr-4 py-3 rounded-2xl transition-colors duration-300 ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    }`}>
                      {user.location || ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    darkMode ? 'text-gray-400' : 'text-gray-400'
                  }`} />
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedUser.dateOfBirth ? editedUser.dateOfBirth.toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditedUser({ ...editedUser, dateOfBirth: new Date(e.target.value) })}
                      className={`w-full pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                        darkMode 
                          ? 'bg-gray-700 border border-gray-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    />
                  ) : (
                    <div className={`pl-12 pr-4 py-3 rounded-2xl transition-colors duration-300 ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    }`}>
                      {user.dateOfBirth ? user.dateOfBirth.toLocaleDateString() : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-8">
              <label className={`block text-sm font-medium mb-3 transition-colors duration-300 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Bio
              </label>
              {isEditing ? (
                <textarea
                  value={editedUser.bio || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <div className={`px-4 py-4 rounded-2xl min-h-[100px] transition-colors duration-300 ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                }`}>
                  {user.bio || ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};