import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaSun, FaMoon } from 'react-icons/fa';

const Header = ({ toggled, setToggled }) => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const [isDarkMode, setIsDarkMode] = React.useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    const handleStreamToggle = () => {
        setToggled(!toggled);
    };

    const handleThemeToggle = () => {
        setIsDarkMode(!isDarkMode);
        document.querySelector('.chat-app').classList.toggle('night-mode');
    };

    return (
        <div className="chat-header">
            <h1>CPS AI ChatBOT</h1>
            
            <div className="header-controls">
                <div className="toggle-group">
                    {/* Theme Toggle */}
                    <span className='toggle-text'>
                        {isDarkMode ? <FaMoon className="mode-icon" /> : <FaSun className="mode-icon" />}
                        {isDarkMode ? 'Night Mode' : 'Day Mode'}
                    </span>
                    <button 
                        className={`toggle-btn ${isDarkMode ? "toggled": ""}`}
                        onClick={handleThemeToggle}
                    >
                        <div className="toggle-hover">
                            <div className='thumb'></div>
                            {isDarkMode === false ? (
                                <span className="toggle-hover-text">Day Mode</span>
                            ) : (
                                <span className="toggle-hover-text">Night Mode</span>
                            )}
                        </div>
                    </button>
                </div>

                <div className="toggle-group">
                    {/* Stream Toggle */}
                    <span className='toggle-text'>Stream Response</span>
                    <button 
                        className={`toggle-btn ${toggled ? "toggled": ""}`}
                        onClick={handleStreamToggle}
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
                </div>

                <div className="user-info">
                    {username ? (
                        <>
                            <span>🔓 Logged in as <strong>{username}</strong></span>
                            <Link to="/help" className="help-link">Help</Link>
                            <a href="#" onClick={handleLogout}>Logout</a>
                        </>
                    ) : (
                        <span>🔒 Not Logged In</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Header;