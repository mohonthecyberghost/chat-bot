import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="help-container">
      <button 
        className="go-back-button" 
        onClick={() => navigate(-1)}
      >
        ← Go Back
      </button>

      <h1>Card Persue System (CPS) Information</h1>
      
      <section className="help-section">
        <h2>What is CPS?</h2>
        <p>
          Card Persue System (CPS) is a comprehensive platform designed to help users manage and track their card-related activities. 
          It provides tools and resources for efficient card management and monitoring.
        </p>
      </section>

      <section className="help-section">
        <h2>What You Can Get From This Bot</h2>
        <p>
          Our AI-powered chatbot provides comprehensive assistance for all your card-related queries and tasks:
        </p>
        <ul>
          <li><strong>Card Information:</strong> Get detailed information about your cards, including status, limits, and recent transactions</li>
          <li><strong>Transaction Analysis:</strong> Receive insights and analysis of your card transactions and spending patterns</li>
          <li><strong>Security Alerts:</strong> Get notified about suspicious activities and security recommendations</li>
          <li><strong>Document Processing:</strong> Upload and analyze PDF documents related to your cards and transactions</li>
          <li><strong>Image Analysis:</strong> Process and analyze card-related images for verification and documentation</li>
          <li><strong>Real-time Support:</strong> Get immediate answers to your questions about card usage, policies, and procedures</li>
          <li><strong>Streaming Responses:</strong> Choose between instant streaming responses or complete detailed answers</li>
          <li><strong>Detailed Explanations:</strong> Use the "Read More" feature to get comprehensive explanations of any response</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>Key Features</h2>
        <ul>
          <li>Card activity tracking</li>
          <li>Transaction monitoring</li>
          <li>Security alerts</li>
          <li>Payment management</li>
          <li>Card status updates</li>
          <li>Usage analytics</li>
          <li>Account management</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>How to Use CPS</h2>
        <p>
          To get started with CPS, you can:
        </p>
        <ul>
          <li>Register your card in the system</li>
          <li>Set up monitoring preferences</li>
          <li>Configure security settings</li>
          <li>Access your dashboard</li>
        </ul>
      </section>

      <section className="help-section">
        <h2>System Process</h2>
        <ol>
          <li>Card registration and verification</li>
          <li>System initialization and setup</li>
          <li>Monitoring activation</li>
          <li>Regular status updates</li>
          <li>Security checks and alerts</li>
        </ol>
      </section>

      <section className="help-section">
        <h2>Security Features</h2>
        <p>
          CPS implements robust security measures to protect your card information. All data is encrypted, 
          and access is strictly controlled through secure authentication protocols.
        </p>
      </section>

      <section className="help-section">
        <h2>Additional Resources</h2>
        <ul>
          <li><a href="#" target="_blank" rel="noopener noreferrer">User Guide</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Security Best Practices</a></li>
          <li><a href="#" target="_blank" rel="noopener noreferrer">Support Center</a></li>
        </ul>
      </section>
    </div>
  );
};

export default Help; 