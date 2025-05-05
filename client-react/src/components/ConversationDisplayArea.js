import React from 'react';
import Markdown from 'react-markdown';
import userIcon from '/user-icon.png';
import chatbotIcon from '/chatbot-icon.png';
import remarkGfm from 'remark-gfm';

const ChatArea = ({ data, streamdiv, answer, loading }) => {
    const getIconForRole = (role) => {
        switch (role) {
            case 'user':
                return '/user-icon.png';
            case 'model':
                return '/chatbot-icon.png';
            case 'bot':
            case 'assistant':
                return chatbotIcon;
            default:
                return chatbotIcon;
        }
    };

    return (
        <div className="chat-area">
            {data?.length === 0 ? (
                <div className="welcome-area">
                    <p className="welcome-1">Hi,</p>
                    <p className="welcome-2">How can I help you today?</p>
                </div>
            ) : null}

            {data.map((element, index) => (
                <div key={index} className={element.role}>
                    <img
                        src={getIconForRole(element.role)}
                        alt={`${element.role} icon`}
                        className="chat-icon"
                    />
                    <div className="message-content">
                        <Markdown remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <React.Fragment {...props} />
                            }}
                        >
                            {
                                typeof element.parts[0] === 'string'
                                    ? element.parts[0]
                                    : element.parts[0]?.text || ''
                            }
                        </Markdown>

                        {element.role === 'user' && element.imageUrl && (
                            <div className="uploaded-image">
                                <img
                                    src={element.imageUrl}
                                    alt="Uploaded"
                                    style={{
                                        maxWidth: '300px',
                                        borderRadius: '8px',
                                        marginTop: '8px'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {streamdiv && (
                <div className="tempResponse">
                    <img src={chatbotIcon} alt="AI icon" className="chat-icon" />
                    <div className="message-content">
                        <Markdown remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <React.Fragment {...props} />
                            }}
                        >
                            {answer}
                        </Markdown>
                    </div>
                </div>
            )}

            {/* ——— Loading Spinner ——— */}
            {loading && (
                <div className="loading-indicator">
                    <img
                        src="/chatbot-thinking.gif"
                        alt="Loading"
                        width={70}
                        className="chat-icon"
                    />
                    <div className="message-content">
                        <div className="spinner"></div>
                        <p style={{ marginLeft: '8px' }}>Thinking...</p>
                    </div>
                </div>
            )}

            <span id="checkpoint"></span>
        </div>
    );
};

export default ChatArea;
