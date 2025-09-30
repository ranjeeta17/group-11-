import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        if (result.user.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate('/employee-dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
                minHeight: "100vh",
                width: "100%",
                backgroundImage: "url('/background.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                fontFamily: "Afacad, sans-serif"
              }}
              className="min-h-screen flex items-center justify-center bg-slate-900">
      <div style={{
            width: "60%",
            height: "35%",
            flexShrink: 0,
            borderRadius: "9px",
            background: "#FFF",
            boxShadow:
              "0 -5px 10px 3px rgba(154, 154, 154, 0.25), 0 5px 10px 3px rgba(154, 154, 154, 0.25), -5px 0 10px 3px rgba(154, 154, 154, 0.25), 5px 0 10px 3px rgba(154, 154, 154, 0.25)"
          }}
          className="grid grid-cols-[55%_45%] overflow-hidden"
        >
        {/* Left */}
        <section className="p-10">
          <h1 style ={{
              color: "#000",
              fontSize: "30px",
              fontStyle: "normal",
              fontWeight: 600,
              lineHeight: "normal"
            }}>Sign in</h1>
          <p style ={{
              color: "#000",
              fontSize: "22px",
              fontStyle: "normal",
              fontWeight: 400,
              lineHeight: "normal",
              paddingBottom: "10px"
            }}>to access Dashboard</p>
        
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <ErrorMessage message={error} />}
            
            <label className="block">
                  <span style={{
                        color: "#000",
                        fontSize: "22px",
                        fontStyle: "normal",
                        fontWeight: 400,
                        lineHeight: "normal"
                      }}>Email Address</span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                style={{
                      width: "100%",
                      height: "50px",
                      flexShrink: 0,
                      borderRadius: "9px",
                      border: "1px solid #2E4A8A",
                      background: "#D9D9D9",
                      paddingLeft: "16px",
                      fontSize: "16px"
                    }}
                />
            </label>
            
            <label className="block">
              <span style={{
                        color: "#000",
                        fontSize: "22px",
                        fontStyle: "normal",
                        fontWeight: 400,
                        lineHeight: "normal"
                      }}>Password</span>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                style={{
                      width: "100%",
                      height: "50px",
                      flexShrink: 0,
                      borderRadius: "9px",
                      border: "1px solid #2E4A8A",
                      background: "#D9D9D9",
                      paddingLeft: "16px",
                      fontSize: "16px"
                    }}
              />
            </label>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                        width: "100%",
                        height: "50px",
                        flexshrink: 0,
                        borderRadius: "9px",
                        background: "#08F",
                        color: "#FFF",
                        fontSize: "24px",
                        fontStyle: "normal",
                        fontWeight: 700,
                        lineHeight: "normal"
                      }}
            >
              {loading ? 'Signing In...' : 'SIGN IN'}
            </button>
            <p style = {{
                  color: "#9A8E8E",
                  fontSize: "20px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "normal"}}>Don’t have an account?{" "}
                  <Link to="/register" style = {{
                                        color: "#08F",
                                        fontSize: "24px",
                                        fontStyle: "normal",
                                        fontWeight: 700,
                                        lineHeight: "normal"}}>Sign up now
                  </Link>
            </p>
          </form>
            {/* Demo accounts */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-s font-medium text-gray-700 mb-2">Demo Accounts:</p>
              <div className="text-s text-gray-600 space-y-1">
                <p><strong>Admin:</strong> admin@company.com / admin123</p>
                <p><strong>Employee:</strong> employee@company.com / emp123</p>
              </div>
            </div>
        </section>

        {/* Right */}
        <aside className="p-10 border-2 border-slate-200 flex flex-col items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/timetrackr11_main.svg" alt="TimeTrackr11" className="h-30" />
          </div>

          <div
            className="w-full h-90% flex-shrink-0 rounded-[10px] border-2 border-black"
            style={{
              aspectRatio: "89 / 70",
              background: "rgba(116, 151, 175, 0.46)"
            }}
          >
            <ul className="grid grid-cols-2 gap-6 h-full items-center justify-items-center">
              <li><img src="/fingerprint.svg" className="h-20 w-20" /></li>
              <li><img src="/clock.svg" className="h-20 w-20" /></li>
              <li><img src="/face.svg" className="h-20 w-20" /></li>
              <li><img src="/trend.svg" className="h-20 w-20" /></li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default LoginPage;