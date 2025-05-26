import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/register", formData);
      navigate("/login");
    } catch (err) {
      setError("Registration failed. Username may already exist.");
    }
  };

  return (
      <div className="auth-form">
        <h2>Register</h2>
        {error && <p style={{color: 'red'}}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input type="text" name="username" placeholder="Username" required onChange={handleChange} />
          <input type="password" name="password" placeholder="Password" required onChange={handleChange} />
          <button type="submit">Register</button>
        </form>
      </div>
  );
}

export default RegisterPage;
