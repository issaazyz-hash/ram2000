import { mockDb } from './db';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
}

export async function authenticateUser(credentials: LoginCredentials): Promise<User | null> {
  try {
    const user = mockDb.users.find(u => u.username === credentials.username);

    if (!user) {
      return null;
    }

    // Simple password check for demo (in real app, use bcrypt)
    if (user.password !== credentials.password) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function createUser(username: string, password: string, email?: string, role: string = 'user') {
  try {
    const newUser = {
      id: Date.now().toString(),
      username,
      password, // In real app, this would be hashed
      email,
      role
    };

    mockDb.users.push(newUser);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };
  } catch (error) {
    console.error('User creation error:', error);
    throw error;
  }
}

export async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = mockDb.users.find(u => u.username === 'admin');

    if (existingAdmin) {
      return existingAdmin;
    }

    // Create admin user
    const adminUser = await createUser('admin', 'admin123', 'admin@ram.tn', 'admin');
    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}
