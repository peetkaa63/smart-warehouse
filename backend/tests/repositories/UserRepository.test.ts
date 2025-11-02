import { UserRepository } from '../../src/repositories/UserRepository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository = new UserRepository();
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        password_hash: 'hashed',
        created_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser]
      });

      const result = await userRepository.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('should return null when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await userRepository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        created_at: new Date()
      };

      (pool.query as jest.Mock).mockResolvedValue({
        rows: [mockUser]
      });

      const result = await userRepository.findById(1);

      expect(result).toEqual(mockUser);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
        [1]
      );
    });

    it('should return null when user not found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await userRepository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should find users by role', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'admin1@example.com',
          name: 'Admin 1',
          role: 'admin',
          created_at: new Date()
        },
        {
          id: 2,
          email: 'admin2@example.com',
          name: 'Admin 2',
          role: 'admin',
          created_at: new Date()
        }
      ];

      (pool.query as jest.Mock).mockResolvedValue({
        rows: mockUsers
      });

      const result = await userRepository.findByRole('admin');

      expect(result).toEqual(mockUsers);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, email, name, role, created_at FROM users WHERE role = $1',
        ['admin']
      );
    });

    it('should return empty array when no users found', async () => {
      (pool.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await userRepository.findByRole('nonexistent');

      expect(result).toEqual([]);
    });
  });
});

