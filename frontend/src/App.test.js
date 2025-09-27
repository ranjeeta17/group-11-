import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';

// Mock axiosConfig so Jest doesn't try to load axios' ESM build
jest.mock('./axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() } },
  },
}));

test('renders Login page heading', () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
});
