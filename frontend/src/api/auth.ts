import { authenticateUser, createAdminUser } from '../lib/auth';

// Mock API function for login
export async function loginAPI(username: string, password: string) {
  try {
    // For now, we'll use a simple check since we don't have a real backend
    // In a real application, this would be a POST request to your backend
    
    // Check if it's admin credentials
    if (username === 'admin' && password === 'admin123') {
      return {
        success: true,
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@ram.tn',
          role: 'admin'
        }
      };
    }

    // Try to authenticate with database
    const user = await authenticateUser({ username, password });
    
    if (user) {
      return {
        success: true,
        user
      };
    }

    return {
      success: false,
      error: 'Invalid credentials'
    };
  } catch (error) {
    console.error('Login API error:', error);
    return {
      success: false,
      error: 'Login failed'
    };
  }
}

// Initialize admin user
export async function initializeAdmin() {
  try {
    await createAdminUser();
  } catch (error) {
    console.error('Failed to initialize admin user:', error);
  }
}
