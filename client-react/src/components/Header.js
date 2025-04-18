import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ toggled, setToggled }) => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
        // window.location.reload(); // optional: force refresh
    };

  return (
    <div className="chat-header">
      <h1>KIP Portal AI ChatBOT</h1>
      <span className='toggle-text'>Stream Response</span>
      <button 
        className={`toggle-btn ${toggled ? "toggled": ""}`}
        onClick={() => setToggled(!toggled)}
      >
        <div className="toggle-hover">



          <div className='thumb'></div>
          {toggled === false ? (
            <span className="toggle-hover-text">Streaming response Off</span>
          ) : (
            <span className="toggle-hover-text">Streaming response On</span>
          )}
        </div>
      </button>

        <div >
            {username ? (
                <>
                    <span>🔓 Logged in as <strong>{username} </strong></span>
                    <a href="#" onClick={handleLogout}>Logout</a>
                </>
            ) : (
                <span>🔒 Not Logged In</span>
            )}
        </div>
    </div>
  );
};

export default Header;