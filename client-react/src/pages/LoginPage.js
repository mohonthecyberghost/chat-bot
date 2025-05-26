import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import Navigation from '../components/Navigation';

function LoginPage() {
  const { setIsAuthenticated } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token); // store JWT token
        localStorage.setItem("username", username);    // <-- add this
        setIsAuthenticated(true);
        navigate('/chat');
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred while logging in.");
    }
  };

  return (
    <>
      <Navigation />
      <div className="auth-form">
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
          /><br /><br />
          <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
          /><br /><br />
          <button type="submit">Login</button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <p>Don't have an account? <a href="/register">Register here</a></p>
      </div>
    </>
  );
}

export default LoginPage;
