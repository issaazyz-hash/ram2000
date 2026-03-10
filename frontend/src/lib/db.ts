// Note: Prisma Client should only be used on the server side
// For client-side authentication, we'll use a different approach

// Mock database for client-side demo
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In real app, this would be hashed
    email: 'admin@ram.tn',
    role: 'admin'
  }
];

export const mockDb = {
  users: mockUsers
};
